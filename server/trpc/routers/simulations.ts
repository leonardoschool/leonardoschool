// Simulations Router - Manage tests and simulations
import { router, staffProcedure, studentProcedure, protectedProcedure, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createSimulationWithQuestionsSchema,
  createSimulationAutoSchema,
  updateSimulationSchema,
  updateSimulationQuestionsSchema,
  simulationFilterSchema,
  studentSimulationFilterSchema,
  submitSimulationSchema,
  quickQuizConfigSchema,
  bulkAssignmentSchema,
} from '@/lib/validations/simulationValidation';
import type { Prisma, PrismaClient } from '@prisma/client';
import { notifySimulationCreated } from '@/server/services/simulationNotificationService';
import * as notificationService from '@/server/services/notificationService';
import { notifications } from '@/lib/notifications';
import { createLogger } from '@/lib/utils/logger';
import { stripHtml } from '@/lib/utils/sanitizeHtml';
import { secureShuffleArray } from '@/lib/utils';

const log = createLogger('Simulations');

// Type definitions for calendar event creation
interface CalendarEventData {
  title: string;
  description: string | null;
  type: 'SIMULATION';
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  isPublic: boolean;
  createdById: string;
  invitations: Array<{
    userId?: string;
    groupId?: string;
    status: 'PENDING' | 'ACCEPTED';
  }>;
}

interface AssignmentForCalendar {
  id: string;
  studentId: string | null;
  groupId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createCalendarEvent?: boolean;
}

interface SimulationForCalendar {
  title: string;
  type: string;
  isOfficial: boolean;
  durationMinutes: number;
}

/**
 * Build invitations for a calendar event based on assignment type
 */
async function buildInvitationsForAssignment(
  assignment: AssignmentForCalendar,
  simulation: SimulationForCalendar,
  assignerId: string,
  prisma: PrismaClient
): Promise<CalendarEventData['invitations']> {
  const invitations: CalendarEventData['invitations'] = [];

  if (assignment.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: assignment.studentId },
      select: { userId: true },
    });
    if (student?.userId) {
      invitations.push({ userId: student.userId, status: 'PENDING' as const });
    }
  } else if (assignment.groupId) {
    invitations.push({ groupId: assignment.groupId, status: 'PENDING' as const });
  }

  // Add assigner if simulation is official
  if (simulation.isOfficial && invitations.length > 0) {
    invitations.push({ userId: assignerId, status: 'ACCEPTED' as const });
  }

  return invitations;
}

/**
 * Build event description for multi-day events
 */
function buildEventDescription(startDate: Date, endDate: Date, isMultiDay: boolean): string | null {
  if (!isMultiDay) {
    return null;
  }

  const startDateFormatted = startDate.toLocaleDateString('it-IT', { 
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  const endDateFormatted = endDate.toLocaleDateString('it-IT', { 
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  return `Disponibile dal ${startDateFormatted} al ${endDateFormatted}`;
}

/**
 * Process a single assignment and return the event data if applicable
 */
async function processAssignmentForCalendar(
  assignment: AssignmentForCalendar,
  simulation: SimulationForCalendar,
  simulationId: string,
  assignerId: string,
  processedKeys: Set<string>,
  prisma: PrismaClient
): Promise<CalendarEventData | null> {
  // Calculate dates
  const startDate = assignment.startDate ?? new Date();
  const endDate = assignment.endDate ?? new Date(startDate.getTime() + simulation.durationMinutes * 60 * 1000);
  
  // Build unique key to avoid duplicates
  const eventKey = `${simulationId}-${startDate.getTime()}-${assignment.studentId ?? assignment.groupId}`;
  if (processedKeys.has(eventKey)) {
    return null;
  }
  processedKeys.add(eventKey);

  // Check if multi-day event
  const startDay = new Date(startDate).setHours(0, 0, 0, 0);
  const endDay = new Date(endDate).setHours(0, 0, 0, 0);
  const isMultiDay = startDay !== endDay;

  // Build invitations
  const invitations = await buildInvitationsForAssignment(assignment, simulation, assignerId, prisma);
  
  if (invitations.length === 0) {
    return null;
  }

  return {
    title: `${simulation.type === 'OFFICIAL' ? 'TOLC' : 'Simulazione'}: ${simulation.title}`,
    description: buildEventDescription(startDate, endDate, isMultiDay),
    type: 'SIMULATION',
    startDate,
    endDate,
    isAllDay: isMultiDay,
    isPublic: false,
    createdById: assignerId,
    invitations,
  };
}

/**
 * Create calendar events for simulation assignments
 */
async function createCalendarEventsForAssignments(
  simulationId: string,
  simulation: SimulationForCalendar,
  assignments: AssignmentForCalendar[],
  assignerId: string,
  prisma: PrismaClient
) {
  const processedKeys = new Set<string>();
  const eventsToCreate: CalendarEventData[] = [];

  for (const assignment of assignments) {
    const eventData = await processAssignmentForCalendar(
      assignment,
      simulation,
      simulationId,
      assignerId,
      processedKeys,
      prisma
    );
    if (eventData) {
      eventsToCreate.push(eventData);
    }
  }

  // Batch create all events
  if (eventsToCreate.length > 0) {
    await Promise.all(
      eventsToCreate.map(eventData =>
        prisma.calendarEvent.create({
          data: {
            ...eventData,
            invitations: {
              create: eventData.invitations,
            },
          },
        })
      )
    );
    log.info(`Created ${eventsToCreate.length} calendar events for simulation assignments`);
  }
}

// Helper function to delete calendar events when removing assignment
async function deleteCalendarEventsForAssignment(
  simulationId: string,
  userIds: string[],
  prisma: PrismaClient,
  groupId?: string | null
) {
  // Get simulation details to match event title
  const simulation = await prisma.simulation.findUnique({
    where: { id: simulationId },
    select: { title: true, type: true },
  });

  if (!simulation) {
    console.warn(`[Simulations] Simulation ${simulationId} not found for calendar event deletion`);
    return;
  }

  const eventTitlePrefix = `${simulation.type === 'OFFICIAL' ? 'TOLC' : 'Simulazione'}: ${simulation.title}`;

  // Build the query to find events
  // Look for events with matching title and either:
  // 1. Invitations to specific users (for individual assignments)
  // 2. Invitations to a specific group (for group assignments)
  let invitationFilter: { some: { userId?: { in: string[] }; groupId?: string } } | undefined;

  if (groupId) {
    invitationFilter = { some: { groupId } };
  } else if (userIds.length > 0) {
    invitationFilter = { some: { userId: { in: userIds } } };
  }

  // Find calendar events with matching title (and optionally invitees)
  const events = await prisma.calendarEvent.findMany({
    where: {
      type: 'SIMULATION',
      title: eventTitlePrefix, // Exact match, not startsWith
      ...(invitationFilter ? { invitations: invitationFilter } : {}),
    },
    select: { id: true },
  });

  log.debug(`Found ${events.length} calendar events matching title "${eventTitlePrefix}" for deletion`);

  if (events.length > 0) {
    const eventIds = events.map(e => e.id);
    
    // First delete invitations (foreign key)
    await prisma.eventInvitation.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    
    // Then delete events
    await prisma.calendarEvent.deleteMany({
      where: { id: { in: eventIds } },
    });
    
    log.info(`Deleted ${events.length} calendar events for removed assignment`);
  }
}

// Helper function to get student from user
async function getStudentFromUser(prisma: PrismaClient, userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
  if (!student) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Profilo studente non trovato',
    });
  }
  return student;
}

/**
 * Validate collaborator can assign to specified groups/students
 */
async function validateCollaboratorAssignments(
  prisma: PrismaClient,
  collaboratorId: string,
  assignments: Array<{ studentId?: string | null; groupId?: string | null }>
): Promise<void> {
  if (assignments.length === 0) return;

  // Get groups managed by this collaborator
  const collaboratorGroups = await prisma.group.findMany({
    where: { referenceCollaboratorId: collaboratorId },
    select: { id: true },
  });
  const allowedGroupIds = new Set(collaboratorGroups.map(g => g.id));

  // Get students in those groups
  const studentsInGroups = await prisma.groupMember.findMany({
    where: { groupId: { in: Array.from(allowedGroupIds) } },
    select: { studentId: true },
  });
  const allowedStudentIds = new Set(studentsInGroups.map(m => m.studentId));

  // Validate each assignment
  for (const target of assignments) {
    if (target.groupId && !allowedGroupIds.has(target.groupId)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Non puoi assegnare a gruppi che non gestisci',
      });
    }
    if (target.studentId && !allowedStudentIds.has(target.studentId)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Non puoi assegnare a studenti che non sono nei tuoi gruppi',
      });
    }
  }
}

/**
 * Validate that all questions exist
 */
async function validateQuestionsExist(
  prisma: PrismaClient,
  questionIds: string[]
): Promise<Array<{
  id: string;
  status: string;
  subjectId: string | null;
  subject: { name: string } | null;
}>> {
  const existingQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { 
      id: true, 
      status: true,
      subjectId: true,
      subject: { select: { name: true } },
    },
  });

  if (existingQuestions.length !== questionIds.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Una o più domande non esistono',
    });
  }

  const unpublishedQuestions = existingQuestions.filter(q => q.status !== 'PUBLISHED');
  if (unpublishedQuestions.length > 0) {
    console.warn('Creating simulation with unpublished questions');
  }

  return existingQuestions;
}

/**
 * Auto-generate sections based on question subjects
 */
function generateSectionsFromQuestions(
  existingQuestions: Array<{
    id: string;
    subjectId: string | null;
    subject: { name: string } | null;
  }>,
  durationMinutes: number
): Array<{
  id: string;
  name: string;
  durationMinutes: number;
  questionIds: string[];
  questionCount: number;
  subjectId: string | null;
  order: number;
}> {
  // Group questions by subject
  const questionsBySubject = new Map<string, typeof existingQuestions>();
  for (const q of existingQuestions) {
    const subjectId = q.subjectId ?? 'GENERAL';
    if (!questionsBySubject.has(subjectId)) {
      questionsBySubject.set(subjectId, []);
    }
    questionsBySubject.get(subjectId)?.push(q);
  }

  // Create a section for each subject
  const numSections = questionsBySubject.size;
  const durationPerSection = numSections > 0 ? Math.floor(durationMinutes / numSections) : 0;

  const generatedSections = [];
  let order = 0;
  for (const [subjectId, subjectQuestions] of questionsBySubject.entries()) {
    const subjectName = subjectQuestions[0]?.subject?.name ?? 'Sezione Generale';
    generatedSections.push({
      id: `section-${order}`,
      name: subjectName,
      durationMinutes: durationPerSection,
      questionIds: subjectQuestions.map(q => q.id),
      questionCount: subjectQuestions.length,
      subjectId: subjectId === 'GENERAL' ? null : subjectId,
      order,
    });
    order++;
  }

  return generatedSections;
}

/**
 * Select questions automatically based on subject and difficulty distribution
 */
async function selectQuestionsAutomatically(
  prisma: PrismaClient,
  subjectDistribution: Record<string, number>,
  difficultyDistribution: { EASY?: number; MEDIUM?: number; HARD?: number } | null | undefined,
  topicIds: string[] | null | undefined
): Promise<Array<{ id: string; order: number }>> {
  const selectedQuestions: { id: string; order: number }[] = [];
  let currentOrder = 0;

  for (const [subjectId, count] of Object.entries(subjectDistribution)) {
    if (count <= 0) continue;

    const where: Prisma.QuestionWhereInput = {
      subjectId,
      status: 'PUBLISHED',
    };

    if (topicIds && topicIds.length > 0) {
      where.topicId = { in: topicIds };
    }

    // Get questions for this subject
    const questions = await prisma.question.findMany({
      where,
      select: { id: true, difficulty: true },
      take: count * 3,
    });

    if (questions.length < count) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Non ci sono abbastanza domande per la materia selezionata (disponibili: ${questions.length}, richieste: ${count})`,
      });
    }

    // Apply difficulty filter if specified
    const filteredQuestions = difficultyDistribution
      ? filterByDifficulty(questions, difficultyDistribution, count)
      : questions;

    // Shuffle and select
    const shuffled = secureShuffleArray(filteredQuestions);
    const selected = shuffled.slice(0, count);

    for (const q of selected) {
      selectedQuestions.push({ id: q.id, order: currentOrder++ });
    }
  }

  return selectedQuestions;
}

/**
 * Filter questions by difficulty distribution
 */
function filterByDifficulty(
  questions: Array<{ id: string; difficulty: string | null }>,
  distribution: { EASY?: number; MEDIUM?: number; HARD?: number },
  count: number
): Array<{ id: string; difficulty: string | null }> {
  const EASY = distribution.EASY ?? 0;
  const MEDIUM = distribution.MEDIUM ?? 0;
  const HARD = distribution.HARD ?? 0;
  const total = EASY + MEDIUM + HARD;
  
  if (total === 0) {
    return questions;
  }

  const easyCount = Math.round((EASY / total) * count);
  const mediumCount = Math.round((MEDIUM / total) * count);
  const hardCount = count - easyCount - mediumCount;

  const easyQs = questions.filter(q => q.difficulty === 'EASY').slice(0, easyCount);
  const mediumQs = questions.filter(q => q.difficulty === 'MEDIUM').slice(0, mediumCount);
  const hardQs = questions.filter(q => q.difficulty === 'HARD').slice(0, hardCount);

  return [...easyQs, ...mediumQs, ...hardQs];
}

/**
 * Check if an existing assignment is a single-date assignment that overlaps with target dates
 */
function checkSingleAssignmentOverlap(
  existing: { startDate: Date | null; endDate: Date | null; simulation: { title: string } | null },
  targetStartDate: Date,
  targetEndDate: Date
): { hasOverlap: boolean; title: string; startDate: Date; endDate: Date } | null {
  if (!existing.startDate || !existing.endDate) return null;
  
  const existingDiffInHours = 
    (existing.endDate.getTime() - existing.startDate.getTime()) / (1000 * 60 * 60);
  
  // Skip range assignments
  if (existingDiffInHours > 24) return null;
  
  const hasOverlap = 
    targetStartDate.getTime() < existing.endDate.getTime() &&
    existing.startDate.getTime() < targetEndDate.getTime();
  
  if (!hasOverlap) return null;
  
  return {
    hasOverlap: true,
    title: existing.simulation?.title ?? 'Simulazione',
    startDate: existing.startDate,
    endDate: existing.endDate,
  };
}

/**
 * Check for overlapping single-date assignments
 */
async function checkOverlappingAssignments(
  prisma: PrismaClient,
  target: {
    studentId?: string | null;
    groupId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }
): Promise<void> {
  const startDate = target.startDate ? new Date(target.startDate) : null;
  const endDate = target.endDate ? new Date(target.endDate) : null;
  
  if (!startDate || !endDate) return;

  const diffInHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  if (diffInHours > 24) return; // Skip range assignments

  const existingAssignments = await prisma.simulationAssignment.findMany({
    where: {
      ...(target.studentId ? { studentId: target.studentId } : {}),
      ...(target.groupId ? { groupId: target.groupId } : {}),
      status: { in: ['ACTIVE', 'CLOSED'] },
      startDate: { not: null },
      endDate: { not: null },
    },
    include: {
      simulation: { select: { title: true } },
    },
  });
  
  for (const existing of existingAssignments) {
    const overlap = checkSingleAssignmentOverlap(existing, startDate, endDate);
    if (overlap) {
      const targetType = target.groupId ? 'gruppo' : 'studente';
      const existingStart = overlap.startDate.toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      const existingEnd = overlap.endDate.toLocaleString('it-IT', {
        hour: '2-digit', minute: '2-digit',
      });
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Il ${targetType} ha già un'assegnazione di "${overlap.title}" programmata per ${existingStart} - ${existingEnd}. Non è possibile sovrapporre le simulazioni.`,
      });
    }
  }
}

// Types for paper-based answer evaluation
interface SimulationQuestionForEval {
  questionId: string;
  customPoints: number | null;
  customNegativePoints: number | null;
  question: {
    points: number;
    negativePoints: number;
    answers: Array<{ id: string; isCorrect: boolean }>;
  };
}

interface EvaluatedAnswer {
  questionId: string;
  answerId: string | null;
  isCorrect: boolean;
  earnedPoints: number;
  timeSpent: number;
}

interface EvaluationResult {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalScore: number;
  evaluatedAnswers: EvaluatedAnswer[];
}

/**
 * Evaluate paper-based simulation answers
 */
function evaluatePaperBasedAnswers(
  simulationQuestions: SimulationQuestionForEval[],
  answers: Array<{ questionId: string; answerId?: string | null }>,
  simulation: { useQuestionPoints: boolean; correctPoints: number; wrongPoints: number; blankPoints: number }
): EvaluationResult {
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  let totalScore = 0;
  const evaluatedAnswers: EvaluatedAnswer[] = [];

  for (const sq of simulationQuestions) {
    const studentAnswer = answers.find(a => a.questionId === sq.questionId);
    const correctAnswer = sq.question.answers.find(a => a.isCorrect);

    const points = sq.customPoints ?? (simulation.useQuestionPoints ? sq.question.points : simulation.correctPoints);
    const negativePoints = sq.customNegativePoints ?? (simulation.useQuestionPoints ? sq.question.negativePoints : simulation.wrongPoints);

    let isCorrect = false;
    let earnedPoints = 0;

    if (!studentAnswer?.answerId) {
      blankCount++;
      earnedPoints = simulation.blankPoints;
    } else if (studentAnswer.answerId === correctAnswer?.id) {
      isCorrect = true;
      correctCount++;
      earnedPoints = points;
    } else {
      wrongCount++;
      earnedPoints = negativePoints;
    }

    totalScore += earnedPoints;
    evaluatedAnswers.push({
      questionId: sq.questionId,
      answerId: studentAnswer?.answerId ?? null,
      isCorrect,
      earnedPoints,
      timeSpent: 0,
    });
  }

  return { correctCount, wrongCount, blankCount, totalScore, evaluatedAnswers };
}

/**
 * Calculate delta counts for self-correction
 */
function calculateSelfCorrectionDeltas(
  isCorrect: boolean,
  previousState: boolean | null
): { correctDelta: number; wrongDelta: number; pendingDelta: number } {
  const wasCorrect = previousState === true;
  const wasWrong = previousState === false;
  const wasPending = previousState === null;

  if (isCorrect) {
    return {
      correctDelta: wasCorrect ? 0 : 1,
      wrongDelta: wasWrong ? -1 : 0,
      pendingDelta: wasPending ? -1 : 0,
    };
  } else {
    return {
      correctDelta: wasCorrect ? -1 : 0,
      wrongDelta: wasWrong ? 0 : 1,
      pendingDelta: wasPending ? -1 : 0,
    };
  }
}

/**
 * Check if student has access to simulation based on date constraints
 */
function checkSimulationDateAccess(
  effectiveStartDate: Date | null,
  effectiveEndDate: Date | null,
  now: Date,
  isAssignmentActive: boolean,
  hasActiveVirtualRoom: boolean
): { allowed: boolean; errorMessage?: string } {
  // Block before start date UNLESS Virtual Room is active
  if (effectiveStartDate && effectiveStartDate > now && !hasActiveVirtualRoom) {
    return { allowed: false, errorMessage: 'La simulazione non è ancora iniziata' };
  }

  // For non-official simulations, strictly enforce end date
  // For official simulations with ACTIVE status, allow access (admin control)
  if (effectiveEndDate && effectiveEndDate < now && !isAssignmentActive) {
    return { allowed: false, errorMessage: 'La simulazione è scaduta' };
  }

  return { allowed: true };
}

/**
 * Check simulation attempt limits
 */
