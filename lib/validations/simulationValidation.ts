// Simulation Validations
import { z } from 'zod';

// ==================== ENUMS ====================

export const SimulationTypeEnum = z.enum(['OFFICIAL', 'PRACTICE', 'CUSTOM', 'QUICK_QUIZ']);
export type SimulationType = z.infer<typeof SimulationTypeEnum>;

export const SimulationStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type SimulationStatus = z.infer<typeof SimulationStatusEnum>;

export const SimulationVisibilityEnum = z.enum(['PRIVATE', 'GROUP', 'PUBLIC']);
export type SimulationVisibility = z.infer<typeof SimulationVisibilityEnum>;

export const CreatorRoleEnum = z.enum(['ADMIN', 'COLLABORATOR', 'STUDENT']);
export type CreatorRole = z.infer<typeof CreatorRoleEnum>;

export const LocationTypeEnum = z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']);
export type LocationType = z.infer<typeof LocationTypeEnum>;

// ==================== DISTRIBUTION SCHEMAS ====================

// For subject distribution: { subjectId: numberOfQuestions }
export const subjectDistributionSchema = z.record(z.string(), z.number().int().min(0));
export type SubjectDistribution = z.infer<typeof subjectDistributionSchema>;

// For difficulty distribution: { EASY: n, MEDIUM: n, HARD: n }
export const difficultyDistributionSchema = z.object({
  EASY: z.number().int().min(0).default(0),
  MEDIUM: z.number().int().min(0).default(0),
  HARD: z.number().int().min(0).default(0),
});
export type DifficultyDistribution = z.infer<typeof difficultyDistributionSchema>;

// ==================== SECTION SCHEMA (for TOLC-style simulations) ====================

export const simulationSectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Nome sezione obbligatorio'),
  durationMinutes: z.number().int().min(1, 'Durata sezione obbligatoria'),
  questionCount: z.number().int().min(1).optional(),
  subjectId: z.string().optional().nullable(),
  questionIds: z.array(z.string()).optional().default([]),
  order: z.number().int().min(0).default(0),
});

export type SimulationSection = z.infer<typeof simulationSectionSchema>;

// ==================== SIMULATION QUESTION SCHEMAS ====================

export const simulationQuestionSchema = z.object({
  questionId: z.string().min(1, 'ID domanda obbligatorio'),
  order: z.number().int().min(0),
  customPoints: z.number().optional().nullable(),
  customNegativePoints: z.number().optional().nullable(),
});

export type SimulationQuestionInput = z.infer<typeof simulationQuestionSchema>;

// ==================== ASSIGNMENT SCHEMAS ====================

export const assignmentTargetSchema = z.object({
  studentId: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Schedule for this assignment
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  locationType: z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']).optional().nullable(),
  createCalendarEvent: z.boolean().default(false), // Whether to create a calendar event
}).refine(
  data => data.studentId || data.groupId,
  { message: 'Devi selezionare almeno uno tra studente o gruppo' }
);

export type AssignmentTargetInput = z.infer<typeof assignmentTargetSchema>;

// Bulk assignment schema
export const bulkAssignmentSchema = z.object({
  simulationId: z.string().min(1, 'ID simulazione obbligatorio'),
  targets: z.array(assignmentTargetSchema).min(1, 'Seleziona almeno un destinatario'),
});

export type BulkAssignmentInput = z.infer<typeof bulkAssignmentSchema>;

// ==================== SIMULATION BASE SCHEMA ====================

