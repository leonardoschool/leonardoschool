// Re-grading of one choice question across the attempts that already scored it.
//
// A completed attempt freezes its verdict inside `SimulationResult.answers`, while
// the review page renders the answer key live from the question. Fixing the key
// afterwards therefore leaves the two disagreeing: the attempt keeps the negative
// points it earned against the old key, next to an option now flagged "Corretta".
// This module walks the affected attempts and brings the frozen verdict — and the
// counters and totals derived from it — back in line with the current key.
import type { Prisma, PrismaClient } from '@prisma/client';
import { stripHtml } from '@/lib/utils/sanitizeHtml';
import type { StoredEvaluatedAnswer } from './openAnswerGrading';

export type AnswerCategory = 'correct' | 'wrong' | 'blank';

export type ChoicePointsConfig = {
  points: number;
  negativePoints: number;
  blankPoints: number;
};

export type CategoryDeltas = {
  correctDelta: number;
  wrongDelta: number;
  blankDelta: number;
};

/** Attempts loaded per round-trip while re-grading a simulation's results. */
const RESULT_BATCH_SIZE = 200;

/** How far back to look for the ids an answer row had before an edit recreated it. */
const VERSION_LOOKBACK = 30;

/**
 * Grade one stored choice answer against the current key.
 *
 * Mirrors `evaluateSingleSubmissionAnswer` in the simulations router — a blank
 * answer stays `isCorrect: false` there, and the two must not drift apart or a
 * re-grade would silently reclassify every unanswered question.
 */
export function gradeChoiceAnswer(
  answerId: string | null,
  correctAnswerIds: ReadonlySet<string>,
  config: ChoicePointsConfig
): { isCorrect: boolean; earnedPoints: number; category: AnswerCategory } {
  if (!answerId) {
    return { isCorrect: false, earnedPoints: config.blankPoints, category: 'blank' };
  }
  if (correctAnswerIds.has(answerId)) {
    return { isCorrect: true, earnedPoints: config.points, category: 'correct' };
  }
  return { isCorrect: false, earnedPoints: config.negativePoints, category: 'wrong' };
}

/** The category an already-stored answer was counted under when the attempt was scored. */
export function categoryOfStoredAnswer(answer: {
  answerId: string | null;
  isCorrect: boolean | null;
}): AnswerCategory {
  if (!answer.answerId) return 'blank';
  return answer.isCorrect === true ? 'correct' : 'wrong';
}

/** Counter movements for a single answer changing category. */
export function categoryDeltas(from: AnswerCategory, to: AnswerCategory): CategoryDeltas {
  const delta = (category: AnswerCategory) => (to === category ? 1 : 0) - (from === category ? 1 : 0);
  return {
    correctDelta: delta('correct'),
    wrongDelta: delta('wrong'),
    blankDelta: delta('blank'),
  };
}

/**
 * Comparable form of an answer's text: strips the rich-text markup so an edit that
 * only rewraps the option still matches the row it replaced.
 */
export function normalizeAnswerText(text: string): string {
  return stripHtml(text).replace(/\s+/g, ' ').trim().toLowerCase();
}

type SnapshotAnswer = { id?: unknown; text?: unknown; order?: unknown };

function readSnapshotAnswers(snapshot: unknown): SnapshotAnswer[] {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const answers = (snapshot as { answers?: unknown }).answers;
  return Array.isArray(answers) ? (answers as SnapshotAnswer[]) : [];
}

/**
 * Map answer ids that no longer exist onto the row that replaced them.
 *
 * Editing a question used to drop every answer row and recreate it, so attempts
 * taken before the edit point at ids that are gone — which is why the review page
 * stopped marking "La tua risposta" at all. The version snapshots still hold the
 * old rows, so the option a student picked can be recovered by text (an edit that
 * only reorders the options) or, failing that, by position.
 *
 * `snapshots` must be ordered newest-first: the most recent snapshot describes the
 * rows closest to the current ones and therefore wins.
 */
export function buildAnswerIdRemap(
  currentAnswers: Array<{ id: string; text: string; order: number }>,
  snapshots: unknown[]
): Map<string, string> {
  const currentIds = new Set(currentAnswers.map(a => a.id));
  const byText = new Map<string, string>();
  const byOrder = new Map<number, string>();
  for (const answer of currentAnswers) {
    const key = normalizeAnswerText(answer.text);
    if (key && !byText.has(key)) byText.set(key, answer.id);
    if (!byOrder.has(answer.order)) byOrder.set(answer.order, answer.id);
  }

  const resolve = (answer: SnapshotAnswer): string | undefined => {
    const text = typeof answer.text === 'string' ? normalizeAnswerText(answer.text) : '';
    if (text && byText.has(text)) return byText.get(text);
    return typeof answer.order === 'number' ? byOrder.get(answer.order) : undefined;
  };

  const remap = new Map<string, string>();
  const snapshotAnswers = snapshots.flatMap(readSnapshotAnswers);
  for (const answer of snapshotAnswers) {
    const oldId = typeof answer.id === 'string' ? answer.id : '';
    if (!oldId || currentIds.has(oldId) || remap.has(oldId)) continue;

    const matched = resolve(answer);
    if (matched) remap.set(oldId, matched);
  }

  return remap;
}