function checkAttemptLimits(
  completedAttempts: number,
  hasInProgress: boolean,
  isRepeatable: boolean,
  maxAttempts: number | null
): { allowed: boolean; errorMessage?: string } {
  if (!isRepeatable && completedAttempts > 0 && !hasInProgress) {
    return { allowed: false, errorMessage: 'Hai già completato questa simulazione' };
  }

  if (maxAttempts && completedAttempts >= maxAttempts && !hasInProgress) {
    return { 
      allowed: false, 
      errorMessage: `Hai raggiunto il numero massimo di tentativi (${maxAttempts})` 
    };
  }

  return { allowed: true };
}

/**
 * Check if student has access to simulation
 */
function hasSimulationAccess(
  simulation: { isPublic: boolean; type: string; createdById: string; assignments: unknown[] },
  userId: string
): boolean {
  const isOwnSelfPractice = simulation.type === 'QUICK_QUIZ' && simulation.createdById === userId;
  return simulation.isPublic || simulation.assignments.length > 0 || isOwnSelfPractice;
}

// Types for saved answer parsing
interface SavedAnswerItem {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  timeSpent: number;
  flagged: boolean;
}

interface ParsedSavedProgress {
  savedAnswers: SavedAnswerItem[];
  savedSectionTimes: Record<number, number>;
  savedCurrentSectionIndex: number;
}

/**
 * Parse saved answers from simulation result - handles both old and new format
 */
function parseSavedProgress(savedData: unknown): ParsedSavedProgress {
  let savedAnswers: SavedAnswerItem[] = [];
  let savedSectionTimes: Record<number, number> = {};
  let savedCurrentSectionIndex = 0;

  if (Array.isArray(savedData)) {
    // Old format: just an array of answers
    savedAnswers = savedData as SavedAnswerItem[];
  } else if (savedData && typeof savedData === 'object' && 'items' in savedData) {
    // New format: object with items, sectionTimes, currentSectionIndex
    const meta = savedData as {
      items: SavedAnswerItem[];
      sectionTimes?: Record<string, number>;
      currentSectionIndex?: number;
    };
    savedAnswers = meta.items || [];
    // Convert string keys to number keys for sectionTimes
    if (meta.sectionTimes) {
      savedSectionTimes = Object.fromEntries(
        Object.entries(meta.sectionTimes).map(([k, v]) => [Number(k), v])
      );
    }
    savedCurrentSectionIndex = meta.currentSectionIndex ?? 0;
  }

  return { savedAnswers, savedSectionTimes, savedCurrentSectionIndex };
}

/**
 * Check if an in-progress attempt should be invalidated due to new session
 */
