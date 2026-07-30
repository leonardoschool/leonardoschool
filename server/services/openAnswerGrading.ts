// Re-grading of a single open answer inside an already-scored attempt.
//
// Shared by student self-correction and by staff approving a proposed alternative
// answer: both flip one verdict and have to keep the attempt's totals consistent.
// Kept out of the routers so the two paths cannot drift apart.
import type { Prisma, PrismaClient } from '@prisma/client';

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export type StoredEvaluatedAnswer = {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  isCorrect: boolean | null;
  earnedPoints: number;
  timeSpent: number;
  /**
   * Difficulty frozen at grading time, so a later recalibration cannot move a
   * student's historical statistics. Nothing here sets it — but the rewrite below
   * must keep it, so that update spreads the existing answer instead of building a
   * fresh object. Replacing the spread with a literal would silently drop it.
   */
  difficulty?: string;
};

/**
 * Counter deltas for flipping one answer's verdict.
 *
 * `previousState` is null while an open answer awaits correction, which is why
 * this cannot be a plain boolean comparison.
 */
export function calculateVerdictDeltas(
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
  }

  return {
    correctDelta: wasCorrect ? -1 : 0,
    wrongDelta: wasWrong ? 0 : 1,
    pendingDelta: wasPending ? -1 : 0,
  };
}

export type OpenAnswerVerdictResult = {
  applied: boolean;
  newScore: number;
  correctAnswers: number;
  wrongAnswers: number;
};

/**
 * Apply a verdict to one open answer of a completed attempt and update its totals.
 *
 * Returns `applied: false` when there is nothing to do (answer not found, or the
 * verdict already matches) so callers stay idempotent. A wrong answer earns zero
 * rather than negative points: this is a correction of a judgement, not a penalty.
 */
export async function applyOpenAnswerVerdict(
  prisma: PrismaClientOrTx,
  params: { resultId: string; questionId: string; isCorrect: boolean }
): Promise<OpenAnswerVerdictResult> {
  const result = await prisma.simulationResult.findUnique({
    where: { id: params.resultId },
    select: {
      answers: true,
      totalScore: true,
      correctAnswers: true,
      wrongAnswers: true,
      pendingOpenAnswers: true,
      simulation: { select: { correctPoints: true, useQuestionPoints: true } },
    },
  });

  const unchanged = {
    applied: false,
    newScore: result?.totalScore ?? 0,
    correctAnswers: result?.correctAnswers ?? 0,
    wrongAnswers: result?.wrongAnswers ?? 0,
  };

  if (!result || !Array.isArray(result.answers)) return unchanged;

  const currentAnswers = result.answers as unknown as StoredEvaluatedAnswer[];
  const answerIndex = currentAnswers.findIndex(a => a?.questionId === params.questionId);
  if (answerIndex === -1) return unchanged;

  const answer = currentAnswers[answerIndex];
  if (answer.isCorrect === params.isCorrect) return unchanged;

  const question = result.simulation.useQuestionPoints
    ? await prisma.question.findUnique({
        where: { id: params.questionId },
        select: { points: true },
      })
    : null;

  const points = question ? question.points : result.simulation.correctPoints;
  const newPoints = params.isCorrect ? points : 0;
  const pointDifference = newPoints - (answer.earnedPoints ?? 0);

  currentAnswers[answerIndex] = { ...answer, isCorrect: params.isCorrect, earnedPoints: newPoints };

  const deltas = calculateVerdictDeltas(params.isCorrect, answer.isCorrect ?? null);
  const newScore = (result.totalScore ?? 0) + pointDifference;
  const correctAnswers = (result.correctAnswers ?? 0) + deltas.correctDelta;
  const wrongAnswers = (result.wrongAnswers ?? 0) + deltas.wrongDelta;

  await prisma.simulationResult.update({
    where: { id: params.resultId },
    data: {
      answers: currentAnswers as unknown as Prisma.InputJsonValue,
      totalScore: newScore,
      correctAnswers,
      wrongAnswers,
      pendingOpenAnswers: Math.max(0, (result.pendingOpenAnswers ?? 0) + deltas.pendingDelta),
    },
  });

  return { applied: true, newScore, correctAnswers, wrongAnswers };
}