const simulationBaseSchema = z.object({
  // Basic info
  title: z.string().min(1, 'Il titolo è obbligatorio').max(200, 'Titolo troppo lungo'),
  description: z.string().optional().nullable(),
  type: SimulationTypeEnum,
  visibility: SimulationVisibilityEnum.default('PRIVATE'),
  
  // Official simulation flag
  isOfficial: z.boolean().default(false),
  
  // Access type (auto-set based on isOfficial: ROOM for official, OPEN otherwise)
  accessType: z.enum(['OPEN', 'ROOM']).optional(),
  
  // Timing
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().int().min(0, 'La durata deve essere positiva').default(0),
  
  // Configuration
  totalQuestions: z.number().int().min(1, 'Minimo 1 domanda'),
  showResults: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(true),
  allowReview: z.boolean().default(true),
  randomizeOrder: z.boolean().default(false),
  randomizeAnswers: z.boolean().default(false),
  
  // Scoring
  useQuestionPoints: z.boolean().default(false),
  correctPoints: z.number().default(1.5),
  wrongPoints: z.number().max(0, 'I punti per risposta errata devono essere negativi o zero').default(-0.4),
  blankPoints: z.number().default(0),
  maxScore: z.number().optional().nullable(),
  passingScore: z.number().optional().nullable(),
  
  // Attempts
  isRepeatable: z.boolean().default(false),
  maxAttempts: z.number().int().min(1).optional().nullable(),
  
  // Paper-based mode
  isPaperBased: z.boolean().default(false),
  paperInstructions: z.string().optional().nullable(),
  showSectionsInPaper: z.boolean().default(true), // Show sections dividers in paper PDF
  
  // Attendance tracking
  trackAttendance: z.boolean().default(false),
  locationType: LocationTypeEnum.optional().nullable(),
  locationDetails: z.string().optional().nullable(),
  
  // Sections (for TOLC-style simulations)
  hasSections: z.boolean().default(false),
  sections: z.array(simulationSectionSchema).optional().nullable(),
  
  // Calendar integration
  isScheduled: z.boolean().default(false),
  
  // Anti-cheat settings
  enableAntiCheat: z.boolean().default(false),
  forceFullscreen: z.boolean().default(false),
  blockTabChange: z.boolean().default(false),
  blockCopyPaste: z.boolean().default(false),
  logSuspiciousEvents: z.boolean().default(false),
  
  // Question selection criteria
  subjectDistribution: subjectDistributionSchema.optional().nullable(),
  difficultyDistribution: difficultyDistributionSchema.optional().nullable(),
  topicIds: z.array(z.string()).optional().nullable(),
  
  // Assignment
  isPublic: z.boolean().default(false),
});

// ==================== CREATE SIMULATION SCHEMAS ====================

// Schema for creating simulation with manual question selection
export const createSimulationWithQuestionsSchema = simulationBaseSchema.extend({
  questions: z.array(simulationQuestionSchema).min(1, 'Aggiungi almeno una domanda'),
  assignments: z.array(assignmentTargetSchema).optional().default([]),
});

export type CreateSimulationWithQuestionsInput = z.infer<typeof createSimulationWithQuestionsSchema>;

// Schema for creating simulation with automatic question selection
export const createSimulationAutoSchema = simulationBaseSchema.extend({
  subjectDistribution: subjectDistributionSchema,
  difficultyDistribution: difficultyDistributionSchema.optional(),
  topicIds: z.array(z.string()).optional(),
  assignments: z.array(assignmentTargetSchema).optional().default([]),
});

export type CreateSimulationAutoInput = z.infer<typeof createSimulationAutoSchema>;

// Combined create schema (discriminated union)
export const createSimulationSchema = z.discriminatedUnion('selectionMode', [
  z.object({
    selectionMode: z.literal('manual'),
    ...createSimulationWithQuestionsSchema.shape,
  }),
  z.object({
    selectionMode: z.literal('automatic'),
    ...createSimulationAutoSchema.shape,
  }),
]);

export type CreateSimulationInput = z.infer<typeof createSimulationSchema>;

// ==================== UPDATE SIMULATION SCHEMA ====================

export const updateSimulationSchema = simulationBaseSchema.partial().extend({
  id: z.string().min(1, 'ID simulazione obbligatorio'),
  status: SimulationStatusEnum.optional(),
});

export type UpdateSimulationInput = z.infer<typeof updateSimulationSchema>;

// Schema for updating questions in a simulation
export const updateSimulationQuestionsSchema = z.object({
  simulationId: z.string().min(1, 'ID simulazione obbligatorio'),
  questions: z.array(simulationQuestionSchema).min(1, 'Aggiungi almeno una domanda'),
  mode: z.enum(['replace', 'append', 'remove']).default('replace'),
});