type SubjectScoreBucket = { correct: number; wrong: number; blank: number };

/** Apply the counter movements to the question's subject bucket, leaving the others untouched. */
export function applySubjectScoreDeltas(
  subjectScores: unknown,
  subjectName: string | null,
  deltas: CategoryDeltas
): Record<string, SubjectScoreBucket> | null {
  if (!subjectName || !subjectScores || typeof subjectScores !== 'object' || Array.isArray(subjectScores)) {
    return null;
  }
  const scores = { ...(subjectScores as Record<string, Partial<SubjectScoreBucket>>) };
  const bucket = scores[subjectName];
  if (!bucket) return null;

  scores[subjectName] = {
    correct: Math.max(0, (bucket.correct ?? 0) + deltas.correctDelta),
    wrong: Math.max(0, (bucket.wrong ?? 0) + deltas.wrongDelta),
    blank: Math.max(0, (bucket.blank ?? 0) + deltas.blankDelta),
  };
  return scores as Record<string, SubjectScoreBucket>;
}

/** Attempt totals repeatedly add and subtract floats; keep them from drifting into 1.4000000000000001. */
function roundScore(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export type RegradeReport = {
  /** False when the question has no usable key to re-grade against (open text, or no correct option). */
  applicable: boolean;
  updatedResults: number;
  affectedStudentIds: string[];
};

const emptyReport: RegradeReport = { applicable: false, updatedResults: 0, affectedStudentIds: [] };

type SimulationScoringFields = {
  useQuestionPoints: boolean;
  correctPoints: number;
  wrongPoints: number;
  blankPoints: number;
  maxScore: number | null;
  totalQuestions: number | null;
};

/** Same fallback the submit path uses, so a re-grade cannot move the percentage on its own. */
function effectiveMaxScore(simulation: SimulationScoringFields): number {
  return simulation.maxScore && simulation.maxScore > 0
    ? simulation.maxScore
    : (simulation.totalQuestions ?? 0) * (simulation.correctPoints ?? 1.5);
}

/**
 * Re-grade every completed attempt that answered `questionId`.
 *
 * Idempotent: an attempt already consistent with the key is left untouched, so this
 * is safe to run on every edit and safe to re-run. Answers still awaiting a manual
 * correction (`isCorrect === null`) belong to the open-answer flow and are skipped.
 */
export async function regradeChoiceQuestionResults(
  prisma: PrismaClient,
  questionId: string,
  options: { dryRun?: boolean } = {}
): Promise<RegradeReport> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      type: true,
      points: true,
      negativePoints: true,
      subject: { select: { name: true } },
      answers: {
        select: { id: true, text: true, order: true, isCorrect: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!question || question.type === 'OPEN_TEXT') return emptyReport;

  const correctAnswerIds = new Set(question.answers.filter(a => a.isCorrect).map(a => a.id));
  // A question with no correct option cannot grade anything; rewriting history from
  // it would turn every stored answer into a wrong one.
  if (correctAnswerIds.size === 0) return emptyReport;

  const versions = await prisma.questionVersion.findMany({
    where: { questionId },
    orderBy: { version: 'desc' },
    take: VERSION_LOOKBACK,
    select: { snapshot: true },
  });
  const answerIdRemap = buildAnswerIdRemap(
    question.answers,
    versions.map(v => v.snapshot as unknown)
  );

  const placements = await prisma.simulationQuestion.findMany({
    where: { questionId },
    select: { simulationId: true, customPoints: true, customNegativePoints: true },
  });

  const affectedStudentIds = new Set<string>();
  let updatedResults = 0;

  for (const placement of placements) {
    const regraded = await regradeSimulationResults(prisma, {
      placement,
      questionId,
      subjectName: question.subject?.name ?? null,
      questionPoints: { points: question.points, negativePoints: question.negativePoints },
      correctAnswerIds,
      answerIdRemap,
      dryRun: options.dryRun ?? false,
    });

    updatedResults += regraded.length;
    for (const studentId of regraded) affectedStudentIds.add(studentId);
  }

  return { applicable: true, updatedResults, affectedStudentIds: [...affectedStudentIds] };
}

const RESULT_SELECT = {
  id: true,
  studentId: true,
  answers: true,
  totalScore: true,
  correctAnswers: true,
  wrongAnswers: true,
  blankAnswers: true,
  subjectScores: true,
  simulation: {
    select: {
      useQuestionPoints: true,
      correctPoints: true,
      wrongPoints: true,
      blankPoints: true,
      maxScore: true,
      totalQuestions: true,
    },
  },
} as const;

type RegradeSimulationParams = {
  placement: { simulationId: string; customPoints: number | null; customNegativePoints: number | null };
  questionId: string;
  subjectName: string | null;
  questionPoints: { points: number; negativePoints: number };
  correctAnswerIds: ReadonlySet<string>;
  answerIdRemap: Map<string, string>;
  dryRun: boolean;
};

/** Walk one simulation's completed attempts in batches; returns the students whose score moved. */
async function regradeSimulationResults(
  prisma: PrismaClient,
  params: RegradeSimulationParams
): Promise<string[]> {
  const { placement, questionPoints } = params;
  const affected: string[] = [];
  let skip = 0;

  for (;;) {
    const results = await prisma.simulationResult.findMany({
      where: { simulationId: placement.simulationId, completedAt: { not: null } },
      orderBy: { id: 'asc' },
      skip,
      take: RESULT_BATCH_SIZE,
      select: RESULT_SELECT,
    });

    if (results.length === 0) return affected;
    skip += results.length;

    for (const result of results) {
      const { useQuestionPoints, correctPoints, wrongPoints, blankPoints } = result.simulation;
      const applied = await regradeSingleResult(prisma, {
        result,
        questionId: params.questionId,
        subjectName: params.subjectName,
        correctAnswerIds: params.correctAnswerIds,
        answerIdRemap: params.answerIdRemap,
        dryRun: params.dryRun,
        config: {
          points: placement.customPoints ?? (useQuestionPoints ? questionPoints.points : correctPoints),
          negativePoints:
            placement.customNegativePoints ?? (useQuestionPoints ? questionPoints.negativePoints : wrongPoints),
          blankPoints,
        },
      });

      if (applied) affected.push(result.studentId);
    }

    if (results.length < RESULT_BATCH_SIZE) return affected;
  }
}

type SingleResultParams = {
  result: {
    id: string;
    answers: Prisma.JsonValue;
    totalScore: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
    subjectScores: Prisma.JsonValue;
    simulation: SimulationScoringFields;
  };
  questionId: string;
  subjectName: string | null;
  correctAnswerIds: ReadonlySet<string>;
  answerIdRemap: Map<string, string>;
  config: ChoicePointsConfig;
  dryRun: boolean;
};

async function regradeSingleResult(prisma: PrismaClient, params: SingleResultParams): Promise<boolean> {
  const { result, questionId, correctAnswerIds, answerIdRemap, config } = params;

  if (!Array.isArray(result.answers)) return false;
  const answers = result.answers as unknown as StoredEvaluatedAnswer[];
  const index = answers.findIndex(a => a?.questionId === questionId);
  if (index === -1) return false;

  const stored = answers[index];
  // Still waiting on a manual correction: that verdict belongs to the open-answer flow.
  if (stored.isCorrect === null && stored.answerText) return false;

  const resolvedAnswerId = stored.answerId ? answerIdRemap.get(stored.answerId) ?? stored.answerId : null;
  const graded = gradeChoiceAnswer(resolvedAnswerId, correctAnswerIds, config);
  const previousCategory = categoryOfStoredAnswer({ answerId: resolvedAnswerId, isCorrect: stored.isCorrect });

  const verdictUnchanged =
    stored.isCorrect === graded.isCorrect &&
    (stored.earnedPoints ?? 0) === graded.earnedPoints &&
    previousCategory === graded.category;
  const idUnchanged = (stored.answerId ?? null) === resolvedAnswerId;
  if (verdictUnchanged && idUnchanged) return false;

  // Counted as it would move, but nothing is written: this is what makes the repair
  // script's --dry-run report the real numbers without touching an attempt.
  if (params.dryRun) return true;

  answers[index] = {
    ...stored,
    answerId: resolvedAnswerId,
    isCorrect: graded.isCorrect,
    earnedPoints: graded.earnedPoints,
  };

  const deltas = categoryDeltas(previousCategory, graded.category);
  const newTotalScore = roundScore(result.totalScore + (graded.earnedPoints - (stored.earnedPoints ?? 0)));
  const maxScore = effectiveMaxScore(result.simulation);
  const subjectScores = applySubjectScoreDeltas(result.subjectScores, params.subjectName, deltas);

  await prisma.simulationResult.update({
    where: { id: result.id },
    data: {
      answers: answers as unknown as Prisma.InputJsonValue,
      totalScore: newTotalScore,
      percentageScore: maxScore > 0 ? roundScore((newTotalScore / maxScore) * 100) : 0,
      correctAnswers: Math.max(0, result.correctAnswers + deltas.correctDelta),
      wrongAnswers: Math.max(0, result.wrongAnswers + deltas.wrongDelta),
      blankAnswers: Math.max(0, result.blankAnswers + deltas.blankDelta),
      ...(subjectScores ? { subjectScores: subjectScores as unknown as Prisma.InputJsonValue } : {}),
    },
  });

  return true;
}