async function shouldInvalidateOldAttempt(
  prisma: PrismaClient,
  inProgressAttempt: { id: string; startedAt: Date | null },
  assignmentId: string,
  studentId: string
): Promise<{ shouldDelete: boolean; currentSessionId?: string; currentSessionCreatedAt?: Date }> {
  const currentSession = await prisma.simulationSession.findFirst({
    where: {
      assignmentId: assignmentId,
      status: { in: ['WAITING', 'STARTED'] },
      participants: { some: { studentId } },
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  if (currentSession && inProgressAttempt.startedAt && inProgressAttempt.startedAt < currentSession.createdAt) {
    return { 
      shouldDelete: true, 
      currentSessionId: currentSession.id, 
      currentSessionCreatedAt: currentSession.createdAt 
    };
  }

  return { shouldDelete: false };
}

// Types for submission scoring
interface StudentAnswerInput {
  questionId: string;
  answerId?: string | null;
  answerText?: string | null;
  timeSpent?: number;
}

interface SimulationQuestionWithDetails {
  questionId: string;
  customPoints: number | null;
  customNegativePoints: number | null;
  question: {
    type: string;
    points: number;
    negativePoints: number;
    subject: { name: string } | null;
    answers: Array<{ id: string; isCorrect: boolean }>;
    keywords: Array<{ keyword: string; weight: number; isRequired: boolean }>;
  };
}

interface ScoringConfig {
  useQuestionPoints: boolean;
  correctPoints: number;
  wrongPoints: number;
  blankPoints: number;
}

interface EvaluatedAnswerResult {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  isCorrect: boolean | null;
  earnedPoints: number;
  timeSpent: number;
}

interface ScoringResult {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalScore: number;
  subjectScores: Record<string, { correct: number; wrong: number; blank: number }>;
  evaluatedAnswers: EvaluatedAnswerResult[];
}

/**
 * Evaluate a single submission answer and return scoring data
 */
function evaluateSingleSubmissionAnswer(
  sq: SimulationQuestionWithDetails,
  studentAnswer: StudentAnswerInput | undefined,
  config: ScoringConfig
): { isCorrect: boolean | null; earnedPoints: number; category: 'correct' | 'wrong' | 'blank' | 'pending' } {
  const correctAnswer = sq.question.answers.find(a => a.isCorrect);
  const points = sq.customPoints ?? (config.useQuestionPoints ? sq.question.points : config.correctPoints);
  const negativePoints = sq.customNegativePoints ?? (config.useQuestionPoints ? sq.question.negativePoints : config.wrongPoints);

  // Handle OPEN_TEXT questions
  if (sq.question.type === 'OPEN_TEXT') {
    if (studentAnswer?.answerText && studentAnswer.answerText.trim().length > 0) {
      return { isCorrect: null, earnedPoints: 0, category: 'pending' };
    } else {
      return { isCorrect: null, earnedPoints: config.blankPoints, category: 'blank' };
    }
  }

  // Handle choice questions
  if (!studentAnswer?.answerId) {
    return { isCorrect: false, earnedPoints: config.blankPoints, category: 'blank' };
  }
  
  if (studentAnswer.answerId === correctAnswer?.id) {
    return { isCorrect: true, earnedPoints: points, category: 'correct' };
  }
  
  return { isCorrect: false, earnedPoints: negativePoints, category: 'wrong' };
}

/**
 * Calculate full submission scores for all questions
 */
function calculateSubmissionScores(
  questions: SimulationQuestionWithDetails[],
  answers: StudentAnswerInput[],
  config: ScoringConfig
): ScoringResult {
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  let totalScore = 0;
  const subjectScores: Record<string, { correct: number; wrong: number; blank: number }> = {};
  const evaluatedAnswers: EvaluatedAnswerResult[] = [];

  for (const sq of questions) {
    const studentAnswer = answers.find(a => a.questionId === sq.questionId);
    const subject = sq.question.subject?.name;

    // Initialize subject stats
    if (subject && !subjectScores[subject]) {
      subjectScores[subject] = { correct: 0, wrong: 0, blank: 0 };
    }

    const evaluation = evaluateSingleSubmissionAnswer(sq, studentAnswer, config);
    
    // Update counts based on category using switch for clarity
    switch (evaluation.category) {
      case 'correct':
        correctCount++;
        if (subject) subjectScores[subject].correct++;
        break;
      case 'wrong':
        wrongCount++;
        if (subject) subjectScores[subject].wrong++;
        break;
      case 'blank':
        blankCount++;
        if (subject) subjectScores[subject].blank++;
        break;
    }

    totalScore += evaluation.earnedPoints;
    evaluatedAnswers.push({
      questionId: sq.questionId,
      answerId: studentAnswer?.answerId ?? null,
      answerText: studentAnswer?.answerText ?? null,
      isCorrect: evaluation.isCorrect,
      earnedPoints: evaluation.earnedPoints,
      timeSpent: studentAnswer?.timeSpent ?? 0,
    });
  }

  return { correctCount, wrongCount, blankCount, totalScore, subjectScores, evaluatedAnswers };
}

/**
 * Auto-score an open text answer against keywords
 */
function autoScoreOpenAnswer(
  answerText: string,
  keywords: Array<{ keyword: string; weight: number; isRequired: boolean }>
): { autoScore: number | null; keywordsMatched: string[]; keywordsMissed: string[] } {
  if (keywords.length === 0) {
    return { autoScore: null, keywordsMatched: [], keywordsMissed: [] };
  }

  const answerLower = answerText.toLowerCase();
  const keywordsMatched: string[] = [];
  const keywordsMissed: string[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const kw of keywords) {
    totalWeight += kw.weight;
    if (answerLower.includes(kw.keyword.toLowerCase())) {
      keywordsMatched.push(kw.keyword);
      matchedWeight += kw.weight;
    } else if (kw.isRequired) {
      keywordsMissed.push(kw.keyword);
    }
  }

  return {
    autoScore: totalWeight > 0 ? matchedWeight / totalWeight : null,
    keywordsMatched,
    keywordsMissed,
  };
}

/**
 * Build open answer submissions for staff review
 */
function buildOpenAnswerSubmissions(
  questions: SimulationQuestionWithDetails[],
  answers: StudentAnswerInput[],
  studentId: string,
  simulationResultId: string
): Array<{
  questionId: string;
  studentId: string;
  simulationResultId: string;
  answerText: string;
  keywordsMatched: string[];
  keywordsMissed: string[];
  autoScore: number | null;
  finalScore: number | null;
  isValidated: boolean;
}> {
  const submissions = [];
  
  for (const sq of questions) {
    if (sq.question.type !== 'OPEN_TEXT') continue;
    
    const studentAnswer = answers.find(a => a.questionId === sq.questionId);
    if (!studentAnswer?.answerText?.trim()) continue;

    const scoring = autoScoreOpenAnswer(studentAnswer.answerText, sq.question.keywords);
    
    submissions.push({
      questionId: sq.questionId,
      studentId,
      simulationResultId,
      answerText: studentAnswer.answerText,
      keywordsMatched: scoring.keywordsMatched,
      keywordsMissed: scoring.keywordsMissed,
      autoScore: scoring.autoScore,
      finalScore: scoring.autoScore,
      isValidated: false,
    });
  }

  return submissions;
}

/**
 * Get or create simulation result for submission
 */
async function getOrCreateSimulationResult(
  prisma: PrismaClient,
  simulationId: string,
  studentId: string,
  totalQuestions: number,
  isRepeatable: boolean
): Promise<{ id: string }> {
  // Try to find existing in-progress result
  const existingResult = await prisma.simulationResult.findFirst({
    where: { simulationId, studentId, completedAt: null },
  });

  if (existingResult) return existingResult;

  // Check if there's already a completed result
  const completedResult = await prisma.simulationResult.findFirst({
    where: { simulationId, studentId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
  });
  
  if (completedResult && !isRepeatable) {
    throw new TRPCError({ 
      code: 'BAD_REQUEST', 
      message: 'Hai già completato questa simulazione' 
    });
  }
  
  if (completedResult) {
    throw new TRPCError({ 
      code: 'BAD_REQUEST', 
      message: 'Sessione scaduta. Per favore, riavvia la simulazione.' 
    });
  }
  
  // Create new result
  try {
    return await prisma.simulationResult.create({
      data: {
        simulation: { connect: { id: simulationId } },
        student: { connect: { id: studentId } },
        totalQuestions,
        answers: [],
      },
    });
  } catch (_error) {
    // Handle unique constraint violation
    const existing = await prisma.simulationResult.findFirst({
      where: { simulationId, studentId },
      orderBy: { startedAt: 'desc' },
    });
    if (existing?.completedAt) {
      throw new TRPCError({ 
        code: 'BAD_REQUEST', 
        message: 'Questa simulazione è già stata completata' 
      });
    }
    if (existing) return existing;
    throw _error;
  }
}

/**
 * Check if student has active Virtual Room session for the simulation
 */
async function checkActiveVirtualRoomSession(
  prisma: PrismaClient,
  simulationId: string,
  assignmentId: string | null,
  studentId: string,
  assignmentStatus: string | undefined
): Promise<boolean> {
  if (assignmentStatus !== 'ACTIVE' || !assignmentId) return false;
  
  const session = await prisma.simulationSession.findFirst({
    where: {
      simulationId,
      assignmentId,
      status: 'STARTED',
      participants: { some: { studentId } },
    },
  });
  
  return !!session;
}

/**
 * Validate and handle existing attempts for startAttempt
 */
async function handleExistingAttempts(
  prisma: PrismaClient,
  existingResults: Array<{ id: string; completedAt: Date | null; startedAt: Date; answers: Prisma.JsonValue; durationSeconds: number | null }>,
  assignmentId: string | null,
  studentId: string
): Promise<{ inProgressAttempt: typeof existingResults[0] | undefined; completedAttempts: number }> {
  const completedAttempts = existingResults.filter(r => r.completedAt).length;
  let inProgressAttempt = existingResults.find(r => !r.completedAt);

  // For Virtual Room simulations, check if the in-progress attempt should be invalidated
  if (inProgressAttempt && assignmentId) {
    const invalidationCheck = await shouldInvalidateOldAttempt(
      prisma, 
      inProgressAttempt, 
      assignmentId, 
      studentId
    );
    
    if (invalidationCheck.shouldDelete) {
      await prisma.simulationResult.delete({
        where: { id: inProgressAttempt.id },
      });
      
      log.info('Deleted old attempt from closed session - student will start fresh:', {
        oldResultId: inProgressAttempt.id,
        oldStartedAt: inProgressAttempt.startedAt,
        newSessionId: invalidationCheck.currentSessionId,
        newSessionCreatedAt: invalidationCheck.currentSessionCreatedAt,
        studentId,
        assignmentId,
      });
      
      inProgressAttempt = undefined;
    }
  }

  return { inProgressAttempt, completedAttempts };
}

// ============ Student Simulation Card Helpers ============

type StudentStatusType = 'not_started' | 'available' | 'in_progress' | 'completed' | 'expired' | 'closed';

type SimulationCardData = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  durationMinutes: number;
  totalQuestions: number;
  isOfficial: boolean;
  isRepeatable: boolean;
  maxAttempts: number | null;
  visibility: string;
  accessType: string;
  enableAntiCheat: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdBy: { name: string | null } | null;
  _count: { questions: number };
};

/**
 * Determine student status for an assigned simulation
 */
function determineAssignedSimulationStatus(
  resultStatus: 'completed' | 'in_progress' | null,
  isClosed: boolean,
  effectiveStartDate: Date | null,
  effectiveEndDate: Date | null,
  hasActiveVirtualRoom: boolean,
  now: Date
): StudentStatusType {
  if (resultStatus === 'completed') return 'completed';
  if (isClosed) return 'closed';
  
  const isNotStarted = effectiveStartDate && effectiveStartDate > now;
  if (isNotStarted && !hasActiveVirtualRoom) return 'not_started';
  
  if (resultStatus === 'in_progress') return 'in_progress';
  
  const isExpired = effectiveEndDate && effectiveEndDate < now;
  if (isExpired) return 'expired';
  
  return 'available';
}

/**
 * Determine student status for a public simulation
 */
function determinePublicSimulationStatus(
  resultStatus: 'completed' | 'in_progress' | undefined,
  startDate: Date | null,
  endDate: Date | null,
  now: Date
): StudentStatusType {
  if (resultStatus === 'completed') return 'completed';
  
  const isNotStarted = startDate && startDate > now;
  if (isNotStarted) return 'not_started';
  
  const isExpired = endDate && endDate < now;
  if (isExpired) return 'expired';
  
  if (resultStatus === 'in_progress') return 'in_progress';
  
  return 'available';
}

/**
 * Determine student status for a self-practice simulation
 */
function determineSelfPracticeStatus(
  resultStatus: 'completed' | 'in_progress' | undefined
): StudentStatusType {
  if (resultStatus === 'completed') return 'completed';
  if (resultStatus === 'in_progress') return 'in_progress';
  return 'available';
}

/**
 * Check if status filter matches
 */
function matchesStatusFilter(
  status: string | undefined,
  studentStatus: StudentStatusType,
  isAssigned: boolean
): boolean {
  if (!status) return true;
  if (status === studentStatus) return true;
  // For assigned simulations, allow "available" to also match "not_started"
  if (isAssigned && status === 'available' && studentStatus === 'not_started') return true;
  return false;
}

/**
 * Build base simulation card from simulation data
 */
function buildBaseSimulationCard(
  sim: SimulationCardData,
  assignmentId: string | null,
  studentStatus: StudentStatusType,
  assignmentType: 'direct' | 'group' | 'public' | null,
  assignmentData: { 
    dueDate: Date | null; 
    notes: string | null; 
    status: string | null;
    startDate: Date | null;
    endDate: Date | null;
  } | null
) {
  return {
    id: sim.id,
    assignmentId,
    title: sim.title,
    description: sim.description,
    type: sim.type,
    durationMinutes: sim.durationMinutes,
    totalQuestions: sim.totalQuestions,
    isOfficial: sim.isOfficial,
    isRepeatable: sim.isRepeatable,
    maxAttempts: sim.maxAttempts,
    visibility: sim.visibility,
    accessType: sim.accessType,
    enableAntiCheat: sim.enableAntiCheat,
    startDate: assignmentData?.startDate ?? sim.startDate,
    endDate: assignmentData?.endDate ?? sim.endDate,
    dueDate: assignmentData?.dueDate ?? null,
    assignmentNotes: assignmentData?.notes ?? null,
    assignmentType,
    assignmentStatus: assignmentData?.status ?? null,
    studentStatus,
    createdBy: sim.createdBy,
    _count: sim._count,
  };
}

/**
 * Build result status maps from student results
 */
function buildResultStatusMaps(
  studentResults: Array<{ simulationId: string; assignmentId: string | null; completedAt: Date | null }>
): {
  resultByAssignmentMap: Map<string, 'completed' | 'in_progress'>;
  resultBySimulationMap: Map<string, 'completed' | 'in_progress'>;
} {
  const resultByAssignmentMap = new Map<string, 'completed' | 'in_progress'>();
  const resultBySimulationMap = new Map<string, 'completed' | 'in_progress'>();
  
  for (const r of studentResults) {
    const status = r.completedAt ? 'completed' : 'in_progress';
    if (r.assignmentId) {
      resultByAssignmentMap.set(`${r.simulationId}:${r.assignmentId}`, status);
    } else {
      resultBySimulationMap.set(r.simulationId, status);
    }
  }
  
  return { resultByAssignmentMap, resultBySimulationMap };
}

/**
 * Check if should fetch assigned or self-created simulations
 */
function determineFetchFilters(
  assignedToMe: boolean | undefined,
  selfCreated: boolean | undefined
): { shouldFetchAssigned: boolean; shouldFetchSelfCreated: boolean } {
  const shouldFetchAssigned = assignedToMe === true || (assignedToMe === undefined && selfCreated !== true);
  const shouldFetchSelfCreated = selfCreated === true || (selfCreated === undefined && assignedToMe !== true);
  return { shouldFetchAssigned, shouldFetchSelfCreated };
}

/**
 * Build simulation type/official filter for where clause
 */
function buildSimulationTypeFilter(
  type: string | undefined,
  isOfficial: boolean | undefined
): Prisma.SimulationWhereInput {
  const filter: Prisma.SimulationWhereInput = {};
  if (type) filter.type = type as Prisma.SimulationWhereInput['type'];
  if (typeof isOfficial === 'boolean') filter.isOfficial = isOfficial;
  return filter;
}

/**
 * Build active session map for Virtual Room assignments
 */
function buildActiveSessionMap(
  activeSessions: Array<{ assignmentId: string | null; status: string }>
): Map<string, string> {
  return new Map<string, string>(
    activeSessions
      .filter((s): s is typeof s & { assignmentId: string } => s.assignmentId !== null)
      .map(s => [s.assignmentId, s.status])
  );
}

/**
 * Sort simulation cards by dynamic field
 */
function sortSimulationCards<T extends Record<string, unknown>>(
  cards: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): void {
  cards.sort((a, b) => compareCardValues(a[sortBy], b[sortBy], sortOrder));
}

/**
 * Compare two values for sorting
 */
function compareCardValues(
  aVal: unknown,
  bVal: unknown,
  sortOrder: 'asc' | 'desc'
): number {
  if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1;
  if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1;
  if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
  if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
  return 0;
}

/**
 * Fetch student assignments if needed
 */
async function fetchStudentAssignments(
  prisma: PrismaClient,
  shouldFetch: boolean,
  studentId: string,
  groupIds: string[],
  typeFilter: Prisma.SimulationWhereInput,
  sortOrder: 'asc' | 'desc'
) {
  if (!shouldFetch) return [];
  
  return prisma.simulationAssignment.findMany({
    where: {
      OR: [
        { studentId },
        ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
      ],
      simulation: {
        status: 'PUBLISHED',
        ...typeFilter,
      },
    },
    include: {
      simulation: {
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      },
    },
    orderBy: { startDate: sortOrder },
  });
}

/**
 * Fetch public simulations if needed
 */
async function fetchPublicSimulations(
  prisma: PrismaClient,
  shouldFetch: boolean,
  typeFilter: Prisma.SimulationWhereInput
) {
  if (!shouldFetch) return [];
  
  return prisma.simulation.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      ...typeFilter,
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  });
}

/**
 * Fetch self-practice simulations if needed
 */
async function fetchSelfPracticeSimulations(
  prisma: PrismaClient,
  shouldFetch: boolean,
  userId: string,
  isOfficial: boolean | undefined
) {
  if (!shouldFetch) return [];
  
  return prisma.simulation.findMany({
    where: {
      status: 'PUBLISHED',
      type: 'QUICK_QUIZ',
      createdById: userId,
      ...(typeof isOfficial === 'boolean' ? { isOfficial } : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Fetch active Virtual Room sessions for assignments
 */
async function fetchActiveVirtualRoomSessions(
  prisma: PrismaClient,
  assignments: Array<{ id: string; simulation: { accessType: string } }>
): Promise<Map<string, string>> {
  const roomAssignmentIds = assignments
    .filter(a => a.simulation.accessType === 'ROOM')
    .map(a => a.id);
  
  if (roomAssignmentIds.length === 0) return new Map();
  
  const activeSessions = await prisma.simulationSession.findMany({
    where: {
      assignmentId: { in: roomAssignmentIds },
      status: { in: ['WAITING', 'STARTED'] },
    },
    select: { assignmentId: true, status: true },
  });
  
  return buildActiveSessionMap(activeSessions);
}

/**
 * Get result status for a specific assignment
 */
function getAssignmentResultStatus(
  resultByAssignmentMap: Map<string, 'completed' | 'in_progress'>,
  simulationId: string,
  assignmentId: string | null
): 'completed' | 'in_progress' | null {
  if (!assignmentId) return null;
  return resultByAssignmentMap.get(`${simulationId}:${assignmentId}`) ?? null;
}

// Type for simulation cards
type SimulationCard = {
  id: string;
  assignmentId: string | null;
  title: string;
  description: string | null;
  type: string;
  durationMinutes: number;
  totalQuestions: number;
  isOfficial: boolean;
  isRepeatable: boolean;
  maxAttempts: number | null;
  visibility: string;
  accessType: string;
  enableAntiCheat: boolean;
  startDate: Date | null;
  endDate: Date | null;
  dueDate: Date | null;
  assignmentNotes: string | null;
  assignmentType: 'direct' | 'group' | 'public' | null;
  assignmentStatus: string | null;
  studentStatus: StudentStatusType;
  createdBy: { name: string | null } | null;
  _count: { questions: number };
};

/**
 * Process assignments into simulation cards
 */
function processAssignmentsToCards(
  assignments: Awaited<ReturnType<typeof fetchStudentAssignments>>,
  resultByAssignmentMap: Map<string, 'completed' | 'in_progress'>,
  activeSessionMap: Map<string, string>,
  status: string | undefined,
  now: Date
): SimulationCard[] {
  const cards: SimulationCard[] = [];
  
  for (const assignment of assignments) {
    const sim = assignment.simulation;
    const resultStatus = getAssignmentResultStatus(resultByAssignmentMap, sim.id, assignment.id);
    
    const effectiveStartDate = assignment.startDate || sim.startDate;
    const effectiveEndDate = assignment.endDate || sim.endDate;
    const hasActiveVirtualRoom = sim.accessType === 'ROOM' && activeSessionMap.has(assignment.id);
    
    const studentStatus = determineAssignedSimulationStatus(
      resultStatus,
      assignment.status === 'CLOSED',
      effectiveStartDate,
      effectiveEndDate,
      hasActiveVirtualRoom,
      now
    );

    if (!matchesStatusFilter(status, studentStatus, true)) continue;

    cards.push(buildBaseSimulationCard(
      sim,
      assignment.id,
      studentStatus,
      assignment.studentId ? 'direct' : 'group',
      {
        dueDate: assignment.dueDate,
        notes: assignment.notes,
        status: assignment.status,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
      }
    ));
  }
  
  return cards;
}

/**
 * Process public simulations into cards
 */
function processPublicSimulationsToCards(
  publicSimulations: Awaited<ReturnType<typeof fetchPublicSimulations>>,
  existingCardIds: Set<string>,
  resultBySimulationMap: Map<string, 'completed' | 'in_progress'>,
  status: string | undefined,
  now: Date
): SimulationCard[] {
  const cards: SimulationCard[] = [];
  
  for (const sim of publicSimulations) {
    if (existingCardIds.has(sim.id)) continue;

    const resultStatus = resultBySimulationMap.get(sim.id);
    const studentStatus = determinePublicSimulationStatus(resultStatus, sim.startDate, sim.endDate, now);

    if (!matchesStatusFilter(status, studentStatus, false)) continue;

    cards.push(buildBaseSimulationCard(sim, null, studentStatus, 'public', null));
  }
  
  return cards;
}

/**
 * Process self-practice simulations into cards
 */
function processSelfPracticeToCards(
  selfPracticeSimulations: Awaited<ReturnType<typeof fetchSelfPracticeSimulations>>,
  existingCardIds: Set<string>,
  resultBySimulationMap: Map<string, 'completed' | 'in_progress'>,
  status: string | undefined
): SimulationCard[] {
  const cards: SimulationCard[] = [];
  
  for (const sim of selfPracticeSimulations) {
    if (existingCardIds.has(sim.id)) continue;

    const resultStatus = resultBySimulationMap.get(sim.id);
    const studentStatus = determineSelfPracticeStatus(resultStatus);

    if (!matchesStatusFilter(status, studentStatus, false)) continue;

    cards.push(buildBaseSimulationCard(sim, null, studentStatus, null, null));
  }
  
  return cards;
}

/**
 * Apply basic filters to simulation where clause
 */
function applyBasicFilters(
  where: Prisma.SimulationWhereInput,
  input: z.infer<typeof simulationFilterSchema>
): void {
  if (input.type) where.type = input.type;
  if (input.status) where.status = input.status;
  if (input.visibility) where.visibility = input.visibility;
  if (typeof input.isOfficial === 'boolean') where.isOfficial = input.isOfficial;
  if (input.createdById) where.createdById = input.createdById;
  if (input.creatorRole) {
    where.creatorRole = input.creatorRole;
  } else {
    // Exclude simulations created by students (self-practice)
    where.creatorRole = { not: 'STUDENT' };
  }
}

/**
 * Apply date range filters to simulation where clause
 */
function applyDateRangeFilters(
  where: Prisma.SimulationWhereInput,
  input: z.infer<typeof simulationFilterSchema>
): void {
  if (input.startDateFrom || input.startDateTo) {
    where.startDate = {};
    if (input.startDateFrom) where.startDate.gte = new Date(input.startDateFrom);
    if (input.startDateTo) where.startDate.lte = new Date(input.startDateTo);
  }

  if (input.endDateFrom || input.endDateTo) {
    where.endDate = {};
    if (input.endDateFrom) where.endDate.gte = new Date(input.endDateFrom);
    if (input.endDateTo) where.endDate.lte = new Date(input.endDateTo);
  }
}

/**
 * Build the where clause for simulation filtering
 */
function buildSimulationWhereClause(
  input: z.infer<typeof simulationFilterSchema>,
  userRole: string,
  userId: string
): Prisma.SimulationWhereInput {
  const where: Prisma.SimulationWhereInput = {};
  const andConditions: Prisma.SimulationWhereInput[] = [];

  // Apply search filter
  if (input.search) {
    andConditions.push({
      OR: [
        { title: { contains: input.search, mode: 'insensitive' } },
        { description: { contains: input.search, mode: 'insensitive' } },
      ],
    });
  }

  // Apply basic filters
  applyBasicFilters(where, input);
  
  // Filter by group
  if (input.groupId) {
    andConditions.push({
      assignments: { some: { groupId: input.groupId } },
    });
  }

  // Apply date range filters
  applyDateRangeFilters(where, input);

  // Collaborators can only see their own + published simulations
  if (userRole === 'COLLABORATOR') {
    andConditions.push({
      OR: [
        { createdById: userId },
        { status: 'PUBLISHED' },
      ],
    });
  }

  // Combine AND conditions
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

export const simulationsRouter = router({
  // ==================== ADMIN/STAFF PROCEDURES ====================

  // Get paginated simulations list (admin/staff)
  getSimulations: staffProcedure
    .input(simulationFilterSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder } = input;

      // Build where clause using helper function
      const where = buildSimulationWhereClause(input, ctx.user.role, ctx.user.id);

      // Count total
      const total = await ctx.prisma.simulation.count({ where });

      // Get simulations
      const simulations = await ctx.prisma.simulation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
          _count: {
            select: {
              questions: true,
              results: true,
              assignments: true,
            },
          },
        },
      });

      return {
        simulations,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get single simulation with all details
  getSimulation: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true, email: true },
          },
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: {
                  subject: { select: { id: true, name: true, code: true, color: true } },
                  topic: { select: { id: true, name: true } },
                  answers: { orderBy: { order: 'asc' } },
                },
              },
            },
          },
          assignments: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
              group: { select: { id: true, name: true, color: true } },
              assignedBy: { select: { id: true, name: true } },
            },
          },
          results: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
            },
            orderBy: { completedAt: 'desc' },
            take: 50,
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Collaborators can only see their own or published simulations
      if (ctx.user.role === 'COLLABORATOR' && 
          simulation.createdById !== ctx.user.id && 
          simulation.status !== 'PUBLISHED') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso a questa simulazione' });
      }

      return simulation;
    }),

  // Create simulation with manual question selection
  createWithQuestions: staffProcedure
    .input(createSimulationWithQuestionsSchema)
    .mutation(async ({ ctx, input }) => {
      const { questions, assignments, ...simulationData } = input;

      // Validate collaborator assignments
      if (ctx.user.role === 'COLLABORATOR' && ctx.user.collaborator?.id) {
        await validateCollaboratorAssignments(ctx.prisma, ctx.user.collaborator.id, assignments);
      }

      // Validate all questions exist
      const questionIds = questions.map(q => q.questionId);
      const existingQuestions = await validateQuestionsExist(ctx.prisma, questionIds);

      // Calculate maxScore if not provided
      const correctPts = simulationData.correctPoints ?? 1.5;
      const calculatedMaxScore = simulationData.maxScore ?? (questions.length * correctPts);

      // Auto-generate sections if hasSections=true but no sections provided
      const needsAutoSections = simulationData.hasSections && 
        (!simulationData.sections || (Array.isArray(simulationData.sections) && simulationData.sections.length === 0));
      
      const sectionsData = needsAutoSections
        ? generateSectionsFromQuestions(existingQuestions, simulationData.durationMinutes ?? 0)
        : simulationData.sections;

      // Create simulation with questions and assignments
      const simulation = await ctx.prisma.simulation.create({
        data: {
          title: simulationData.title,
          description: simulationData.description,
          type: simulationData.type,
          visibility: simulationData.visibility ?? 'PRIVATE',
          isOfficial: simulationData.isOfficial ?? false,
          accessType: (simulationData.isOfficial ?? false) ? 'ROOM' : 'OPEN',
          durationMinutes: simulationData.durationMinutes ?? 0,
          totalQuestions: questions.length,
          showResults: simulationData.showResults ?? true,
          showCorrectAnswers: simulationData.showCorrectAnswers ?? true,
          allowReview: simulationData.allowReview ?? true,
          randomizeOrder: simulationData.randomizeOrder ?? false,
          randomizeAnswers: simulationData.randomizeAnswers ?? false,
          useQuestionPoints: simulationData.useQuestionPoints ?? false,
          correctPoints: simulationData.correctPoints ?? 1.5,
          wrongPoints: simulationData.wrongPoints ?? -0.4,
          blankPoints: simulationData.blankPoints ?? 0,
          maxScore: calculatedMaxScore,
          passingScore: simulationData.passingScore,
          isRepeatable: simulationData.isRepeatable ?? false,
          maxAttempts: simulationData.maxAttempts,
          isPublic: simulationData.isPublic ?? false,
          startDate: simulationData.startDate ? new Date(simulationData.startDate) : null,
          endDate: simulationData.endDate ? new Date(simulationData.endDate) : null,
          topicIds: simulationData.topicIds ?? [],
          subjectDistribution: simulationData.subjectDistribution ?? undefined,
          difficultyDistribution: simulationData.difficultyDistribution ?? undefined,
          isPaperBased: simulationData.isPaperBased ?? false,
          paperInstructions: simulationData.paperInstructions,
          showSectionsInPaper: simulationData.showSectionsInPaper ?? true,
          trackAttendance: simulationData.trackAttendance ?? false,
          locationType: simulationData.locationType,
          locationDetails: simulationData.locationDetails,
          hasSections: simulationData.hasSections ?? false,
          sections: sectionsData ?? undefined,
          isScheduled: simulationData.isScheduled ?? false,
          enableAntiCheat: simulationData.enableAntiCheat ?? false,
          forceFullscreen: simulationData.forceFullscreen ?? false,
          blockTabChange: simulationData.blockTabChange ?? false,
          blockCopyPaste: simulationData.blockCopyPaste ?? false,
          logSuspiciousEvents: simulationData.logSuspiciousEvents ?? false,
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: ctx.user.role,
          questions: {
            create: questions.map((q, index) => ({
              question: { connect: { id: q.questionId } },
              order: q.order ?? index,
              customPoints: q.customPoints,
              customNegativePoints: q.customNegativePoints,
            })),
          },
          assignments: assignments.length > 0 ? {
            create: assignments.map(a => ({
              student: a.studentId ? { connect: { id: a.studentId } } : undefined,
              group: a.groupId ? { connect: { id: a.groupId } } : undefined,
              dueDate: a.dueDate ? new Date(a.dueDate) : null,
              notes: a.notes,
              assignedBy: { connect: { id: ctx.user.id } },
            })),
          } : undefined,
        },
        include: {
          questions: { include: { question: true } },
          assignments: true,
        },
      });

      // Send notifications to assigned students (calendar event + email with .ics)
      if (simulation.assignments.length > 0) {
        // Fire and forget - don't block the response
        notifySimulationCreated(simulation.id, ctx.prisma).catch((error) => {
          console.error('[Simulations] Failed to send notifications:', error);
        });
      }

      return simulation;
    }),

  // Create simulation with automatic question selection
  createAutomatic: staffProcedure
    .input(createSimulationAutoSchema)
    .mutation(async ({ ctx, input }) => {
      const { subjectDistribution, difficultyDistribution, topicIds, assignments, ...simulationData } = input;

      // Validate collaborator assignments
      if (ctx.user.role === 'COLLABORATOR' && ctx.user.collaborator?.id) {
        await validateCollaboratorAssignments(ctx.prisma, ctx.user.collaborator.id, assignments);
      }

      // Calculate total questions from distribution
      const totalNeeded = Object.values(subjectDistribution).reduce((a, b) => a + b, 0);
      
      if (totalNeeded !== simulationData.totalQuestions) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Il numero totale di domande (${simulationData.totalQuestions}) non corrisponde alla distribuzione (${totalNeeded})`,
        });
      }

      // Select questions based on criteria
      const selectedQuestions = await selectQuestionsAutomatically(
        ctx.prisma,
        subjectDistribution,
        difficultyDistribution,
        topicIds
      );

      // Calculate maxScore if not provided
      const correctPts = simulationData.correctPoints ?? 1.5;
      const calculatedMaxScore = simulationData.maxScore ?? (selectedQuestions.length * correctPts);

      // Create simulation
      const simulation = await ctx.prisma.simulation.create({
        data: {
          title: simulationData.title,
          description: simulationData.description,
          type: simulationData.type,
          visibility: simulationData.visibility ?? 'PRIVATE',
          isOfficial: simulationData.isOfficial ?? false,
          durationMinutes: simulationData.durationMinutes ?? 0,
          totalQuestions: selectedQuestions.length,
          showResults: simulationData.showResults ?? true,
          showCorrectAnswers: simulationData.showCorrectAnswers ?? true,
          allowReview: simulationData.allowReview ?? true,
          randomizeOrder: simulationData.randomizeOrder ?? false,
          randomizeAnswers: simulationData.randomizeAnswers ?? false,
          useQuestionPoints: simulationData.useQuestionPoints ?? false,
          correctPoints: simulationData.correctPoints ?? 1.5,
          wrongPoints: simulationData.wrongPoints ?? -0.4,
          blankPoints: simulationData.blankPoints ?? 0,
          maxScore: calculatedMaxScore,
          passingScore: simulationData.passingScore,
          isRepeatable: simulationData.isRepeatable ?? false,
          maxAttempts: simulationData.maxAttempts,
          isPublic: simulationData.isPublic ?? false,
          startDate: simulationData.startDate ? new Date(simulationData.startDate) : null,
          endDate: simulationData.endDate ? new Date(simulationData.endDate) : null,
          subjectDistribution: subjectDistribution as Prisma.JsonObject,
          difficultyDistribution: difficultyDistribution as Prisma.JsonObject | null,
          topicIds: topicIds ?? [],
          // New fields for paper-based, attendance, sections, and anti-cheat
          isPaperBased: simulationData.isPaperBased ?? false,
          paperInstructions: simulationData.paperInstructions,
          showSectionsInPaper: simulationData.showSectionsInPaper ?? true,
          trackAttendance: simulationData.trackAttendance ?? false,
          locationType: simulationData.locationType,
          locationDetails: simulationData.locationDetails,
          hasSections: simulationData.hasSections ?? false,
          sections: simulationData.sections ?? undefined,
          isScheduled: simulationData.isScheduled ?? false,
          enableAntiCheat: simulationData.enableAntiCheat ?? false,
          forceFullscreen: simulationData.forceFullscreen ?? false,
          blockTabChange: simulationData.blockTabChange ?? false,
          blockCopyPaste: simulationData.blockCopyPaste ?? false,
          logSuspiciousEvents: simulationData.logSuspiciousEvents ?? false,
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: ctx.user.role,
          questions: {
            create: selectedQuestions.map(q => ({
              question: { connect: { id: q.id } },
              order: q.order,
            })),
          },
          assignments: assignments.length > 0 ? {
            create: assignments.map(a => ({
              student: a.studentId ? { connect: { id: a.studentId } } : undefined,
              group: a.groupId ? { connect: { id: a.groupId } } : undefined,
              dueDate: a.dueDate ? new Date(a.dueDate) : null,
              notes: a.notes,
              assignedBy: { connect: { id: ctx.user.id } },
            })),
          } : undefined,
        },
        include: {
          questions: { include: { question: true } },
          assignments: true,
        },
      });

      // Send notifications to assigned students (calendar event + email with .ics)
      if (simulation.assignments.length > 0) {
        // Fire and forget - don't block the response
        notifySimulationCreated(simulation.id, ctx.prisma).catch((error) => {
          console.error('[Simulations] Failed to send notifications for automatic simulation:', error);
        });
      }

      return simulation;
    }),

  // Update simulation metadata
  update: adminProcedure
    .input(updateSimulationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check simulation exists
      const existing = await ctx.prisma.simulation.findUnique({
        where: { id },
        select: { createdById: true, status: true, isOfficial: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Can't make official if not admin
      if (data.isOfficial && !existing.isOfficial && ctx.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo gli admin possono rendere ufficiale una simulazione',
        });
      }

      // Can't edit archived simulations
      if (existing.status === 'ARCHIVED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Non puoi modificare una simulazione archiviata',
        });
      }

      const simulation = await ctx.prisma.simulation.update({
        where: { id },
        data: {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { questions: true, results: true, assignments: true } },
        },
      });

      return simulation;
    }),

  // Update simulation questions
  updateQuestions: adminProcedure
    .input(updateSimulationQuestionsSchema)
    .mutation(async ({ ctx, input }) => {
      const { simulationId, questions, mode } = input;

      // Check simulation
      const existing = await ctx.prisma.simulation.findUnique({
        where: { id: simulationId },
        select: { createdById: true, status: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (existing.status === 'ARCHIVED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Non puoi modificare le domande di una simulazione archiviata' });
      }

      // Validate questions exist
      const questionIds = questions.map(q => q.questionId);
      const existingQuestions = await ctx.prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true },
      });

      if (existingQuestions.length !== questionIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Una o più domande non esistono' });
      }

      await ctx.prisma.$transaction(async () => {
        if (mode === 'replace') {
          // Delete all existing questions and add new ones
          await ctx.prisma.simulationQuestion.deleteMany({ where: { simulationId } });
          await ctx.prisma.simulationQuestion.createMany({
            data: questions.map((q, index) => ({
              simulationId,
              questionId: q.questionId,
              order: q.order ?? index,
              customPoints: q.customPoints,
              customNegativePoints: q.customNegativePoints,
            })),
          });
          await ctx.prisma.simulation.update({
            where: { id: simulationId },
            data: { totalQuestions: questions.length },
          });
        } else if (mode === 'append') {
          // Get current max order
          const maxOrder = await ctx.prisma.simulationQuestion.findFirst({
            where: { simulationId },
            orderBy: { order: 'desc' },
            select: { order: true },
          });
          const startOrder = (maxOrder?.order ?? -1) + 1;

          await ctx.prisma.simulationQuestion.createMany({
            data: questions.map((q, index) => ({
              simulationId,
              questionId: q.questionId,
              order: startOrder + index,
              customPoints: q.customPoints,
              customNegativePoints: q.customNegativePoints,
            })),
          });

          // Update total
          const newTotal = await ctx.prisma.simulationQuestion.count({ where: { simulationId } });
          await ctx.prisma.simulation.update({
            where: { id: simulationId },
            data: { totalQuestions: newTotal },
          });
        } else if (mode === 'remove') {
          await ctx.prisma.simulationQuestion.deleteMany({
            where: {
              simulationId,
              questionId: { in: questionIds },
            },
          });

          const newTotal = await ctx.prisma.simulationQuestion.count({ where: { simulationId } });
          await ctx.prisma.simulation.update({
            where: { id: simulationId },
            data: { totalQuestions: newTotal },
          });
        }
      });

      return { success: true };
    }),

  // Delete simulation (Admin only)
  delete: adminProcedure
    .input(z.object({ 
      id: z.string(),
      force: z.boolean().optional().default(false), // Force delete even if has results
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        select: { 
          createdById: true, 
          status: true, 
          title: true,
          type: true,
          _count: { 
            select: { 
              results: true,
              assignments: true,
              sessions: true,
            } 
          },
          assignments: {
            include: {
              student: { select: { userId: true } },
              group: { select: { id: true } },
            },
          },
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // If has results and force is not true, return error with count info
      if (existing._count.results > 0 && !input.force) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Questa simulazione ha ${existing._count.results} risultati salvati. Usa l'eliminazione forzata per eliminare tutto.`,
        });
      }

      // Log what will be deleted
      if (input.force && existing._count.results > 0) {
        log.info(`Force delete: "${existing.title}" with ${existing._count.results} results, ${existing._count.assignments} assignments`);
      }

      // Delete ALL calendar events related to this simulation
      // Events are created with a title pattern: "TOLC: Title" or "Simulazione: Title"
      const tolcTitle = `TOLC: ${existing.title}`;
      const simTitle = `Simulazione: ${existing.title}`;
      
      // Find all calendar events matching either title
      const eventsToDelete = await ctx.prisma.calendarEvent.findMany({
        where: {
          type: 'SIMULATION',
          OR: [
            { title: tolcTitle },
            { title: simTitle },
            { title: { contains: existing.title } },
          ],
        },
        select: { id: true, title: true },
      });

      if (eventsToDelete.length > 0) {
        const eventIds = eventsToDelete.map(e => e.id);
        
        // First delete all event invitations (foreign key constraint)
        await ctx.prisma.eventInvitation.deleteMany({
          where: {
            eventId: { in: eventIds },
          },
        });
        
        // Then delete the calendar events
        const eventsDeleted = await ctx.prisma.calendarEvent.deleteMany({
          where: {
            id: { in: eventIds },
          },
        });
        log.info(`Deleted ${eventsDeleted.count} calendar events for simulation "${existing.title}"`);
      }

      // Delete simulation - CASCADE will automatically delete:
      // - SimulationAssignment (assignments in calendar)
      // - SimulationQuestion (questions relationship)
      // - SimulationSession (if any)
      await ctx.prisma.simulation.delete({ where: { id: input.id } });

      return { 
        success: true,
        deletedAssignments: existing._count.assignments 
      };
    }),

  // Publish simulation
  publish: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        include: {
          questions: { include: { question: { select: { status: true } } } },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi' });
      }

      // Check all questions are published
      const unpublished = simulation.questions.filter(sq => sq.question.status !== 'PUBLISHED');
      if (unpublished.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${unpublished.length} domande non sono ancora pubblicate`,
        });
      }

      // Check has at least 1 question
      if (simulation.questions.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La simulazione deve avere almeno una domanda',
        });
      }

      const updated = await ctx.prisma.simulation.update({
        where: { id: input.id },
        data: { status: 'PUBLISHED' },
      });

      return updated;
    }),

  // Archive simulation
  archive: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        select: { createdById: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && existing.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi' });
      }

      const simulation = await ctx.prisma.simulation.update({
        where: { id: input.id },
        data: { status: 'ARCHIVED' },
      });

      return simulation;
    }),

  // Close assignment(s) manually - students/groups can no longer access
  closeAssignment: staffProcedure
    .input(z.object({ 
      assignmentIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get assignments
      const assignments = await ctx.prisma.simulationAssignment.findMany({
        where: { id: { in: input.assignmentIds } },
      });

      if (assignments.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assegnazioni non trovate' });
      }

      // For collaborators, verify they created all assignments
      if (ctx.user.role === 'COLLABORATOR') {
        const notOwnedByUser = assignments.some(a => a.assignedById !== ctx.user.id);
        if (notOwnedByUser) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Puoi chiudere solo le assegnazioni che hai creato tu' 
          });
        }
      }

      // Close all assignments
      const result = await ctx.prisma.simulationAssignment.updateMany({
        where: { id: { in: input.assignmentIds } },
        data: { status: 'CLOSED' },
      });

      return { 
        success: true, 
        closedCount: result.count,
        message: `${result.count} assegnazione/i chiusa/e con successo`,
      };
    }),

  // Reopen assignment(s) - students/groups can access again
  reopenAssignment: staffProcedure
    .input(z.object({ 
      assignmentIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get assignments
      const assignments = await ctx.prisma.simulationAssignment.findMany({
        where: { id: { in: input.assignmentIds } },
      });

      if (assignments.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assegnazioni non trovate' });
      }

      // For collaborators, verify they created all assignments
      if (ctx.user.role === 'COLLABORATOR') {
        const notOwnedByUser = assignments.some(a => a.assignedById !== ctx.user.id);
        if (notOwnedByUser) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Puoi riaprire solo le assegnazioni che hai creato tu' 
          });
        }
      }

      // Get simulation IDs to clean up Virtual Room sessions
      const simulationIds = [...new Set(assignments.map(a => a.simulationId))];
      
      // Clean up old Virtual Room sessions (WAITING/STARTED) for these simulations
      // This prevents "phantom participants" from previous sessions
      await ctx.prisma.simulationSession.updateMany({
        where: {
          simulationId: { in: simulationIds },
          status: { in: ['WAITING', 'STARTED'] },
        },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      });

      // Reopen all assignments
      const result = await ctx.prisma.simulationAssignment.updateMany({
        where: { id: { in: input.assignmentIds } },
        data: { status: 'ACTIVE' },
      });

      return { 
        success: true, 
        reopenedCount: result.count,
        message: `${result.count} assegnazione/i riaperta/e con successo`,
      };
    }),

  // ==================== ASSIGNMENTS ====================

  // Add assignments to simulation
  addAssignments: staffProcedure
    .input(bulkAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { simulationId, targets } = input;

      // Check simulation exists and get details for calendar events
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: simulationId },
        select: { 
          createdById: true, 
          status: true,
          title: true,
          type: true,
          isOfficial: true,
          durationMinutes: true,
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Validate collaborator assignments
      if (ctx.user.role === 'COLLABORATOR' && ctx.user.collaborator?.id) {
        await validateCollaboratorAssignments(ctx.prisma, ctx.user.collaborator.id, targets);
      }

      // Check for overlapping assignments BEFORE creating new ones
      for (const target of targets) {
        await checkOverlappingAssignments(ctx.prisma, target);
      }

      // Create assignments and auto-publish simulation
      const created = await ctx.prisma.$transaction(async () => {
        const results = [];
        for (const target of targets) {
          const startDate = target.startDate ? new Date(target.startDate) : null;
          const endDate = target.endDate ? new Date(target.endDate) : null;

          // Create the assignment
          const assignment = await ctx.prisma.simulationAssignment.create({
            data: {
              simulationId,
              studentId: target.studentId,
              groupId: target.groupId,
              dueDate: target.dueDate ? new Date(target.dueDate) : null,
              notes: target.notes,
              assignedById: ctx.user.id,
              startDate,
              endDate,
              locationType: target.locationType,
              createCalendarEvent: target.createCalendarEvent ?? false,
            },
          });
          
          results.push(assignment);
        }

        // Auto-publish simulation when assignments are created
        if (results.length > 0 && simulation.status === 'DRAFT') {
          await ctx.prisma.simulation.update({
            where: { id: simulationId },
            data: { status: 'PUBLISHED' },
          });
        }

        return results;
      });

      // Send notifications for newly added assignments
      if (created.length > 0) {
        // Fire and forget - don't block the response
        notifySimulationCreated(simulationId, ctx.prisma).catch((error) => {
          log.error('Failed to send notifications for new assignments:', error);
        });
      }

      // Create calendar events for assignments (fire and forget)
      // Only for assignments where createCalendarEvent is explicitly true
      if (created.length > 0) {
        const assignmentsWithCalendarEvents = created.filter(a => a.createCalendarEvent === true);
        
        if (assignmentsWithCalendarEvents.length > 0) {
          log.info(`Creating calendar events for ${assignmentsWithCalendarEvents.length}/${created.length} assignments`);
          createCalendarEventsForAssignments(
            simulationId,
            simulation,
            assignmentsWithCalendarEvents,
            ctx.user.id,
            ctx.prisma
          ).catch((error) => {
            log.error('Failed to create calendar events:', error);
          });
        }
      }

      return { 
        created: created.length,
      };
    }),

  // Get existing assignments for a simulation (for the assign modal)
  getExistingAssignmentIds: staffProcedure
    .input(z.object({ simulationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.prisma.simulationAssignment.findMany({
        where: { simulationId: input.simulationId },
        select: {
          id: true,
          studentId: true,
          groupId: true,
          startDate: true,
          endDate: true,
        },
      });

      // Get directly assigned student IDs
      const directlyAssignedStudentIds = assignments
        .filter((a): a is typeof a & { studentId: string } => !!a.studentId)
        .map(a => a.studentId);

      return {
        assignedStudentIds: directlyAssignedStudentIds,
        assignedGroupIds: assignments
          .filter((a): a is typeof a & { groupId: string } => !!a.groupId)
          .map(a => a.groupId),
        assignments: assignments.map(a => ({
          id: a.id,
          studentId: a.studentId,
          groupId: a.groupId,
          startDate: a.startDate,
          endDate: a.endDate,
        })),
        // This will be used to show warnings when selecting groups
        directlyAssignedStudentIds,
      };
    }),

  // Get students in a group that already have direct assignments for a simulation
  getGroupMembersWithDirectAssignment: staffProcedure
    .input(z.object({ 
      simulationId: z.string(),
      groupId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all members of the group
      const groupMembers = await ctx.prisma.groupMember.findMany({
        where: { groupId: input.groupId },
        select: { 
          studentId: true,
          student: {
            select: {
              id: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      // Get students directly assigned to this simulation
      const directAssignments = await ctx.prisma.simulationAssignment.findMany({
        where: { 
          simulationId: input.simulationId,
          studentId: { not: null },
        },
        select: { studentId: true },
      });
      const directlyAssignedIds = new Set(directAssignments.map(a => a.studentId));

      // Find group members who have direct assignments
      const membersWithDirectAssignment = groupMembers
        .filter(m => directlyAssignedIds.has(m.studentId))
        .map(m => ({
          studentId: m.studentId,
          name: m.student.user.name,
        }));

      return {
        totalMembers: groupMembers.length,
        membersWithDirectAssignment,
        countWithDirectAssignment: membersWithDirectAssignment.length,
      };
    }),

  // Get group members who already have this simulation (direct OR from other groups)
  getGroupMembersAlreadyAssigned: staffProcedure
    .input(z.object({
      groupId: z.string(),
      simulationId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all members of the group
      const groupMembers = await ctx.prisma.groupMember.findMany({
        where: { groupId: input.groupId },
        select: { 
          studentId: true,
          student: {
            select: {
              id: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      // Get ALL assignments for this simulation (direct + from any group)
      const allAssignments = await ctx.prisma.simulationAssignment.findMany({
        where: { 
          simulationId: input.simulationId,
          OR: [
            { studentId: { not: null } },
            { groupId: { not: null } },
          ],
        },
        select: { 
          studentId: true,
          groupId: true,
          group: { select: { name: true } },
        },
      });

      // Build set of assigned student IDs
      const assignedStudentIds = new Set<string>();
      const assignmentSources: Record<string, Array<{ type: 'direct' | 'group'; name?: string }>> = {};
      
      for (const assignment of allAssignments) {
        if (assignment.studentId) {
          // Direct assignment
          assignedStudentIds.add(assignment.studentId);
          if (!assignmentSources[assignment.studentId]) {
            assignmentSources[assignment.studentId] = [];
          }
          assignmentSources[assignment.studentId].push({ type: 'direct' });
        } else if (assignment.groupId && assignment.groupId !== input.groupId) {
          // Group assignment (exclude current group)
          const groupMembersOfAssignment = await ctx.prisma.groupMember.findMany({
            where: { groupId: assignment.groupId },
            select: { studentId: true },
          });
          for (const member of groupMembersOfAssignment) {
            assignedStudentIds.add(member.studentId);
            if (!assignmentSources[member.studentId]) {
              assignmentSources[member.studentId] = [];
            }
            assignmentSources[member.studentId].push({ 
              type: 'group', 
              name: assignment.group?.name || 'Gruppo sconosciuto' 
            });
          }
        }
      }

      // Find group members who are already assigned
      const membersAlreadyAssigned = groupMembers
        .filter(m => assignedStudentIds.has(m.studentId))
        .map(m => {
          const sources = assignmentSources[m.studentId] || [];
          const isDirect = sources.some(s => s.type === 'direct');
          const fromGroups = sources
            .filter((s): s is typeof s & { name: string } => s.type === 'group' && !!s.name)
            .map(s => s.name);
          
          return {
            studentId: m.studentId,
            name: m.student.user.name,
            isDirect,
            fromGroups,
          };
        });

      return {
        totalMembers: groupMembers.length,
        membersAlreadyAssigned,
        countAlreadyAssigned: membersAlreadyAssigned.length,
      };
    }),

  // Update existing assignment (reassign with new dates) - Admin only
  updateAssignment: adminProcedure
    .input(z.object({
      assignmentId: z.string(),
      startDate: z.string().datetime().optional().nullable(),
      endDate: z.string().datetime().optional().nullable(),
      locationType: z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { assignmentId, startDate, endDate, locationType } = input;

      const assignment = await ctx.prisma.simulationAssignment.findUnique({
        where: { id: assignmentId },
        include: { simulation: { select: { id: true, createdById: true, title: true } } },
      });

      if (!assignment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assegnazione non trovata' });
      }

      const updated = await ctx.prisma.simulationAssignment.update({
        where: { id: assignmentId },
        data: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          locationType: locationType,
        },
      });

      // Send notification about the update
      if (assignment.studentId) {
        const student = await ctx.prisma.student.findUnique({
          where: { id: assignment.studentId },
          select: { userId: true },
        });
        if (student?.userId) {
          await notifications.simulationAssigned(ctx.prisma, {
            assignedUserIds: [student.userId],
            simulationId: assignment.simulation.id,
            simulationTitle: assignment.simulation.title,
            dueDate: endDate ? new Date(endDate) : undefined,
          });
        }
      }

      return updated;
    }),

  // Remove assignment
  removeAssignment: staffProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.prisma.simulationAssignment.findUnique({
        where: { id: input.assignmentId },
        select: {
          id: true,
          simulationId: true,
          studentId: true,
          groupId: true,
          assignedById: true,
          createCalendarEvent: true,
          student: { select: { userId: true } },
          group: {
            include: {
              members: {
                include: {
                  student: { select: { userId: true } },
                },
              },
            },
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assegnazione non trovata' });
      }

      // For collaborators, verify they created the assignment
      if (ctx.user.role === 'COLLABORATOR' && assignment.assignedById !== ctx.user.id) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Puoi eliminare solo le assegnazioni che hai creato tu' 
        });
      }

      // Collect user IDs to remove calendar events for
      // We always try to delete calendar events (even if createCalendarEvent is false)
      // because old assignments may have events created before this flag existed
      const userIds: string[] = [];
      const groupIdForCalendar = assignment.groupId;
      
      if (assignment.studentId && assignment.student?.userId) {
        userIds.push(assignment.student.userId);
      } else if (assignment.groupId && assignment.group) {
        for (const member of assignment.group.members) {
          if (member.student.userId) {
            userIds.push(member.student.userId);
          }
        }
      }

      // Delete assignment
      await ctx.prisma.simulationAssignment.delete({ where: { id: input.assignmentId } });

      // Always try to delete related calendar events (fire and forget)
      // This handles both new assignments with createCalendarEvent=true
      // and old assignments that were created before this flag existed
      if (assignment.simulationId) {
        deleteCalendarEventsForAssignment(
          assignment.simulationId,
          userIds,
          ctx.prisma,
          groupIdForCalendar
        ).catch((error) => {
          console.error('[Simulations] Failed to delete calendar events:', error);
        });
      }

      return { success: true };
    }),

  // ==================== STUDENT PROCEDURES ====================

  // Get available simulations for student
  getAvailableSimulations: studentProcedure
    .input(studentSimulationFilterSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, type, status, isOfficial, sortBy, sortOrder, selfCreated, assignedToMe } = input;

      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;
      const now = new Date();

      // Get student's groups
      const groupMembers = await ctx.prisma.groupMember.findMany({
        where: { studentId },
        select: { groupId: true },
      });
      const groupIds = groupMembers.map(gm => gm.groupId);

      // Determine what to fetch based on filters
      const { shouldFetchAssigned, shouldFetchSelfCreated } = determineFetchFilters(assignedToMe, selfCreated);
      const typeFilter = buildSimulationTypeFilter(type, isOfficial);

      // Fetch data using helpers
      const assignments = await fetchStudentAssignments(ctx.prisma, shouldFetchAssigned, studentId, groupIds, typeFilter, sortOrder);
      const publicSimulations = await fetchPublicSimulations(ctx.prisma, shouldFetchAssigned, typeFilter);
      const selfPracticeSimulations = await fetchSelfPracticeSimulations(ctx.prisma, shouldFetchSelfCreated, ctx.user.id, isOfficial);

      // Get ALL student's results (with assignmentId)
      const studentResults = await ctx.prisma.simulationResult.findMany({
        where: { studentId },
        select: { 
          simulationId: true, 
          assignmentId: true,
          completedAt: true 
        },
      });

      // Create maps for quick lookup using helper
      const { resultByAssignmentMap, resultBySimulationMap } = buildResultStatusMaps(studentResults);

      // Get active Virtual Room sessions using helper
      const activeSessionMap = await fetchActiveVirtualRoomSessions(ctx.prisma, assignments);

      // Build simulation cards using helpers
      const assignmentCards = processAssignmentsToCards(
        assignments,
        resultByAssignmentMap,
        activeSessionMap,
        status,
        now
      );
      
      const existingCardIds = new Set(assignmentCards.map(c => c.id));
      
      const publicCards = processPublicSimulationsToCards(
        publicSimulations,
        existingCardIds,
        resultBySimulationMap,
        status,
        now
      );
      
      // Add public card IDs to existing set
      for (const c of publicCards) existingCardIds.add(c.id);
      
      const selfPracticeCards = processSelfPracticeToCards(
        selfPracticeSimulations,
        existingCardIds,
        resultBySimulationMap,
        status
      );

      const simulationCards = [...assignmentCards, ...publicCards, ...selfPracticeCards];

      // Sort cards using helper
      sortSimulationCards(simulationCards, sortBy, sortOrder);

      // Paginate
      const total = simulationCards.length;
      const paginatedCards = simulationCards.slice((page - 1) * pageSize, page * pageSize);

      return {
        simulations: paginatedCards,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get simulation details for student (without answers if not allowed)
  getSimulationForStudent: studentProcedure
    .input(z.object({ 
      id: z.string(),
      assignmentId: z.string().optional(), // Specific assignment to use for dates/access
    }))
    .query(async ({ ctx, input }) => {
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;
      const now = new Date();

      // Get student's groups
      const groupMembers = await ctx.prisma.groupMember.findMany({
        where: { studentId },
        select: { groupId: true },
      });
      const groupIds = groupMembers.map(gm => gm.groupId);

      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: {
                  subject: { select: { id: true, name: true, code: true, color: true } },
                  topic: { select: { id: true, name: true } },
                  answers: {
                    select: {
                      id: true,
                      text: true,
                      textLatex: true,
                      imageUrl: true,
                      imageAlt: true,
                      order: true,
                      label: true,
                      // NOTE: isCorrect is intentionally excluded for active simulations
                    },
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
          assignments: {
            where: input.assignmentId 
              ? { id: input.assignmentId } // Use specific assignment if provided
              : {
                  OR: [
                    { studentId },
                    ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
                  ],
                },
            select: { 
              id: true,
              dueDate: true, 
              notes: true, 
              status: true,
              startDate: true,
              endDate: true,
            },
            take: 1,
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Check access using helper
      if (!hasSimulationAccess(simulation, ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso a questa simulazione' });
      }

      // Get relevant assignment (direct assignment takes priority)
      const assignment = simulation.assignments[0];

      // Check if assignment is closed
      if (assignment?.status === 'CLOSED') {
        // Allow access only if they have a completed result (to view stats)
        const hasCompletedResult = await ctx.prisma.simulationResult.findFirst({
          where: { 
            simulationId: input.id, 
            studentId,
            completedAt: { not: null },
          },
        });
        
        if (!hasCompletedResult) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Questa simulazione è stata chiusa e non è più disponibile' 
          });
        }
      }

      // Use assignment dates if available, otherwise use simulation dates
      const effectiveStartDate = assignment?.startDate || simulation.startDate;
      const effectiveEndDate = assignment?.endDate || simulation.endDate;
      
      const isAssignmentActive = assignment?.status === 'ACTIVE';
      
      // For Virtual Room simulations, check if staff has opened the room
      const hasActiveVirtualRoom = simulation.accessType === 'ROOM' && assignment?.id
        ? !!(await ctx.prisma.simulationSession.findFirst({
            where: { assignmentId: assignment.id, status: { in: ['WAITING', 'STARTED'] } },
          }))
        : false;
      
      // Check date access using helper
      const dateAccess = checkSimulationDateAccess(
        effectiveStartDate,
        effectiveEndDate,
        now,
        isAssignmentActive,
        hasActiveVirtualRoom
      );
      if (!dateAccess.allowed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: dateAccess.errorMessage ?? 'Accesso non consentito' });
      }

      // Check attempts - filter by assignmentId if provided
      const existingResults = await ctx.prisma.simulationResult.findMany({
        where: { 
          simulationId: input.id, 
          studentId,
          ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
        },
        orderBy: { startedAt: 'desc' },
      });

      const completedAttempts = existingResults.filter(r => r.completedAt).length;
      const inProgressAttempt = existingResults.find(r => !r.completedAt);

      // Check attempt limits using helper
      const attemptCheck = checkAttemptLimits(
        completedAttempts,
        !!inProgressAttempt,
        simulation.isRepeatable,
        simulation.maxAttempts
      );
      if (!attemptCheck.allowed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: attemptCheck.errorMessage ?? 'Tentativi esauriti' });
      }

      // Randomize if needed
      let questions = simulation.questions;
      if (simulation.randomizeOrder) {
        questions = secureShuffleArray(questions);
      }

      if (simulation.randomizeAnswers) {
        questions = questions.map(sq => ({
          ...sq,
          question: {
            ...sq.question,
            answers: secureShuffleArray(sq.question.answers),
          },
        }));
      }

      return {
        ...simulation,
        questions,
        completedAttempts,
        hasInProgressAttempt: !!inProgressAttempt,
        inProgressAttemptId: inProgressAttempt?.id,
        dueDate: simulation.assignments[0]?.dueDate ?? null,
      };
    }),

  // Start simulation attempt
  startAttempt: studentProcedure
    .input(z.object({ 
      simulationId: z.string(),
      assignmentId: z.string().optional(), // Specific assignment for this attempt
    }))
    .mutation(async ({ ctx, input }) => {
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;

      // Get student's groups
      const groupMembers = await ctx.prisma.groupMember.findMany({
        where: { studentId },
        select: { groupId: true },
      });
      const groupIds = groupMembers.map(gm => gm.groupId);

      // Check simulation exists and is accessible
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          isRepeatable: true,
          maxAttempts: true,
          totalQuestions: true,
          assignments: {
            where: {
              // If assignmentId is provided, get that specific assignment
              // Otherwise, get any assignment for this student/groups
              ...(input.assignmentId 
                ? { id: input.assignmentId }
                : {
                    OR: [
                      { studentId },
                      ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
                    ],
                  }
              ),
            },
            select: { 
              id: true,
              status: true,
              startDate: true,
              endDate: true,
            },
            take: 1,
          },
        },
      });

      if (!simulation?.status || simulation.status !== 'PUBLISHED') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non disponibile' });
      }

      // Check if assignment is closed
      const assignment = simulation.assignments[0];
      const assignmentId = assignment?.id || null;
      
      if (assignment?.status === 'CLOSED') {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Questa simulazione è stata chiusa e non puoi più accedervi' 
        });
      }

      // For Virtual Room simulations, check if there's an active STARTED session
      const hasActiveVirtualRoomSession = await checkActiveVirtualRoomSession(
        ctx.prisma,
        input.simulationId,
        assignmentId,
        studentId,
        assignment?.status
      );
      
      // Use assignment dates if available
      const effectiveStartDate = assignment?.startDate || simulation.startDate;
      const effectiveEndDate = assignment?.endDate || simulation.endDate;

      // Check dates UNLESS student is in an active Virtual Room session
      if (!hasActiveVirtualRoomSession) {
        const dateAccess = checkSimulationDateAccess(effectiveStartDate, effectiveEndDate, new Date(), false, false);
        if (!dateAccess.allowed) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: dateAccess.errorMessage ?? 'Accesso non consentito' });
        }
      }

      // Check existing attempts FOR THIS SPECIFIC ASSIGNMENT
      const existingResults = await ctx.prisma.simulationResult.findMany({
        where: { 
          simulationId: input.simulationId, 
          studentId,
          assignmentId: assignmentId,
        },
        select: {
          id: true,
          completedAt: true,
          startedAt: true,
          answers: true,
          durationSeconds: true,
        },
      });

      // Handle existing attempts (invalidation, etc.)
      const { inProgressAttempt, completedAttempts } = await handleExistingAttempts(
        ctx.prisma,
        existingResults,
        assignmentId,
        studentId
      );

      // Return existing in-progress attempt (if still valid)
      if (inProgressAttempt) {
        // Parse saved answers using helper
        const savedProgress = parseSavedProgress(inProgressAttempt.answers);

        return { 
          resultId: inProgressAttempt.id, 
          resumed: true,
          savedTimeSpent: inProgressAttempt.durationSeconds || 0,
          savedAnswers: savedProgress.savedAnswers,
          savedSectionTimes: savedProgress.savedSectionTimes,
          savedCurrentSectionIndex: savedProgress.savedCurrentSectionIndex,
        };
      }

      // Check if can start new attempt
      if (!simulation.isRepeatable && completedAttempts > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Simulazione già completata' });
      }

      if (simulation.maxAttempts && completedAttempts >= simulation.maxAttempts) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tentativi esauriti' });
      }

      // Create new attempt with assignmentId
      const result = await ctx.prisma.simulationResult.create({
        data: {
          simulation: { connect: { id: input.simulationId } },
          student: { connect: { id: studentId } },
          ...(assignmentId && { assignment: { connect: { id: assignmentId } } }),
          totalQuestions: simulation.totalQuestions,
          answers: [],
        },
      });

      return { resultId: result.id, resumed: false };
    }),

  // Save progress (partial save)
  saveProgress: studentProcedure
    .input(z.object({
      resultId: z.string(),
      answers: z.array(z.object({
        questionId: z.string(),
        answerId: z.string().nullable().optional(),
        answerText: z.string().nullable().optional(),
        timeSpent: z.number().optional(),
        flagged: z.boolean().optional(),
      })),
      timeSpent: z.number().int().min(0),
      // TOLC section progress
      sectionTimes: z.record(z.number()).optional(),
      currentSectionIndex: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { resultId, answers, timeSpent, sectionTimes, currentSectionIndex } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);

      const result = await ctx.prisma.simulationResult.findUnique({
        where: { id: resultId },
        select: { studentId: true, completedAt: true },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tentativo non trovato' });
      }

      if (result.studentId !== student.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non autorizzato' });
      }

      if (result.completedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tentativo già completato' });
      }

      // Prepare answers with section progress metadata
      const answersWithMeta = {
        items: answers,
        sectionTimes: sectionTimes || {},
        currentSectionIndex: currentSectionIndex ?? 0,
      };

      await ctx.prisma.simulationResult.update({
        where: { id: resultId },
        data: {
          answers: answersWithMeta as unknown as Prisma.JsonArray,
          durationSeconds: timeSpent,
        },
      });

      return { success: true };
    }),

  // Submit simulation (final)
  submit: studentProcedure
    .input(submitSimulationSchema)
    .mutation(async ({ ctx, input }) => {
      const { simulationId, answers, totalTimeSpent } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;

      // Get simulation with questions (include type, subject and keywords for OPEN_TEXT handling)
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: simulationId },
        include: {
          questions: {
            include: {
              question: {
                include: { 
                  answers: true,
                  keywords: true, // Include keywords relation for OPEN_TEXT validation
                  subject: { select: { name: true } }, // Include subject for subjectScores calculation
                },
              },
            },
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Get or create simulation result using helper
      const result = await getOrCreateSimulationResult(
        ctx.prisma,
        simulationId,
        studentId,
        simulation.totalQuestions,
        simulation.isRepeatable
      );

      // Calculate scores using helper
      const scoringResult = calculateSubmissionScores(
        simulation.questions as unknown as SimulationQuestionWithDetails[],
        answers.map(a => ({ ...a, questionId: a.questionId ?? '' })),
        {
          useQuestionPoints: simulation.useQuestionPoints,
          correctPoints: simulation.correctPoints,
          wrongPoints: simulation.wrongPoints,
          blankPoints: simulation.blankPoints,
        }
      );

      // Count pending open answers (isCorrect === null with text)
      const pendingOpenCount = scoringResult.evaluatedAnswers.filter(a => 
        a.isCorrect === null && a.answerText && a.answerText.trim().length > 0
      ).length;

      // Update result with subjectScores for per-subject statistics
      const updatedResult = await ctx.prisma.simulationResult.update({
        where: { id: result.id },
        data: {
          answers: scoringResult.evaluatedAnswers as unknown as Prisma.JsonArray,
          totalScore: scoringResult.totalScore,
          percentageScore: simulation.maxScore ? (scoringResult.totalScore / simulation.maxScore) * 100 : 0,
          correctAnswers: scoringResult.correctCount,
          wrongAnswers: scoringResult.wrongCount,
          blankAnswers: scoringResult.blankCount,
          pendingOpenAnswers: pendingOpenCount,
          durationSeconds: totalTimeSpent,
          completedAt: new Date(),
          subjectScores: Object.keys(scoringResult.subjectScores).length > 0 ? scoringResult.subjectScores : undefined,
        },
      });

      // Create OpenAnswerSubmission records only if staff correction is required
      let openAnswersCount = 0;
      if (!simulation.showCorrectAnswers) {
        const openAnswersToCreate = buildOpenAnswerSubmissions(
          simulation.questions as unknown as SimulationQuestionWithDetails[],
          answers.map(a => ({ ...a, questionId: a.questionId ?? '' })),
          studentId,
          result.id
        );
        
        if (openAnswersToCreate.length > 0) {
          await ctx.prisma.openAnswerSubmission.createMany({
            data: openAnswersToCreate,
          });
          await ctx.prisma.simulationResult.update({
            where: { id: result.id },
            data: { pendingOpenAnswers: openAnswersToCreate.length },
          });
        }
        openAnswersCount = openAnswersToCreate.length;
      }

      // Notify staff about completion (background, don't block response)
      notificationService.notifySimulationCompletedByStudent(ctx.prisma, {
        simulationId: simulation.id,
        simulationTitle: simulation.title,
        studentName: ctx.user.name,
        hasOpenAnswers: openAnswersCount > 0,
        openAnswersCount: openAnswersCount > 0 ? openAnswersCount : undefined,
      }).catch(err => {
        console.error('[Simulations] Failed to send completion notification:', err);
      });

      // Return results if allowed
      if (simulation.showResults) {
        return {
          resultId: updatedResult.id,
          score: scoringResult.totalScore,
          maxScore: simulation.maxScore,
          correctCount: scoringResult.correctCount,
          wrongCount: scoringResult.wrongCount,
          blankCount: scoringResult.blankCount,
          totalQuestions: simulation.totalQuestions,
          passed: simulation.passingScore ? scoringResult.totalScore >= simulation.passingScore : null,
          showCorrectAnswers: simulation.showCorrectAnswers,
          answers: simulation.showCorrectAnswers ? scoringResult.evaluatedAnswers : undefined,
        };
      }

      return {
        resultId: updatedResult.id,
        message: 'Simulazione completata. I risultati saranno disponibili dopo la chiusura.',
      };
    }),

  // Self-correct open answer (student can mark their own open answer as correct/incorrect)
  // Only works when simulation.showCorrectAnswers = true (self-correction mode)
  selfCorrectOpenAnswer: studentProcedure
    .input(z.object({
      resultId: z.string(),
      questionId: z.string(),
      isCorrect: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { resultId, questionId, isCorrect } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);

      // Get the result
      const result = await ctx.prisma.simulationResult.findUnique({
        where: { id: resultId },
        include: {
          simulation: {
            select: {
              showCorrectAnswers: true,
              correctPoints: true,
              wrongPoints: true,
              blankPoints: true,
              useQuestionPoints: true,
              createdById: true,
              type: true,
            },
          },
        },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Risultato non trovato' });
      }

      // Verify ownership: student can only self-correct their own results
      if (result.studentId !== student.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non puoi correggere questo risultato' });
      }

      // Verify self-correction is enabled (showCorrectAnswers must be true)
      if (!result.simulation.showCorrectAnswers) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'L\'autocorrezione non è abilitata per questa simulazione' 
        });
      }

      // Get current answers
      const currentAnswers = result.answers as Array<{
        questionId: string;
        answerId: string | null;
        answerText: string | null;
        isCorrect: boolean | null;
        earnedPoints: number;
        timeSpent: number;
      }>;

      // Find the answer to update
      const answerIndex = currentAnswers.findIndex(a => a.questionId === questionId);
      if (answerIndex === -1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Risposta non trovata' });
      }

      const answer = currentAnswers[answerIndex];
      
      // Only allow correcting answers that are pending (isCorrect === null) or already corrected
      // and have text (open questions with answers)
      if (!answer.answerText || answer.answerText.trim().length === 0) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Questa domanda non ha una risposta aperta da correggere' 
        });
      }

      // Get question to calculate points
      const question = await ctx.prisma.question.findUnique({
        where: { id: questionId },
        select: { points: true, negativePoints: true },
      });

      const points = result.simulation.useQuestionPoints && question
        ? question.points
        : result.simulation.correctPoints;

      // Calculate point difference
      const oldPoints = answer.earnedPoints;
      const newPoints = isCorrect ? points : 0; // If wrong, no points (not negative for self-practice)
      const pointDifference = newPoints - oldPoints;

      // Update the answer
      currentAnswers[answerIndex] = {
        ...answer,
        isCorrect,
        earnedPoints: newPoints,
      };

      // Calculate new counts using helper
      const deltas = calculateSelfCorrectionDeltas(isCorrect, answer.isCorrect);

      // Update result
      await ctx.prisma.simulationResult.update({
        where: { id: resultId },
        data: {
          answers: currentAnswers as Prisma.JsonArray,
          totalScore: (result.totalScore ?? 0) + pointDifference,
          correctAnswers: (result.correctAnswers ?? 0) + deltas.correctDelta,
          wrongAnswers: (result.wrongAnswers ?? 0) + deltas.wrongDelta,
          pendingOpenAnswers: Math.max(0, (result.pendingOpenAnswers ?? 0) + deltas.pendingDelta),
        },
      });

      return {
        success: true,
        newScore: (result.totalScore ?? 0) + pointDifference,
        correctAnswers: (result.correctAnswers ?? 0) + deltas.correctDelta,
        wrongAnswers: (result.wrongAnswers ?? 0) + deltas.wrongDelta,
      };
    }),

  // Get detailed result for review (students can view their own, staff can view any)
  getResultDetails: protectedProcedure
    .input(z.object({ 
      resultId: z.string().optional(),
      simulationId: z.string().optional(),
    }).refine(data => data.resultId || data.simulationId, {
      message: 'Devi specificare resultId o simulationId'
    }))
    .query(async ({ ctx, input }) => {
      const isStaff = ctx.user.role === 'ADMIN' || ctx.user.role === 'COLLABORATOR';
      
      let result;
      
      if (input.resultId) {
        // Find by resultId
        result = await ctx.prisma.simulationResult.findUnique({
          where: { id: input.resultId },
          include: {
            simulation: {
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                isOfficial: true,
                maxScore: true,
                passingScore: true,
                totalQuestions: true,
                correctPoints: true,
                wrongPoints: true,
                blankPoints: true,
                showCorrectAnswers: true,
                allowReview: true,
                isRepeatable: true,
              },
            },
            student: {
              select: { 
                id: true,
                userId: true,
              },
            },
          },
        });
      } else if (input.simulationId) {
        // Find by simulationId - get the latest completed result for this student/user
        const whereClause: {
          simulationId: string;
          completedAt: { not: null };
          student?: { userId: string };
        } = { 
          simulationId: input.simulationId,
          completedAt: { not: null }, // Completed results have completedAt set
        };
        
        // Students can only see their own results
        if (!isStaff) {
          whereClause.student = { userId: ctx.user.id };
        }
        
        result = await ctx.prisma.simulationResult.findFirst({
          where: whereClause,
          orderBy: { completedAt: 'desc' },
          include: {
            simulation: {
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                isOfficial: true,
                maxScore: true,
                passingScore: true,
                totalQuestions: true,
                correctPoints: true,
                wrongPoints: true,
                blankPoints: true,
                showCorrectAnswers: true,
                allowReview: true,
                isRepeatable: true,
              },
            },
            student: {
              select: { 
                id: true,
                userId: true,
              },
            },
          },
        });
      }

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Risultato non trovato' });
      }

      // Verify access: staff can see any result, students only their own
      if (!isStaff && result.student.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso a questo risultato' });
      }

      // Calculate maxScore if not set (for backwards compatibility)
      const effectiveMaxScore = result.simulation.maxScore && result.simulation.maxScore > 0
        ? result.simulation.maxScore
        : (result.simulation.totalQuestions ?? 0) * (result.simulation.correctPoints ?? 1.5);

      // Check if review is allowed
      if (!result.simulation.allowReview) {
        return {
          id: result.id,
          simulation: result.simulation,
          score: result.totalScore ?? 0,
          totalScore: effectiveMaxScore,
          correctAnswers: result.correctAnswers ?? 0,
          wrongAnswers: result.wrongAnswers ?? 0,
          blankAnswers: result.blankAnswers ?? 0,
          pendingOpenAnswers: result.pendingOpenAnswers ?? 0,
          timeSpent: result.durationSeconds ?? 0,
          passed: result.simulation.passingScore 
            ? (result.totalScore ?? 0) >= result.simulation.passingScore 
            : null,
          answers: [],
          canReview: false,
        };
      }

      // Get question details for review
      const answersData = result.answers as Array<{
        questionId: string;
        answerId: string | null;
        answerText: string | null;
        isCorrect: boolean | null;
        earnedPoints: number;
        timeSpent: number;
      }>;

      // Fetch all questions with their answers
      const questionIds = answersData.map(a => a.questionId);
      const questions = await ctx.prisma.question.findMany({
        where: { id: { in: questionIds } },
        include: {
          answers: {
            select: {
              id: true,
              text: true,
              textLatex: true,
              isCorrect: result.simulation.showCorrectAnswers,
            },
          },
          subject: { select: { name: true, color: true } },
          topic: { select: { name: true } },
        },
      });

      // Build answers with question details
      const detailedAnswers = answersData.map(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        return {
          id: answer.questionId,
          question: {
            id: question?.id || '',
            text: question?.text || '',
            textLatex: question?.textLatex || null,
            subject: question?.subject?.name || 'UNKNOWN',
            subjectColor: question?.subject?.color || null,
            explanation: question?.generalExplanation || question?.correctExplanation || null,
            answers: question?.answers || [],
          },
          selectedAnswerId: answer.answerId,
          answerText: answer.answerText, // Include text answer for open questions
          isCorrect: answer.isCorrect, // Can be null for pending open answers
          earnedPoints: answer.earnedPoints,
          timeSpent: answer.timeSpent,
        };
      });

      return {
        id: result.id, // Result ID for self-correction mutations
        simulation: result.simulation,
        score: result.totalScore ?? 0,
        totalScore: effectiveMaxScore,
        correctAnswers: result.correctAnswers ?? 0,
        wrongAnswers: result.wrongAnswers ?? 0,
        blankAnswers: result.blankAnswers ?? 0,
        pendingOpenAnswers: result.pendingOpenAnswers ?? 0,
        timeSpent: result.durationSeconds ?? 0,
        passed: result.simulation.passingScore 
          ? (result.totalScore ?? 0) >= result.simulation.passingScore 
          : null,
        answers: detailedAnswers,
        canReview: true,
      };
    }),

  // Get student's results
  getMyResults: studentProcedure
    .input(z.object({
      simulationId: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { simulationId, page, pageSize } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;

      const where: Prisma.SimulationResultWhereInput = {
        studentId,
        completedAt: { not: null },
      };

      if (simulationId) where.simulationId = simulationId;

      const total = await ctx.prisma.simulationResult.count({ where });

      const results = await ctx.prisma.simulationResult.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { completedAt: 'desc' },
        include: {
          simulation: {
            select: {
              id: true,
              title: true,
              type: true,
              isOfficial: true,
              maxScore: true,
              passingScore: true,
              totalQuestions: true,
              showCorrectAnswers: true,
              allowReview: true,
            },
          },
        },
      });

      return {
        results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // ==================== QUICK QUIZ ====================

  // Generate quick quiz (for students)
  generateQuickQuiz: studentProcedure
    .input(quickQuizConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { subjectIds, topicIds, difficulty, questionCount, durationMinutes, correctPoints, wrongPoints, showResultsImmediately, showCorrectAnswers } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);

      // Build question selection criteria
      const where: Prisma.QuestionWhereInput = {
        subjectId: { in: subjectIds },
        status: 'PUBLISHED',
      };

      if (topicIds && topicIds.length > 0) {
        where.topicId = { in: topicIds };
      }

      if (difficulty !== 'MIXED') {
        where.difficulty = difficulty;
      }

      // Get questions
      const questions = await ctx.prisma.question.findMany({
        where,
        select: { id: true },
        take: questionCount * 3,
      });

      if (questions.length < questionCount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Non ci sono abbastanze domande (disponibili: ${questions.length}, richieste: ${questionCount})`,
        });
      }

      // Shuffle using secure shuffle and select
      const shuffled = secureShuffleArray(questions);
      const selected = shuffled.slice(0, questionCount);

      // Create simulation
      const simulation = await ctx.prisma.simulation.create({
        data: {
          title: `Quiz Veloce - ${new Date().toLocaleDateString('it-IT')}`,
          type: 'QUICK_QUIZ',
          status: 'PUBLISHED',
          visibility: 'PRIVATE',
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: 'STUDENT',
          isOfficial: false,
          durationMinutes,
          totalQuestions: questionCount,
          showResults: showResultsImmediately,
          showCorrectAnswers,
          allowReview: true,
          randomizeOrder: true,
          randomizeAnswers: true,
          correctPoints,
          wrongPoints,
          blankPoints: 0,
          isRepeatable: false,
          questions: {
            create: selected.map((q, i) => ({
              question: { connect: { id: q.id } },
              order: i,
            })),
          },
          assignments: {
            create: {
              student: { connect: { id: student.id } },
              assignedBy: { connect: { id: ctx.user.id } },
            },
          },
        },
      });

      return { simulationId: simulation.id };
    }),

  // Create self-practice exercise (student)
  createSelfPractice: studentProcedure
    .input(z.object({
      questionIds: z.array(z.string()).min(1, 'Seleziona almeno una domanda'),
      durationMinutes: z.number().int().min(0).default(0),
      includeOpenQuestions: z.boolean().default(false),
      openQuestionCorrection: z.enum(['self', 'staff']).default('self'),
      requestCorrectionFromId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { questionIds, durationMinutes, includeOpenQuestions, openQuestionCorrection, requestCorrectionFromId } = input;

      // Validate questions exist
      const questions = await ctx.prisma.question.findMany({
        where: {
          id: { in: questionIds },
          status: 'PUBLISHED',
        },
        include: {
          subject: true,
        },
      });

      if (questions.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nessuna domanda valida trovata',
        });
      }

      // Filter out open questions if not requested
      let finalQuestions = questions;
      if (!includeOpenQuestions) {
        finalQuestions = questions.filter(q => q.type !== 'OPEN_TEXT');
      }

      if (finalQuestions.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nessuna domanda disponibile con i criteri selezionati',
        });
      }

      // Validate staff member if correction requested
      if (openQuestionCorrection === 'staff' && requestCorrectionFromId) {
        const staffMember = await ctx.prisma.user.findFirst({
          where: {
            id: requestCorrectionFromId,
            role: { in: ['ADMIN', 'COLLABORATOR'] },
            isActive: true,
          },
        });

        if (!staffMember) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Docente selezionato non valido',
          });
        }
      }

      // Get main subject from most common subject in questions
      const subjectCounts = finalQuestions.reduce((acc, q) => {
        if (q.subject) {
          acc[q.subject.name] = (acc[q.subject.name] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const uniqueSubjects = Object.keys(subjectCounts);
      
      // Determine title based on subject distribution
      let titleSubject: string;
      if (uniqueSubjects.length === 0) {
        titleSubject = 'Varie';
      } else if (uniqueSubjects.length === 1) {
        titleSubject = uniqueSubjects[0];
      } else if (uniqueSubjects.length >= 4) {
        // If 4 or more subjects, consider it "all subjects"
        titleSubject = 'Multi-materia';
      } else {
        // 2-3 subjects: show most common one
        const sortedSubjects = Object.entries(subjectCounts).toSorted((a, b) => b[1] - a[1]);
        const mainSubject = sortedSubjects[0]?.[0];
        titleSubject = mainSubject || 'Varie';
      }

      // Create simulation
      const simulation = await ctx.prisma.simulation.create({
        data: {
          title: `Autoesercitazione ${titleSubject} - ${new Date().toLocaleDateString('it-IT')}`,
          description: `Esercitazione autogenerata con ${finalQuestions.length} domande.${
            openQuestionCorrection === 'staff' ? ' Correzione domande aperte richiesta a docente.' : ''
          }`,
          type: 'QUICK_QUIZ',
          status: 'PUBLISHED',
          visibility: 'PRIVATE',
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: 'STUDENT',
          isOfficial: false,
          durationMinutes,
          totalQuestions: finalQuestions.length,
          showResults: true,
          showCorrectAnswers: openQuestionCorrection === 'self',
          allowReview: true,
          randomizeOrder: true,
          randomizeAnswers: true,
          correctPoints: 1,
          wrongPoints: 0,
          blankPoints: 0,
          isRepeatable: true,
          maxAttempts: null,
          questions: {
            create: finalQuestions.map((q, i) => ({
              question: { connect: { id: q.id } },
              order: i,
            })),
          },
          // NO assignments - self-practice simulations don't need assignments
        },
        include: {
          questions: {
            include: {
              question: {
                select: {
                  id: true,
                  type: true,
                },
              },
            },
          },
        },
      });

      // Count open questions for notification
      const openQuestionsCount = simulation.questions.filter(
        q => q.question.type === 'OPEN_TEXT'
      ).length;

      // If correction requested from staff, create notification for the specific staff member
      if (openQuestionCorrection === 'staff' && requestCorrectionFromId && openQuestionsCount > 0) {
        // Get the current user's name for the notification
        const student = await ctx.prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: { name: true },
        });

        await notificationService.notifyOpenAnswerCorrectionRequest(ctx.prisma, {
          staffUserId: requestCorrectionFromId,
          simulationId: simulation.id,
          simulationTitle: simulation.title,
          studentName: student?.name || 'Uno studente',
          openQuestionsCount,
        }).catch(err => {
          // Log but don't fail the mutation if notification fails
          console.error('[Simulations] Failed to notify staff for correction request:', err);
        });
      }

      return { 
        id: simulation.id,
        hasOpenQuestions: simulation.questions.some(q => q.question.type === 'OPEN_TEXT'),
      };
    }),

  // ==================== STATISTICS ====================

  // Get simulation statistics (admin/staff)
  getStatistics: staffProcedure
    .input(z.object({ simulationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        select: { createdById: true, passingScore: true },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso alle statistiche' });
      }

      const results = await ctx.prisma.simulationResult.findMany({
        where: { simulationId: input.simulationId, completedAt: { not: null } },
        select: {
          totalScore: true,
          correctAnswers: true,
          wrongAnswers: true,
          blankAnswers: true,
          durationSeconds: true,
        },
      });

      if (results.length === 0) {
        return {
          totalAttempts: 0,
          averageScore: 0,
          maxScore: 0,
          minScore: 0,
          averageCorrect: 0,
          averageWrong: 0,
          averageBlank: 0,
          averageTime: 0,
          passRate: 0,
        };
      }

      const scores = results.map(r => r.totalScore ?? 0);
      const correctCounts = results.map(r => r.correctAnswers ?? 0);
      const wrongCounts = results.map(r => r.wrongAnswers ?? 0);
      const blankCounts = results.map(r => r.blankAnswers ?? 0);
      const times = results.map(r => r.durationSeconds ?? 0);

      // Calculate pass rate if passingScore is set
      const passRate = simulation.passingScore 
        ? results.filter(r => (r.totalScore ?? 0) >= simulation.passingScore).length / results.length * 100
        : 0;

      return {
        totalAttempts: results.length,
        averageScore: scores.reduce((a, b) => a + b, 0) / results.length,
        maxScore: Math.max(...scores),
        minScore: Math.min(...scores),
        averageCorrect: correctCounts.reduce((a, b) => a + b, 0) / results.length,
        averageWrong: wrongCounts.reduce((a, b) => a + b, 0) / results.length,
        averageBlank: blankCounts.reduce((a, b) => a + b, 0) / results.length,
        averageTime: times.reduce((a, b) => a + b, 0) / results.length,
        passRate,
      };
    }),

  // Get detailed question-level analysis for a simulation
  getQuestionAnalysis: staffProcedure
    .input(z.object({ simulationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: {
                  subject: { select: { id: true, name: true, code: true, color: true } },
                  topic: { select: { id: true, name: true } },
                  answers: { orderBy: { order: 'asc' } },
                },
              },
            },
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso a questa analisi' });
      }

      // Get all completed results with answers
      const results = await ctx.prisma.simulationResult.findMany({
        where: { simulationId: input.simulationId, completedAt: { not: null } },
        select: {
          id: true,
          answers: true,
          totalScore: true,
          percentageScore: true,
          durationSeconds: true,
          student: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });

      if (results.length === 0) {
        return {
          simulation: {
            id: simulation.id,
            title: simulation.title,
            totalQuestions: simulation.totalQuestions,
            passingScore: simulation.passingScore,
          },
          totalAttempts: 0,
          questionAnalysis: [],
          subjectBreakdown: [],
        };
      }

      // Build question analysis
      type AnswerData = {
        questionId: string;
        answerId: string | null;
        isCorrect: boolean;
        timeSpent?: number;
      };

      // Create a map of answerId to letter label for each question
      const answerIdToLetter = new Map<string, string>();
      simulation.questions.forEach(sq => {
        sq.question.answers.forEach((a, i) => {
          answerIdToLetter.set(a.id, String.fromCodePoint(65 + i));
        });
      });

      const questionStats = new Map<string, {
        questionId: string;
        order: number;
        text: string;
        subject: { id: string; name: string; code: string; color: string } | null;
        topic: { id: string; name: string } | null;
        correctAnswer: string;
        answers: Array<{ label: string; text: string; isCorrect: boolean }>;
        totalAnswers: number;
        correctCount: number;
        wrongCount: number;
        blankCount: number;
        answerDistribution: Record<string, number>;
        totalTimeSpent: number;
        timeSpentCount: number;
      }>();

      // Initialize stats for each question
      simulation.questions.forEach((sq, idx) => {
        const correctAnswerObj = sq.question.answers.find(a => a.isCorrect);
        const correctAnswerLetter = correctAnswerObj 
          ? String.fromCodePoint(65 + sq.question.answers.indexOf(correctAnswerObj)) 
          : '';

        // Build answers array with letter labels
        const answersWithLabels = sq.question.answers.map((a, i) => ({
          label: String.fromCodePoint(65 + i), // A, B, C, D, E
          text: a.text,
          isCorrect: a.isCorrect,
        }));

        questionStats.set(sq.questionId, {
          questionId: sq.questionId,
          order: idx + 1,
          text: sq.question.text,
          subject: sq.question.subject,
          topic: sq.question.topic,
          correctAnswer: correctAnswerLetter,
          answers: answersWithLabels,
          totalAnswers: 0,
          correctCount: 0,
          wrongCount: 0,
          blankCount: 0,
          answerDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0, BLANK: 0 },
          totalTimeSpent: 0,
          timeSpentCount: 0,
        });
      });

      // Process each result
      results.forEach(result => {
        const answers = result.answers as AnswerData[];
        if (!Array.isArray(answers)) return;

        answers.forEach(answerData => {
          const stats = questionStats.get(answerData.questionId);
          if (!stats) return;

          stats.totalAnswers++;
          
          // Check if answer is blank (no answerId)
          if (answerData.answerId) {
            // Get the letter label for this answerId
            const answerLetter = answerIdToLetter.get(answerData.answerId) || 'UNKNOWN';
            
            if (answerData.isCorrect) {
              stats.correctCount++;
              stats.answerDistribution[answerLetter] = 
                (stats.answerDistribution[answerLetter] || 0) + 1;
            } else {
              stats.wrongCount++;
              stats.answerDistribution[answerLetter] = 
                (stats.answerDistribution[answerLetter] || 0) + 1;
            }
          } else {
            stats.blankCount++;
            stats.answerDistribution['BLANK']++;
          }

          if (typeof answerData.timeSpent === 'number' && answerData.timeSpent > 0) {
            stats.totalTimeSpent += answerData.timeSpent;
            stats.timeSpentCount++;
          }
        });
      });

      // Convert to array and calculate percentages
      const questionAnalysis = Array.from(questionStats.values()).map(stats => ({
        ...stats,
        correctRate: stats.totalAnswers > 0 
          ? (stats.correctCount / stats.totalAnswers) * 100 
          : 0,
        wrongRate: stats.totalAnswers > 0 
          ? (stats.wrongCount / stats.totalAnswers) * 100 
          : 0,
        blankRate: stats.totalAnswers > 0 
          ? (stats.blankCount / stats.totalAnswers) * 100 
          : 0,
        averageTimeSpent: stats.timeSpentCount > 0 
          ? stats.totalTimeSpent / stats.timeSpentCount 
          : 0,
      }));

      // Calculate subject breakdown
      const subjectStats = new Map<string, {
        subject: { id: string; name: string; code: string; color: string };
        totalQuestions: number;
        totalCorrect: number;
        totalWrong: number;
        totalBlank: number;
      }>();

      questionAnalysis.forEach(q => {
        if (!q.subject) return;
        
        if (!subjectStats.has(q.subject.id)) {
          subjectStats.set(q.subject.id, {
            subject: q.subject,
            totalQuestions: 0,
            totalCorrect: 0,
            totalWrong: 0,
            totalBlank: 0,
          });
        }

        const stats = subjectStats.get(q.subject.id);
        if (stats) {
          stats.totalQuestions++;
          stats.totalCorrect += q.correctCount;
          stats.totalWrong += q.wrongCount;
          stats.totalBlank += q.blankCount;
        }
      });

      const subjectBreakdown = Array.from(subjectStats.values()).map(stats => ({
        ...stats,
        correctRate: (stats.totalCorrect + stats.totalWrong + stats.totalBlank) > 0
          ? (stats.totalCorrect / (stats.totalCorrect + stats.totalWrong + stats.totalBlank)) * 100
          : 0,
      }));

      return {
        simulation: {
          id: simulation.id,
          title: simulation.title,
          totalQuestions: simulation.totalQuestions,
          passingScore: simulation.passingScore,
        },
        totalAttempts: results.length,
        questionAnalysis,
        subjectBreakdown,
      };
    }),

  // Get all assignments with full details (for the assignments view)
  getAssignments: staffProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      simulationId: z.string().optional(),
      groupId: z.string().optional(),
      completionStatus: z.enum(['PENDING', 'COMPLETED', 'ALL']).default('ALL'),
      assignmentStatus: z.enum(['ACTIVE', 'CLOSED', 'ALL']).default('ALL'),
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, simulationId, groupId, completionStatus, assignmentStatus } = input;
      const skip = (page - 1) * pageSize;

      // Build where clause
      const where: Prisma.SimulationAssignmentWhereInput = {};

      // Note: Collaborators can now see ALL assignments (not filtered by creator)
      // but they can only take actions on assignments they created (enforced in frontend)

      // Exclude assignments for simulations created by students (self-practice)
      where.simulation = {
        creatorRole: { not: 'STUDENT' },
      };

      if (simulationId) {
        where.simulationId = simulationId;
      }

      if (groupId) {
        where.groupId = groupId;
      }

      // Filter by assignment status (ACTIVE/CLOSED)
      if (assignmentStatus !== 'ALL') {
        where.status = assignmentStatus;
      }

      // Get total count
      const total = await ctx.prisma.simulationAssignment.count({ where });

      // Get assignments with related data
      const assignments = await ctx.prisma.simulationAssignment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { assignedAt: 'desc' },
        include: {
          simulation: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              isOfficial: true,
              durationMinutes: true,
              totalQuestions: true,
              startDate: true,
              endDate: true,
              accessType: true,
              createdById: true,
              createdBy: { select: { id: true, name: true } },
              _count: { select: { results: true } },
            },
          },
          student: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          group: {
            select: { id: true, name: true, color: true, _count: { select: { members: true } } },
          },
          assignedBy: { select: { id: true, name: true } },
        },
      });

      // Enrich with completion data if needed
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          let completedCount = 0;
          let totalTargeted = 0;

          if (assignment.studentId) {
            // Single student assignment - count results for this specific assignment
            totalTargeted = 1;
            const result = await ctx.prisma.simulationResult.findFirst({
              where: {
                simulationId: assignment.simulationId,
                studentId: assignment.studentId,
                assignmentId: assignment.id,
              },
              select: { completedAt: true },
            });
            completedCount = result?.completedAt ? 1 : 0;
          } else if (assignment.groupId) {
            // Group assignment - count members and their completions
            const members = await ctx.prisma.groupMember.findMany({
              where: { groupId: assignment.groupId },
              select: { studentId: true },
            });
            totalTargeted = members.length;

            if (members.length > 0) {
              const results = await ctx.prisma.simulationResult.findMany({
                where: {
                  simulationId: assignment.simulationId,
                  studentId: { in: members.map(m => m.studentId) },
                  assignmentId: assignment.id, // Filter by this specific assignment
                  completedAt: { not: null },
                },
                select: { id: true },
              });
              completedCount = results.length;
            }
          }

          return {
            ...assignment,
            completedCount,
            totalTargeted,
            completionRate: totalTargeted > 0 ? (completedCount / totalTargeted) * 100 : 0,
          };
        })
      );

      // Filter by completion status if needed
      let filteredAssignments = enrichedAssignments;
      if (completionStatus === 'COMPLETED') {
        filteredAssignments = enrichedAssignments.filter(a => a.completedCount === a.totalTargeted && a.totalTargeted > 0);
      } else if (completionStatus === 'PENDING') {
        filteredAssignments = enrichedAssignments.filter(a => a.completedCount < a.totalTargeted);
      }

      return {
        assignments: filteredAssignments,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get leaderboard for official simulations
  // Students see their own name but others are anonymized
  // Admin and simulation creator (collaborator) see all names
  getLeaderboard: protectedProcedure
    .input(z.object({ 
      simulationId: z.string(),
      assignmentId: z.string().optional(),
      groupId: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        select: { 
          id: true,
          title: true,
          isOfficial: true,
          maxScore: true,
          passingScore: true,
          totalQuestions: true,
          createdById: true, // For checking if current user is creator
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Determine if current user can see all names
      const userRole = ctx.user?.role;
      const isAdmin = userRole === 'ADMIN';
      const isCollaborator = userRole === 'COLLABORATOR';
      const isCreator = ctx.user?.id === simulation.createdById;
      const canSeeAllNames = isAdmin || isCollaborator || isCreator;
      
      // Get current student's ID if user is a student
      let currentStudentId: string | null = null;
      if (userRole === 'STUDENT' && ctx.user?.student?.id) {
        currentStudentId = ctx.user.student.id;
      }

      // Build where clause for filtering results
      const whereClause: {
        simulationId: string;
        completedAt: { not: null };
        studentId?: string | { in: string[] };
      } = {
        simulationId: input.simulationId,
        completedAt: { not: null }
      };

      // If assignmentId is provided, filter by students in that assignment
      if (input.assignmentId) {
        const assignment = await ctx.prisma.simulationAssignment.findUnique({
          where: { id: input.assignmentId },
          select: { studentId: true },
        });
        if (assignment?.studentId) {
          whereClause.studentId = assignment.studentId;
        }
      }

      // If groupId is provided, filter by students in that group assignment
      if (input.groupId) {
        const groupAssignment = await ctx.prisma.simulationAssignment.findUnique({
          where: { id: input.groupId },
          select: { groupId: true },
        });
        if (groupAssignment?.groupId) {
          const groupMembers = await ctx.prisma.groupMember.findMany({
            where: { 
              groupId: groupAssignment.groupId,
              studentId: { not: null }
            },
            select: { studentId: true },
          });
          const studentIds = groupMembers.map(m => m.studentId).filter((id): id is string => id !== null);
          if (studentIds.length > 0) {
            whereClause.studentId = {
              in: studentIds
            };
          }
        }
      }

      // Get all completed results for this simulation
      const allResults = await ctx.prisma.simulationResult.findMany({
        where: whereClause,
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: [
          { studentId: 'asc' },
          { completedAt: 'desc' }, // Most recent first
        ],
      });

      // Keep only the most recent result for each student
      const studentLatestResults = new Map<string, typeof allResults[0]>();
      for (const result of allResults) {
        if (!studentLatestResults.has(result.studentId)) {
          studentLatestResults.set(result.studentId, result);
        }
      }

      // Convert to array and sort by score
      const results = Array.from(studentLatestResults.values())
        .sort((a, b) => {
          // Sort by score descending
          if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore;
          }
          // Tie-breaker: faster time wins
          return a.durationSeconds - b.durationSeconds;
        })
        .slice(0, input.limit);

      // Calculate rankings with tie handling and anonymization
      const leaderboard = results.map((result, index) => {
        // Check if this score ties with previous
        let rank = index + 1;
        if (index > 0) {
          const prevResult = results[index - 1];
          if (result.totalScore === prevResult.totalScore) {
            // Find the rank of the first person with this score
            const firstWithScore = results.findIndex(r => r.totalScore === result.totalScore);
            rank = firstWithScore + 1;
          }
        }

        // Determine if we should show this student's name
        const isCurrentStudent = result.studentId === currentStudentId;
        const showRealName = canSeeAllNames || isCurrentStudent;
        
        // Generate anonymous name: "Partecipante #X" with some fun adjectives for variety
        const anonymousAdjectives = [
          'Misterioso', 'Brillante', 'Coraggioso', 'Diligente', 'Energico',
          'Fantastico', 'Geniale', 'Intraprendente', 'Laborioso', 'Metodico',
          'Notevole', 'Originale', 'Perseverante', 'Risoluto', 'Tenace'
        ];
        const adjective = anonymousAdjectives[index % anonymousAdjectives.length];
        const anonymousName = `Partecipante ${adjective} #${rank}`;

        return {
          rank,
          studentId: showRealName ? result.studentId : null,
          studentName: showRealName ? result.student.user.name : anonymousName,
          studentEmail: showRealName ? result.student.user.email : null,
          studentMatricola: showRealName && canSeeAllNames ? result.student.matricola : null,
          isCurrentUser: isCurrentStudent,
          totalScore: result.totalScore,
          percentageScore: result.percentageScore,
          correctAnswers: result.correctAnswers,
          wrongAnswers: result.wrongAnswers,
          blankAnswers: result.blankAnswers,
          durationSeconds: result.durationSeconds,
          completedAt: result.completedAt,
          passed: simulation.passingScore 
            ? result.totalScore >= simulation.passingScore 
            : null,
        };
      });

      return {
        simulation: {
          id: simulation.id,
          title: simulation.title,
          isOfficial: simulation.isOfficial,
          maxScore: simulation.maxScore,
          passingScore: simulation.passingScore,
          totalQuestions: simulation.totalQuestions,
        },
        leaderboard,
        totalParticipants: results.length,
        canSeeAllNames, // Let frontend know if user can see all names
      };
    }),

  // ==================== PAPER-BASED RESULTS ====================

  // Create paper-based result for a student (staff only)
  createPaperResult: staffProcedure
    .input(z.object({
      simulationId: z.string().min(1),
      studentId: z.string().min(1),
      answers: z.array(z.object({
        questionId: z.string().min(1),
        answerId: z.string().optional().nullable(),
      })),
      wasPresent: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { simulationId, studentId, answers, wasPresent } = input;

      // Get simulation with questions
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: simulationId },
        include: {
          questions: {
            include: {
              question: {
                include: { answers: true },
              },
            },
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (!simulation.isPaperBased) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Questa funzione è disponibile solo per simulazioni cartacee' 
        });
      }

      // Check student exists
      const student = await ctx.prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Studente non trovato' });
      }

      // Check if result already exists (for paper-based, we don't use assignmentId)
      const existingResult = await ctx.prisma.simulationResult.findFirst({
        where: { 
          simulationId, 
          studentId,
          // For paper-based sims, we typically don't have assignmentId context
        },
      });

      if (existingResult) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: 'Risultato già inserito per questo studente' 
        });
      }

      // If student was not present, create empty result
      if (!wasPresent) {
        const result = await ctx.prisma.simulationResult.create({
          data: {
            simulation: { connect: { id: simulationId } },
            student: { connect: { id: studentId } },
            totalQuestions: simulation.totalQuestions,
            correctAnswers: 0,
            wrongAnswers: 0,
            blankAnswers: simulation.totalQuestions,
            totalScore: 0,
            percentageScore: 0,
            answers: [],
            completedAt: new Date(),
          },
        });

        return { 
          resultId: result.id, 
          wasPresent: false,
          message: 'Studente assente registrato' 
        };
      }

      // Calculate score using helper
      const evaluation = evaluatePaperBasedAnswers(
        simulation.questions,
        answers.map(a => ({ questionId: a.questionId, answerId: a.answerId })),
        simulation
      );

      // Create result
      const result = await ctx.prisma.simulationResult.create({
        data: {
          simulation: { connect: { id: simulationId } },
          student: { connect: { id: studentId } },
          totalQuestions: simulation.totalQuestions,
          correctAnswers: evaluation.correctCount,
          wrongAnswers: evaluation.wrongCount,
          blankAnswers: evaluation.blankCount,
          totalScore: evaluation.totalScore,
          percentageScore: simulation.maxScore ? (evaluation.totalScore / simulation.maxScore) * 100 : 0,
          answers: evaluation.evaluatedAnswers as unknown as Prisma.JsonArray,
          completedAt: new Date(),
        },
      });

      return {
        resultId: result.id,
        wasPresent: true,
        score: evaluation.totalScore,
        maxScore: simulation.maxScore,
        correctCount: evaluation.correctCount,
        wrongCount: evaluation.wrongCount,
        blankCount: evaluation.blankCount,
        passed: simulation.passingScore ? evaluation.totalScore >= simulation.passingScore : null,
      };
    }),

  // Get assigned students for paper-based result entry
  getPaperBasedStudents: staffProcedure
    .input(z.object({ simulationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        include: {
          assignments: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
              group: {
                include: {
                  members: {
                    include: {
                      student: {
                        include: { user: { select: { id: true, name: true, email: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
          results: {
            select: { studentId: true, completedAt: true },
          },
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: {
                  answers: { orderBy: { order: 'asc' } },
                  subject: true,
                },
              },
            },
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Collect all assigned students
      const studentsMap = new Map<string, { 
        id: string; 
        name: string; 
        email: string;
        hasResult: boolean;
      }>();

      for (const assignment of simulation.assignments) {
        // Direct student assignment
        if (assignment.student) {
          const studentId = assignment.student.id;
          studentsMap.set(studentId, {
            id: studentId,
            name: assignment.student.user.name,
            email: assignment.student.user.email,
            hasResult: simulation.results.some(r => r.studentId === studentId),
          });
        }

        // Group assignment
        if (assignment.group) {
          for (const member of assignment.group.members) {
            studentsMap.set(member.student.id, {
              id: member.student.id,
              name: member.student.user.name,
              email: member.student.user.email,
              hasResult: simulation.results.some(r => r.studentId === member.student.id),
            });
          }
        }
      }

      const students = Array.from(studentsMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );

      return {
        simulation: {
          id: simulation.id,
          title: simulation.title,
          totalQuestions: simulation.totalQuestions,
          isPaperBased: simulation.isPaperBased,
        },
        questions: simulation.questions.map((sq, index) => ({
          id: sq.questionId,
          order: index + 1,
          text: stripHtml(sq.question.text).substring(0, 100) + '...',
          subject: sq.question.subject?.name,
          answers: sq.question.answers.map(a => ({
            id: a.id,
            label: a.label || String.fromCodePoint(65 + (a.order || 0)), // A, B, C, D, E
          })),
        })),
        students,
        completedCount: students.filter(s => s.hasResult).length,
        totalStudents: students.length,
      };
    }),

  // ==================== ENHANCED TEMPLATE STATISTICS ====================

  /**
   * Get comprehensive template statistics
   * Includes: score distribution, time analysis, difficulty breakdown, top performers
   */
  getTemplateStatistics: staffProcedure
    .input(z.object({ simulationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        select: {
          id: true,
          title: true,
          createdById: true,
          passingScore: true,
          maxScore: true,
          totalQuestions: true,
          durationMinutes: true,
          correctPoints: true,
          wrongPoints: true,
          blankPoints: true,
          _count: { select: { assignments: true } },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso alle statistiche' });
      }

      // Get all completed results with full details
      const allResults = await ctx.prisma.simulationResult.findMany({
        where: { 
          simulationId: input.simulationId, 
          completedAt: { not: null } 
        },
        select: {
          id: true,
          studentId: true,
          totalScore: true,
          percentageScore: true,
          correctAnswers: true,
          wrongAnswers: true,
          blankAnswers: true,
          durationSeconds: true,
          completedAt: true,
          answers: true,
          student: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: [
          { studentId: 'asc' },
          { completedAt: 'desc' }, // Most recent first
        ],
      });

      // Keep only the most recent result for each student
      const studentLatestResults = new Map<string, typeof allResults[0]>();
      for (const result of allResults) {
        if (!studentLatestResults.has(result.studentId)) {
          studentLatestResults.set(result.studentId, result);
        }
      }

      // Convert to array and sort by score
      const results = Array.from(studentLatestResults.values())
        .sort((a, b) => (b.percentageScore ?? 0) - (a.percentageScore ?? 0));

      // Check if there are any results
      const hasData = results.length > 0;

      if (!hasData) {
        return {
          hasData: false,
          simulation: {
            id: simulation.id,
            title: simulation.title,
            totalQuestions: simulation.totalQuestions,
            durationMinutes: simulation.durationMinutes,
            passingScore: simulation.passingScore,
            assignmentsCount: simulation._count.assignments,
          },
          overview: null,
          scoreDistribution: [],
          timeAnalysis: null,
          topPerformers: [],
          strugglingStudents: [],
          completionTrend: [],
        };
      }

      // Calculate overview stats
      const scores = results.map(r => r.percentageScore ?? 0);
      const times = results
        .filter((r): r is typeof r & { durationSeconds: number } => 
          r.durationSeconds !== null && r.durationSeconds > 0
        )
        .map(r => r.durationSeconds);
      const passedCount = simulation.passingScore 
        ? results.filter(r => (r.percentageScore ?? 0) >= simulation.passingScore).length
        : null;

      // Calculate median score
      const sortedScores = [...scores].toSorted((a, b) => a - b);
      const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];

      const overview = {
        totalAttempts: results.length,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        medianScore,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        standardDeviation: calculateStandardDeviation(scores),
        passedCount,
        passRate: passedCount !== null && results.length > 0 
          ? (passedCount / results.length) * 100 
          : null,
        averageCorrect: results.reduce((sum, r) => sum + (r.correctAnswers ?? 0), 0) / results.length,
        averageWrong: results.reduce((sum, r) => sum + (r.wrongAnswers ?? 0), 0) / results.length,
        averageBlank: results.reduce((sum, r) => sum + (r.blankAnswers ?? 0), 0) / results.length,
      };

      // Score distribution (buckets of 10%)
      const scoreDistribution = [
        { range: '0-10%', count: 0 },
        { range: '10-20%', count: 0 },
        { range: '20-30%', count: 0 },
        { range: '30-40%', count: 0 },
        { range: '40-50%', count: 0 },
        { range: '50-60%', count: 0 },
        { range: '60-70%', count: 0 },
        { range: '70-80%', count: 0 },
        { range: '80-90%', count: 0 },
        { range: '90-100%', count: 0 },
      ];

      scores.forEach(score => {
        // Handle edge cases: negative scores go to first bucket, scores > 100 go to last bucket
        const normalizedScore = Math.max(0, Math.min(score, 100));
        const bucketIndex = Math.min(Math.floor(normalizedScore / 10), 9);
        scoreDistribution[bucketIndex].count++;
      });

      // Calculate median time
      const sortedTimes = [...times].toSorted((a, b) => a - b);
      const medianTime = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : 0;

      // Time analysis
      const timeAnalysis = times.length > 0 ? {
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        medianTime,
        fastestTime: Math.min(...times),
        slowestTime: Math.max(...times),
        expectedTime: simulation.durationMinutes * 60,
        completedInTime: simulation.durationMinutes > 0 
          ? times.filter(t => t <= simulation.durationMinutes * 60).length 
          : times.length,
        totalWithTime: times.length,
      } : null;

      // Top performers (top 5)
      const topPerformers = results.slice(0, 5).map(r => ({
        resultId: r.id, // Unique identifier for the result
        studentId: r.student?.id ?? '',
        studentName: r.student?.user?.name ?? 'Studente',
        percentageScore: r.percentageScore ?? 0,
        correctAnswers: r.correctAnswers ?? 0,
        durationSeconds: r.durationSeconds,
      }));

      // Struggling students (bottom 5, below passing score if set)
      const strugglingStudents = results
        .filter(r => simulation.passingScore 
          ? (r.percentageScore ?? 0) < simulation.passingScore 
          : (r.percentageScore ?? 0) < 60)
        .slice(-5)
        .reverse()
        .map(r => ({
          resultId: r.id, // Unique identifier for the result
          studentId: r.student?.id ?? '',
          studentName: r.student?.user?.name ?? 'Studente',
          percentageScore: r.percentageScore ?? 0,
          correctAnswers: r.correctAnswers ?? 0,
          wrongAnswers: r.wrongAnswers ?? 0,
          blankAnswers: r.blankAnswers ?? 0,
        }));

      // Completion trend (by date)
      const completionsByDate = new Map<string, number>();
      results.forEach(r => {
        if (r.completedAt) {
          const dateKey = new Date(r.completedAt).toISOString().split('T')[0];
          completionsByDate.set(dateKey, (completionsByDate.get(dateKey) || 0) + 1);
        }
      });

      const completionTrend = Array.from(completionsByDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));

      return {
        hasData: true,
        simulation: {
          id: simulation.id,
          title: simulation.title,
          totalQuestions: simulation.totalQuestions,
          durationMinutes: simulation.durationMinutes,
          passingScore: simulation.passingScore,
          assignmentsCount: simulation._count.assignments,
        },
        overview,
        scoreDistribution,
        timeAnalysis,
        topPerformers,
        strugglingStudents,
        completionTrend,
      };
    }),

  // ==================== ASSIGNMENT STATISTICS ====================

  /**
   * Get detailed statistics for a specific assignment session
   * Includes: per-student details, questions wrong by student
   */
  getAssignmentStatistics: staffProcedure
    .input(z.object({ 
      simulationId: z.string(),
      assignmentId: z.string().optional(), // If provided, filter by specific assignment
      groupId: z.string().optional(), // If provided, filter by group
    }))
    .query(async ({ ctx, input }) => {
      // Build assignment filter
      const buildAssignmentFilter = () => {
        if (input.assignmentId) return { id: input.assignmentId };
        if (input.groupId) return { groupId: input.groupId };
        return undefined;
      };

      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: {
                  subject: { select: { id: true, name: true, code: true, color: true } },
                  topic: { select: { id: true, name: true } },
                  answers: { orderBy: { order: 'asc' } },
                },
              },
            },
          },
          assignments: {
            where: buildAssignmentFilter(),
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
              group: {
                include: {
                  members: {
                    include: {
                      student: { include: { user: { select: { id: true, name: true, email: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso alle statistiche' });
      }

      // Collect all targeted student IDs from assignments
      const targetedStudentIds = new Set<string>();
      // Also collect all assignment IDs if filtering by specific assignment or group
      const targetedAssignmentIds = new Set<string>();
      
      simulation.assignments.forEach(a => {
        targetedAssignmentIds.add(a.id);
        if (a.studentId) targetedStudentIds.add(a.studentId);
        if (a.group) {
          a.group.members.forEach(m => targetedStudentIds.add(m.studentId));
        }
      });

      // Get results for targeted students
      // If assignmentId is specified, filter by that specific assignment
      // Otherwise, if groupId is specified, filter by all assignments for that group
      // Otherwise, filter by all assignments for this simulation
      
      // Build assignment filter for results query
      const buildResultAssignmentFilter = () => {
        if (input.assignmentId) {
          return { assignmentId: input.assignmentId };
        }
        if (targetedAssignmentIds.size > 0) {
          return { assignmentId: { in: Array.from(targetedAssignmentIds) } };
        }
        return {};
      };

      const results = await ctx.prisma.simulationResult.findMany({
        where: { 
          simulationId: input.simulationId,
          studentId: { in: Array.from(targetedStudentIds) },
          // Filter by assignmentId(s) to ensure we only get results for this specific assignment/group
          ...buildResultAssignmentFilter(),
        },
        select: {
          id: true,
          studentId: true,
          totalScore: true,
          percentageScore: true,
          correctAnswers: true,
          wrongAnswers: true,
          blankAnswers: true,
          durationSeconds: true,
          completedAt: true,
          answers: true,
          student: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { percentageScore: 'desc' },
      });

      const completedResults = results.filter(r => r.completedAt !== null);
      const hasData = completedResults.length > 0;

      // Calculate effective maxScore for percentage calculations
      const effectiveMaxScore = simulation.maxScore && simulation.maxScore > 0
        ? simulation.maxScore
        : simulation.totalQuestions * (simulation.correctPoints ?? 1.5);

      if (!hasData) {
        return {
          hasData: false,
          simulation: {
            id: simulation.id,
            title: simulation.title,
            totalQuestions: simulation.totalQuestions,
          },
          overview: null,
          studentDetails: [],
          questionsWrongByStudent: [],
          mostMissedQuestions: [],
        };
      }

      // Build question ID to details map
      const questionMap = new Map<string, {
        id: string;
        order: number;
        text: string;
        subject: { id: string; name: string; color: string } | null;
        topic: { id: string; name: string } | null;
        correctAnswerLetter: string;
        correctAnswerText: string;
        answerIdToLetter: Record<string, string>;
        answerIdToText: Record<string, string>;
      }>();

      simulation.questions.forEach((sq, idx) => {
        const correctAnswer = sq.question.answers.find(a => a.isCorrect);
        const correctLetter = correctAnswer 
          ? String.fromCodePoint(65 + sq.question.answers.indexOf(correctAnswer))
          : '';
        const correctText = correctAnswer?.text || '';
        
        // Build answer ID to letter and text mappings
        const answerIdToLetter: Record<string, string> = {};
        const answerIdToText: Record<string, string> = {};
        sq.question.answers.forEach((a, ansIdx) => {
          answerIdToLetter[a.id] = String.fromCodePoint(65 + ansIdx);
          answerIdToText[a.id] = a.text;
        });
        
        questionMap.set(sq.questionId, {
          id: sq.questionId,
          order: idx + 1,
          text: stripHtml(sq.question.text).substring(0, 80),
          subject: sq.question.subject,
          topic: sq.question.topic,
          correctAnswerLetter: correctLetter,
          correctAnswerText: correctText,
          answerIdToLetter, // Map from answer ID to letter (A, B, C, D)
          answerIdToText, // Map from answer ID to answer text
        });
      });

      // Calculate overview
      // Recalculate percentage scores dynamically if they're 0 but totalScore exists
      const scores = completedResults.map(r => {
        if (r.percentageScore && r.percentageScore > 0) {
          return r.percentageScore;
        }
        // Recalculate if percentageScore was saved as 0
        if (r.totalScore && effectiveMaxScore > 0) {
          return (r.totalScore / effectiveMaxScore) * 100;
        }
        return 0;
      });
      const overview = {
        targetedStudents: targetedStudentIds.size,
        completedCount: completedResults.length,
        pendingCount: targetedStudentIds.size - completedResults.length,
        completionRate: (completedResults.length / targetedStudentIds.size) * 100,
        averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      };

      // Build per-student details with wrong questions
      type AnswerData = {
        questionId: string;
        answerId: string | null;
        answerText?: string | null;
        isCorrect: boolean;
        earnedPoints?: number;
        timeSpent?: number;
      };

      const studentDetails = completedResults.map(r => {
        const answers = (r.answers as AnswerData[]) || [];
        const wrongQuestions: Array<{
          questionId: string;
          order: number;
          text: string;
          subject: string | null;
          studentAnswer: string;
          studentAnswerText: string;
          correctAnswer: string;
          correctAnswerText: string;
        }> = [];
        const blankQuestions: Array<{
          questionId: string;
          order: number;
          text: string;
          subject: string | null;
        }> = [];

        answers.forEach(ans => {
          const questionInfo = questionMap.get(ans.questionId);
          if (!questionInfo) return;

          if (!ans.answerId) {
            // Blank answer (no answerId selected)
            blankQuestions.push({
              questionId: ans.questionId,
              order: questionInfo.order,
              text: questionInfo.text,
              subject: questionInfo.subject?.name || null,
            });
          } else if (!ans.isCorrect) {
            // Wrong answer - find the letter and text of the student's answer
            const studentAnswerLetter = questionInfo.answerIdToLetter?.[ans.answerId] || '?';
            const studentAnswerText = questionInfo.answerIdToText?.[ans.answerId] || '';
            wrongQuestions.push({
              questionId: ans.questionId,
              order: questionInfo.order,
              text: questionInfo.text,
              subject: questionInfo.subject?.name || null,
              studentAnswer: studentAnswerLetter,
              studentAnswerText: studentAnswerText,
              correctAnswer: questionInfo.correctAnswerLetter,
              correctAnswerText: questionInfo.correctAnswerText,
            });
          }
        });

        // Recalculate percentage if it's 0 but totalScore exists
        let studentPercentageScore = r.percentageScore ?? 0;
        if (studentPercentageScore === 0 && r.totalScore && effectiveMaxScore > 0) {
          studentPercentageScore = (r.totalScore / effectiveMaxScore) * 100;
        }

        return {
          studentId: r.student?.id ?? '',
          studentName: r.student?.user?.name ?? 'Studente',
          studentEmail: r.student?.user?.email ?? '',
          percentageScore: studentPercentageScore,
          totalScore: r.totalScore ?? 0,
          correctAnswers: r.correctAnswers ?? 0,
          wrongAnswers: r.wrongAnswers ?? 0,
          blankAnswers: r.blankAnswers ?? 0,
          durationSeconds: r.durationSeconds,
          completedAt: r.completedAt,
          wrongQuestions,
          blankQuestions,
        };
      });

      // Find most missed questions (questions most students got wrong)
      const questionMissCount = new Map<string, { wrong: number; blank: number; total: number }>();
      
      completedResults.forEach(r => {
        const answers = (r.answers as AnswerData[]) || [];
        answers.forEach(ans => {
          const current = questionMissCount.get(ans.questionId) || { wrong: 0, blank: 0, total: 0 };
          current.total++;
          if (!ans.answerId) {
            // Blank answer
            current.blank++;
          } else if (!ans.isCorrect) {
            // Wrong answer
            current.wrong++;
          }
          questionMissCount.set(ans.questionId, current);
        });
      });

      const mostMissedQuestions = Array.from(questionMissCount.entries())
        .map(([questionId, counts]) => {
          const questionInfo = questionMap.get(questionId);
          if (!questionInfo) return null;
          const missRate = ((counts.wrong + counts.blank) / counts.total) * 100;
          return {
            questionId,
            order: questionInfo.order,
            text: questionInfo.text,
            subject: questionInfo.subject?.name || null,
            subjectColor: questionInfo.subject?.color || null,
            wrongCount: counts.wrong,
            blankCount: counts.blank,
            totalAnswers: counts.total,
            missRate,
          };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null)
        .sort((a, b) => b.missRate - a.missRate)
        .slice(0, 10);

      return {
        hasData: true,
        simulation: {
          id: simulation.id,
          title: simulation.title,
          totalQuestions: simulation.totalQuestions,
        },
        overview,
        studentDetails,
        mostMissedQuestions,
      };
    }),

  // ==================== OPEN ANSWER REVIEW ====================

  // Get results with pending open answers for staff review
  getResultsWithPendingReviews: staffProcedure
    .input(z.object({
      simulationId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: Prisma.SimulationResultWhereInput = {
        pendingOpenAnswers: { gt: 0 },
        completedAt: { not: null },
        ...(input.simulationId ? { simulationId: input.simulationId } : {}),
      };

      const [results, total] = await Promise.all([
        ctx.prisma.simulationResult.findMany({
          where: whereClause,
          include: {
            simulation: { select: { id: true, title: true, type: true } },
            student: { 
              include: { 
                user: { select: { name: true, email: true } } 
              } 
            },
            openAnswerSubmissions: {
              where: { isValidated: false },
              include: {
                question: { select: { id: true, text: true, points: true } },
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.simulationResult.count({ where: whereClause }),
      ]);

      return {
        results: results.map(r => ({
          id: r.id,
          simulation: r.simulation,
          student: {
            id: r.student.id,
            name: r.student.user.name,
            email: r.student.user.email,
          },
          completedAt: r.completedAt,
          totalScore: r.totalScore,
          percentageScore: r.percentageScore,
          pendingOpenAnswers: r.pendingOpenAnswers,
          openAnswers: r.openAnswerSubmissions.map(oa => ({
            id: oa.id,
            questionId: oa.questionId,
            questionText: oa.question.text,
            questionPoints: oa.question.points,
            answerText: oa.answerText,
            autoScore: oa.autoScore,
            keywordsMatched: oa.keywordsMatched,
            keywordsMissed: oa.keywordsMissed,
          })),
        })),
        total,
        hasMore: input.offset + results.length < total,
      };
    }),

  // Get open answers for a specific result
  getOpenAnswersForResult: staffProcedure
    .input(z.object({ resultId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.simulationResult.findUnique({
        where: { id: input.resultId },
        include: {
          simulation: { 
            select: { 
              id: true, 
              title: true, 
              type: true,
              correctPoints: true,
              wrongPoints: true,
              blankPoints: true,
            } 
          },
          student: { 
            include: { 
              user: { select: { name: true, email: true } } 
            } 
          },
          openAnswerSubmissions: {
            include: {
              question: { 
                select: { 
                  id: true, 
                  text: true, 
                  textLatex: true,
                  points: true,
                  keywords: true,
                  openValidationType: true,
                  correctExplanation: true,
                } 
              },
            },
            orderBy: { submittedAt: 'asc' },
          },
        },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Risultato non trovato' });
      }

      return {
        id: result.id,
        simulation: {
          id: result.simulation.id,
          title: result.simulation.title,
          type: result.simulation.type,
          correctPoints: result.simulation.correctPoints,
          wrongPoints: result.simulation.wrongPoints,
          blankPoints: result.simulation.blankPoints,
        },
        student: {
          id: result.student.id,
          name: result.student.user.name,
          email: result.student.user.email,
        },
        completedAt: result.completedAt,
        totalScore: result.totalScore,
        percentageScore: result.percentageScore,
        pendingOpenAnswers: result.pendingOpenAnswers,
        reviewedAt: result.reviewedAt,
        openAnswers: result.openAnswerSubmissions.map(oa => ({
          id: oa.id,
          questionId: oa.questionId,
          question: {
            text: oa.question.text,
            textLatex: oa.question.textLatex,
            points: oa.question.points,
            keywords: oa.question.keywords,
            validationType: oa.question.openValidationType,
            correctExplanation: oa.question.correctExplanation,
          },
          answerText: oa.answerText,
          autoScore: oa.autoScore,
          keywordsMatched: oa.keywordsMatched,
          keywordsMissed: oa.keywordsMissed,
          manualScore: oa.manualScore,
          isValidated: oa.isValidated,
          validatorNotes: oa.validatorNotes,
          validatedAt: oa.validatedAt,
          finalScore: oa.finalScore,
        })),
      };
    }),

  // Validate/grade a single open answer
  validateOpenAnswer: staffProcedure
    .input(z.object({
      openAnswerId: z.string(),
      manualScore: z.number().min(-1).max(1), // -1 to 1 (can be negative for wrong answers)
      validatorNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const openAnswer = await ctx.prisma.openAnswerSubmission.findUnique({
        where: { id: input.openAnswerId },
        include: {
          question: { select: { points: true } },
          simulationResult: true,
        },
      });

      if (!openAnswer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Risposta non trovata' });
      }

      // Calculate final score based on manual score
      const finalScore = input.manualScore;

      // Update the open answer
      await ctx.prisma.openAnswerSubmission.update({
        where: { id: input.openAnswerId },
        data: {
          manualScore: input.manualScore,
          finalScore,
          isValidated: true,
          validatedById: ctx.user.id,
          validatedAt: new Date(),
          validatorNotes: input.validatorNotes || null,
        },
      });

      // Check if this was the last pending open answer and update result accordingly
      if (openAnswer.simulationResultId) {
        const remainingPending = await ctx.prisma.openAnswerSubmission.count({
          where: {
            simulationResultId: openAnswer.simulationResultId,
            isValidated: false,
          },
        });

        // Update the result's pending count
        await ctx.prisma.simulationResult.update({
          where: { id: openAnswer.simulationResultId },
          data: {
            pendingOpenAnswers: remainingPending,
            ...(remainingPending === 0 ? {
              reviewedAt: new Date(),
              reviewedById: ctx.user.id,
            } : {}),
          },
        });

        // If all open answers are now validated, recalculate the total score
        if (remainingPending === 0) {
          await recalculateResultScore(ctx.prisma, openAnswer.simulationResultId);
        }
      }

      return { success: true };
    }),

  // Batch validate multiple open answers
  validateOpenAnswersBatch: staffProcedure
    .input(z.object({
      resultId: z.string(),
      validations: z.array(z.object({
        openAnswerId: z.string(),
        manualScore: z.number().min(-1).max(1), // -1 to 1 (can be negative)
        validatorNotes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.simulationResult.findUnique({
        where: { id: input.resultId },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Risultato non trovato' });
      }

      // Update all open answers in a transaction
      await ctx.prisma.$transaction(async () => {
        for (const validation of input.validations) {
          await ctx.prisma.openAnswerSubmission.update({
            where: { id: validation.openAnswerId },
            data: {
              manualScore: validation.manualScore,
              finalScore: validation.manualScore,
              isValidated: true,
              validatedById: ctx.user.id,
              validatedAt: new Date(),
              validatorNotes: validation.validatorNotes || null,
            },
          });
        }

        // Check remaining pending
        const remainingPending = await ctx.prisma.openAnswerSubmission.count({
          where: {
            simulationResultId: input.resultId,
            isValidated: false,
          },
        });

        // Update result
        await ctx.prisma.simulationResult.update({
          where: { id: input.resultId },
          data: {
            pendingOpenAnswers: remainingPending,
            ...(remainingPending === 0 ? {
              reviewedAt: new Date(),
              reviewedById: ctx.user.id,
            } : {}),
          },
        });
      });

      // Recalculate score if all answers are validated
      const remainingAfter = await ctx.prisma.openAnswerSubmission.count({
        where: {
          simulationResultId: input.resultId,
          isValidated: false,
        },
      });

      if (remainingAfter === 0) {
        await recalculateResultScore(ctx.prisma, input.resultId);
      }

      return { success: true, remainingPending: remainingAfter };
    }),
});

// Helper function to recalculate result score after open answer validation
async function recalculateResultScore(prisma: PrismaClient, resultId: string) {
  const result = await prisma.simulationResult.findUnique({
    where: { id: resultId },
    include: {
      simulation: { select: { maxScore: true } },
      openAnswerSubmissions: {
        include: { question: { select: { points: true } } },
      },
    },
  });

  if (!result) return;

  // Parse existing answers
  const answers = result.answers as Array<{
    questionId: string;
    answerId: string | null;
    answerText: string | null;
    isCorrect: boolean;
    earnedPoints: number;
  }>;

  // Calculate points and counts from open answers
  let openAnswerPoints = 0;
  let openAnswerCorrect = 0;
  let openAnswerWrong = 0;

  for (const oa of result.openAnswerSubmissions) {
    if (oa.finalScore !== null && oa.question.points) {
      const points = oa.finalScore * oa.question.points;
      openAnswerPoints += points;
      
      // Count as correct if score >= 50%, otherwise wrong
      if (oa.finalScore >= 0.5) {
        openAnswerCorrect++;
      } else {
        openAnswerWrong++;
      }
    }
  }

  // Calculate new totals
  // First, count only choice questions (answerId !== null)
  const choiceQuestionPoints = answers
    .filter(a => a.answerId !== null) // Only count choice questions
    .reduce((sum, a) => sum + (a.earnedPoints || 0), 0);

  // Count existing choice question stats
  const existingCorrect = result.correctAnswers;
  const existingWrong = result.wrongAnswers;

  const newTotalScore = choiceQuestionPoints + openAnswerPoints;
  const newPercentageScore = result.simulation.maxScore 
    ? (newTotalScore / result.simulation.maxScore) * 100 
    : 0;

  // Update result with new totals including open answer counts
  await prisma.simulationResult.update({
    where: { id: resultId },
    data: {
      totalScore: newTotalScore,
      percentageScore: newPercentageScore,
      correctAnswers: existingCorrect + openAnswerCorrect,
      wrongAnswers: existingWrong + openAnswerWrong,
    },
  });
}

// Helper function to calculate standard deviation
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}