export type UpdateSimulationQuestionsInput = z.infer<typeof updateSimulationQuestionsSchema>;

// ==================== FILTER SCHEMAS ====================

export const simulationFilterSchema = z.object({
  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  
  // Filters
  search: z.string().optional(),
  type: SimulationTypeEnum.optional(),
  status: SimulationStatusEnum.optional(),
  visibility: SimulationVisibilityEnum.optional(),
  isOfficial: z.boolean().optional(),
  groupId: z.string().optional(),
  createdById: z.string().optional(),
  creatorRole: CreatorRoleEnum.optional(),
  
  // Date range
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  endDateFrom: z.string().datetime().optional(),
  endDateTo: z.string().datetime().optional(),
  
  // Sorting
  sortBy: z.enum(['createdAt', 'title', 'startDate', 'endDate', 'totalQuestions']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SimulationFilterInput = z.infer<typeof simulationFilterSchema>;

// ==================== STUDENT SIMULATION FILTER ====================

export const studentSimulationFilterSchema = z.object({
  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  
  // Filters
  type: SimulationTypeEnum.optional(),
  status: z.enum(['available', 'in_progress', 'completed', 'expired']).optional(),
  isOfficial: z.boolean().optional(),
  selfCreated: z.boolean().optional(), // Filter for self-practice simulations
  assignedToMe: z.boolean().optional(), // Filter for assigned simulations
  
  // Sorting
  sortBy: z.enum(['startDate', 'endDate', 'dueDate', 'title']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type StudentSimulationFilterInput = z.infer<typeof studentSimulationFilterSchema>;

// ==================== SIMULATION RESULT SCHEMAS ====================

export const simulationAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerId: z.string().optional().nullable(), // For choice questions
  answerText: z.string().optional().nullable(), // For open questions
  timeSpent: z.number().int().min(0).optional(), // Seconds spent on this question
  flagged: z.boolean().default(false), // Student flagged for review
});

export type SimulationAnswerInput = z.infer<typeof simulationAnswerSchema>;

export const submitSimulationSchema = z.object({
  simulationId: z.string().min(1, 'ID simulazione obbligatorio'),
  answers: z.array(simulationAnswerSchema),
  totalTimeSpent: z.number().int().min(0), // Total seconds
  isPartial: z.boolean().default(false), // Partial save vs final submission
});

export type SubmitSimulationInput = z.infer<typeof submitSimulationSchema>;

// ==================== QUICK QUIZ SCHEMA ====================

export const quickQuizConfigSchema = z.object({
  // Question selection
  subjectIds: z.array(z.string()).min(1, 'Seleziona almeno una materia'),
  topicIds: z.array(z.string()).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'MIXED']).default('MIXED'),
  
  // Quiz settings
  questionCount: z.number().int().min(5).max(100).default(10),
  durationMinutes: z.number().int().min(0).default(0), // 0 = no limit
  
  // Scoring
  correctPoints: z.number().default(1.0),
  wrongPoints: z.number().max(0).default(0),
  
  // Display
  showResultsImmediately: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(true),
});

export type QuickQuizConfigInput = z.infer<typeof quickQuizConfigSchema>;

// ==================== VALIDATION HELPERS ====================

/**
 * Validates that end date is after start date
 */
export const validateDateRange = (startDate: string | null | undefined, endDate: string | null | undefined): boolean => {
  if (!startDate || !endDate) return true;
  return new Date(endDate) > new Date(startDate);
};

/**
 * Validates that passing score is less than or equal to max score
 */
export const validatePassingScore = (passingScore: number | null | undefined, maxScore: number | null | undefined): boolean => {
  if (!passingScore || !maxScore) return true;
  return passingScore <= maxScore;
};

/**
 * Validates that total questions matches distribution
 */
export const validateQuestionDistribution = (
  totalQuestions: number,
  subjectDistribution: SubjectDistribution | null | undefined
): boolean => {
  if (!subjectDistribution) return true;
  const sum = Object.values(subjectDistribution).reduce((a, b) => a + b, 0);
  return sum === totalQuestions;
};

/**
 * Calculates total questions from subject distribution
 */
export const getTotalFromDistribution = (distribution: SubjectDistribution): number => {
  return Object.values(distribution).reduce((a, b) => a + b, 0);
};

// ==================== TYPE GUARDS ====================

export const isOfficialSimulation = (simulation: { type: SimulationType; isOfficial: boolean }): boolean => {
  return simulation.type === 'OFFICIAL' && simulation.isOfficial;
};

export const isStudentCreatable = (type: SimulationType): boolean => {
  return type === 'CUSTOM' || type === 'QUICK_QUIZ';
};

export const requiresScheduling = (type: SimulationType): boolean => {
  return type === 'OFFICIAL' || type === 'PRACTICE';
};

// ==================== PRESET CONFIGURATIONS ====================

export const SIMULATION_PRESETS = {
  OFFICIAL_TOLC_MED: {
    type: 'OFFICIAL' as const,
    isOfficial: true,
    durationMinutes: 110,
    totalQuestions: 60,
    correctPoints: 1.5,
    wrongPoints: -0.4,
    blankPoints: 0,
    randomizeOrder: false,
    randomizeAnswers: false,
    showResults: false, // Show only after deadline
    showCorrectAnswers: false,
    allowReview: false,
    isRepeatable: false,
    // Anti-cheat for official simulations
    enableAntiCheat: true,
    forceFullscreen: true,
    blockTabChange: true,
    blockCopyPaste: true,
    logSuspiciousEvents: true,
    // Sections for TOLC-MED
    hasSections: true,
  },
  PRACTICE_TEST: {
    type: 'PRACTICE' as const,
    isOfficial: false,
    durationMinutes: 60,
    totalQuestions: 30,
    correctPoints: 1.0,
    wrongPoints: 0,
    blankPoints: 0,
    randomizeOrder: true,
    randomizeAnswers: true,
    showResults: true,
    showCorrectAnswers: true,
    allowReview: true,
    isRepeatable: true,
    maxAttempts: 3,
    enableAntiCheat: false,
    forceFullscreen: false,
    blockTabChange: false,
    blockCopyPaste: false,
    logSuspiciousEvents: false,
    hasSections: false,
  },
  QUICK_QUIZ: {
    type: 'QUICK_QUIZ' as const,
    isOfficial: false,
    durationMinutes: 15,
    totalQuestions: 10,
    correctPoints: 1.0,
    wrongPoints: 0,
    blankPoints: 0,
    randomizeOrder: true,
    randomizeAnswers: true,
    showResults: true,
    showCorrectAnswers: true,
    allowReview: true,
    isRepeatable: true,
    enableAntiCheat: false,
    forceFullscreen: false,
    blockTabChange: false,
    blockCopyPaste: false,
    logSuspiciousEvents: false,
    hasSections: false,
  },
  PAPER_BASED: {
    type: 'CUSTOM' as const,
    isOfficial: false,
    durationMinutes: 90,
    totalQuestions: 50,
    correctPoints: 1.5,
    wrongPoints: -0.4,
    blankPoints: 0,
    randomizeOrder: false,
    randomizeAnswers: false,
    showResults: true,
    showCorrectAnswers: true,
    allowReview: true,
    isRepeatable: false,
    isPaperBased: true,
    enableAntiCheat: false,
    forceFullscreen: false,
    blockTabChange: false,
    blockCopyPaste: false,
    logSuspiciousEvents: false,
    hasSections: false,
  },
} as const;

export type SimulationPreset = keyof typeof SIMULATION_PRESETS;

// ==================== PAPER-BASED RESULTS SCHEMAS ====================

// Single answer for paper-based result entry
export const paperAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerId: z.string().optional().nullable(), // null = blank answer
});

export type PaperAnswer = z.infer<typeof paperAnswerSchema>;

// Create paper-based result schema
export const createPaperResultSchema = z.object({
  simulationId: z.string().min(1, 'ID simulazione obbligatorio'),
  studentId: z.string().min(1, 'ID studente obbligatorio'),
  answers: z.array(paperAnswerSchema),
  wasPresent: z.boolean().default(true), // Track attendance
});

export type CreatePaperResultInput = z.infer<typeof createPaperResultSchema>;

// Bulk paper results schema (for multiple students)
export const bulkPaperResultsSchema = z.object({
  simulationId: z.string().min(1, 'ID simulazione obbligatorio'),
  results: z.array(z.object({
    studentId: z.string().min(1),
    answers: z.array(paperAnswerSchema),
    wasPresent: z.boolean().default(true),
  })),
});

export type BulkPaperResultsInput = z.infer<typeof bulkPaperResultsSchema>;

// ==================== SMART RANDOM QUESTION GENERATION ====================

// Preset for smart random generation
export const SmartRandomPresetEnum = z.enum([
  'PROPORTIONAL',  // Distribution proportional to available questions per subject
  'BALANCED',      // Equal distribution across subjects
  'SINGLE_SUBJECT', // Focus on single subject
  'CUSTOM',        // User-defined distribution
]);
export type SmartRandomPreset = z.infer<typeof SmartRandomPresetEnum>;

// Difficulty mix options
export const DifficultyMixEnum = z.enum([
  'BALANCED',    // 30% easy, 50% medium, 20% hard
  'EASY_FOCUS',  // 50% easy, 40% medium, 10% hard
  'HARD_FOCUS',  // 10% easy, 40% medium, 50% hard
  'MEDIUM_ONLY', // 100% medium
  'MIXED',       // Equal mix 33/34/33
]);
export type DifficultyMix = z.infer<typeof DifficultyMixEnum>;

// Smart random generation input schema
export const smartRandomGenerationSchema = z.object({
  // Required: how many questions (minimum 5, no maximum)
  totalQuestions: z.number().int().min(5),
  
  // Distribution preset
  preset: SmartRandomPresetEnum.default('BALANCED'),
  
  // For SINGLE_SUBJECT preset
  focusSubjectId: z.string().optional().nullable(),
  
  // For CUSTOM preset - manual distribution { subjectId: numberOfQuestions }
  customSubjectDistribution: z.record(z.string(), z.number().int().min(0)).optional().nullable(),
  
  // Difficulty distribution
  difficultyMix: DifficultyMixEnum.default('BALANCED'),
  
  // Smart features
  avoidRecentlyUsed: z.boolean().default(true),     // Avoid questions used in recent simulations
  maximizeTopicCoverage: z.boolean().default(true), // Cover more topics rather than repeating same
  preferRecentQuestions: z.boolean().default(false), // Prefer newly added questions
  
  // Optional tag filters (if user wants to limit to specific tags)
  tagIds: z.array(z.string()).optional().nullable(),
  
  // Exclude specific questions
  excludeQuestionIds: z.array(z.string()).optional().nullable(),
});

export type SmartRandomGenerationInput = z.infer<typeof smartRandomGenerationSchema>;

// Helper to get difficulty ratios from mix
export const getDifficultyRatios = (mix: DifficultyMix): { EASY: number; MEDIUM: number; HARD: number } => {
  switch (mix) {
    case 'BALANCED':
      return { EASY: 0.30, MEDIUM: 0.50, HARD: 0.20 };
    case 'EASY_FOCUS':
      return { EASY: 0.50, MEDIUM: 0.40, HARD: 0.10 };
    case 'HARD_FOCUS':
      return { EASY: 0.10, MEDIUM: 0.40, HARD: 0.50 };
    case 'MEDIUM_ONLY':
      return { EASY: 0, MEDIUM: 1.0, HARD: 0 };
    case 'MIXED':
      return { EASY: 0.33, MEDIUM: 0.34, HARD: 0.33 };
    default:
      return { EASY: 0.30, MEDIUM: 0.50, HARD: 0.20 };
  }
};
