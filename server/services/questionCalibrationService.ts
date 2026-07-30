/**
 * Difficulty calibration job: measures every question against real student
 * performance, and proposes label changes for a human to confirm.
 *
 * It NEVER writes `Question.difficulty`. Statistics and proposals are the only
 * outputs; a difficulty changes because someone clicked accept in the review page.
 * That is the safety property of this whole feature — not a carefully tuned
 * threshold, but the fact that the machine has no hands.
 *
 * The pure logic lives in `questionCalibration.helpers.ts`; this file is the I/O:
 * paging through results, persisting the delta, and recording a verifiable summary.
 */
import type { DifficultyLevel, Prisma, PrismaClient } from '@prisma/client';
import {
  CALIBRATION,
  CALIBRATION_RESULT_WHERE,
  buildDistribution,
  checkBucketFloors,
  createCalibrationAccumulator,
  decideDifficulty,
  detectRunAnomaly,
  statsChanged,
  type CalibrationAnswer,
  type DifficultyProposal,
  type DifficultySkipReason,
  type QuestionStatsSnapshot,
} from './questionCalibration.helpers';
import {
  DEFAULT_CUTS,
  equateToAnchors,
  fitCutsFromLabels,
  parseAnchors,
  scaleConfidence,
  selectAnchors,
  type MeasuredItem,
  type ScaleCuts,
} from './difficultyScale.helpers';
import { estimateRasch } from '@/lib/statistics/rasch';
import { parseResultAnswers } from '@/server/trpc/routers/simulations.helpers';

export type CalibrationMode = 'DRY_RUN' | 'STATS_ONLY' | 'PROPOSE';

export interface CalibrationOptions {
  mode?: CalibrationMode;
  trigger?: 'CRON' | 'MANUAL';
  triggeredById?: string | null;
  /** Restrict the run to specific questions — the escape hatch after an anomalous run. */
  questionIds?: string[];
  /** Override the "propose at most weekly" gate. Manual runs usually want this. */
  forceProposals?: boolean;
  now?: Date;
}

export interface CalibrationRunSummary {
  runId: string | null;
  mode: CalibrationMode;
  resultsScanned: number;
  answersScanned: number;
  questionsWithStats: number;
  statsUpdated: number;
  proposalsCreated: number;
  skipped: Record<DifficultySkipReason, number>;
  qualityFlagged: number;
  repeatExposuresExcluded: number;
  notReachedExcluded: number;
  distributionBefore: Record<DifficultyLevel, number>;
  distributionAfter: Record<DifficultyLevel, number>;
  isAnomalous: boolean;
  anomalyReason?: string;
  durationMs: number;
  errors: string[];
}

/** One page of results per round trip: ~2 MB of JSON, comfortably inside memory. */
const RESULT_PAGE_SIZE = 200;
/** Statistics are written in chunks so a slow pooled connection can keep up. */
const WRITE_CHUNK_SIZE = 200;
/** Slack when deciding an attempt hit its time limit, in seconds. */
const TIME_LIMIT_SLACK_SECONDS = 30;

interface QuestionRecord {
  id: string;
  subjectId: string | null;
  difficulty: DifficultyLevel;
  difficultySource: 'LEGACY' | 'MANUAL' | 'AUTO';
  status: string;
  stats: QuestionStatsSnapshot;
  qualityFlagCode: string | null;
  discriminationIndex: number | null;
}

export async function runQuestionCalibration(
  prisma: PrismaClient,
  options: CalibrationOptions = {}
): Promise<CalibrationRunSummary> {
  const mode = options.mode ?? 'STATS_ONLY';
  const now = options.now ?? new Date();
  const startedAt = Date.now();
  const errors: string[] = [];

  const questions = await loadQuestionIndex(prisma, options.questionIds);
  const knownIds = new Set(questions.keys());

  const accumulator = createCalibrationAccumulator(knownIds);
  let resultsScanned = 0;
  try {
    resultsScanned = await scanResults(prisma, accumulator);
  } catch (error) {
    errors.push(`scanResults: ${error instanceof Error ? error.message : String(error)}`);
  }
  const aggregate = accumulator.finish();

  // Derived once and shared: the same numbers feed the stats write, the run summary and
  // the decision rule, so none of the three can quietly disagree with the others.
  const signals = deriveQualitySignals(aggregate);
  const qualityFlagged = [...signals.values()].filter((s) => s.qualityFlagCode !== null).length;

  const statsUpdated =
    mode === 'DRY_RUN' ? 0 : await persistStats(prisma, questions, aggregate.stats, signals, now, errors);

  const distributionBefore = buildDistribution([...questions.values()].map((q) => q.difficulty));

  let proposals: (DifficultyProposal & { questionId: string; fromLevel: DifficultyLevel })[] = [];
  const skipped = emptySkipCounters();

  const shouldPropose =
    mode === 'PROPOSE' && (options.forceProposals || (await proposalWindowOpen(prisma, now)));

  if (shouldPropose && aggregate.responses.correct.length > 0) {
    const estimate = estimateRasch(aggregate.responses);
    const scales = await resolveSubjectScales(
      prisma,
      groupMeasuredItemsBySubject(aggregate, estimate, questions),
      now,
      // Only PROPOSE reaches here, so the scale is always allowed to be written; a
      // dry run never gets this far and therefore never freezes a scale by accident.
      true,
      errors
    );
    const candidates = measureQuestions(
      aggregate,
      estimate,
      questions,
      await loadLastAppliedChanges(prisma),
      scales,
      signals
    );
    for (const candidate of candidates) {
      const decision = decideDifficulty({ ...candidate.decisionInput, now });
      if (decision.kind === 'skipped') {
        skipped[decision.reason] += 1;
        continue;
      }
      proposals.push({
        ...decision,
        questionId: candidate.questionId,
        fromLevel: candidate.decisionInput.currentLevel,
      });
    }
  }

  // Supply check. The automatic simulation builders draw by (subject, level) with equal
  // quotas: a bucket that runs dry makes them deliver fewer questions than asked, with
  // no error anywhere. Proposals that would drain one are held back rather than the
  // whole batch — the bucket keeps its questions and they come back once it has grown.
  //
  // Only a full-bank run can answer it: with `questionIds` set the loaded index is a
  // slice, every bucket would look empty, and the check would block everything.
  const starving = options.questionIds?.length ? [] : checkBucketFloors(
    [...questions.values()]
      .filter((q) => q.status === 'PUBLISHED')
      .map((q) => ({ subjectId: q.subjectId, level: q.difficulty })),
    proposals.map((p) => ({
      subjectId: questions.get(p.questionId)?.subjectId ?? null,
      fromLevel: p.fromLevel,
    }))
  );
  if (starving.length > 0) {
    const drained = new Set(starving.map((v) => `${v.subjectId}::${v.level}`));
    const kept = proposals.filter((proposal) => {
      const subjectId = questions.get(proposal.questionId)?.subjectId ?? null;
      return !subjectId || !drained.has(`${subjectId}::${proposal.fromLevel}`);
    });
    skipped.BUCKET_FLOOR = proposals.length - kept.length;
    proposals = kept;
  }

  const anomaly = detectRunAnomaly(proposals, await medianPreviousProposalCount(prisma));
  if (anomaly.anomalous) proposals = [];

  const distributionAfter = { ...distributionBefore };
  for (const proposal of proposals) {
    distributionAfter[proposal.fromLevel] -= 1;
    distributionAfter[proposal.toLevel] += 1;
  }

  const summary: CalibrationRunSummary = {
    runId: null,
    mode,
    resultsScanned,
    answersScanned: aggregate.answersCounted,
    questionsWithStats: aggregate.stats.size,
    statsUpdated,
    proposalsCreated: proposals.length,
    skipped,
    qualityFlagged,
    repeatExposuresExcluded: aggregate.repeatExposuresExcluded,
    notReachedExcluded: aggregate.notReachedExcluded,
    distributionBefore,
    distributionAfter,
    isAnomalous: anomaly.anomalous,
    anomalyReason: anomaly.reason,
    durationMs: Date.now() - startedAt,
    errors,
  };

  if (mode === 'DRY_RUN') return summary;

  const runId = await recordRun(prisma, summary, options, errors);
  summary.runId = runId;
  // The worklist is REPLACED, not added to — including when the new batch is empty.
  // A proposal that no longer holds has to disappear, or the queue and the header badge
  // keep advertising a change the current data no longer supports.
  //
  // An anomalous run is the one exception: it publishes nothing and clears nothing,
  // because its own measurement is the thing under suspicion and the standing worklist
  // was built by a run that was not.
  if (shouldPropose && !anomaly.anomalous && runId) {
    await syncProposals(prisma, runId, proposals, options.questionIds ?? null, now, errors);
  }
  return summary;
}

function emptySkipCounters(): Record<DifficultySkipReason, number> {
  return {
    ALREADY_CORRECT: 0,
    LOW_EVIDENCE: 0,
    COOLDOWN: 0,
    UNCONNECTED: 0,
    QUALITY_FLAG: 0,
    BUCKET_FLOOR: 0,
  };
}

/** Every question the run may touch, with the numbers it currently carries. */
async function loadQuestionIndex(
  prisma: PrismaClient,
  questionIds?: string[]
): Promise<Map<string, QuestionRecord>> {
  const rows = await prisma.question.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      ...(questionIds && questionIds.length > 0 ? { id: { in: questionIds } } : {}),
    },
    select: {
      id: true,
      subjectId: true,
      difficulty: true,
      difficultySource: true,
      status: true,
      qualityFlagCode: true,
      discriminationIndex: true,
      timesAnswered: true,
      timesCorrect: true,
      timesWrong: true,
      timesSkipped: true,
      timesGraded: true,
      avgCorrectRate: true,
      avgTimeSeconds: true,
    },
  });

  const index = new Map<string, QuestionRecord>();
  for (const row of rows) {
    index.set(row.id, {
      id: row.id,
      subjectId: row.subjectId,
      difficulty: row.difficulty,
      difficultySource: row.difficultySource,
      status: row.status,
      qualityFlagCode: row.qualityFlagCode ?? null,
      discriminationIndex: row.discriminationIndex ?? null,
      stats: {
        timesAnswered: row.timesAnswered,
        timesCorrect: row.timesCorrect,
        timesWrong: row.timesWrong,
        timesSkipped: row.timesSkipped,
        timesGraded: row.timesGraded,
        avgCorrectRate: row.avgCorrectRate,
        avgTimeSeconds: row.avgTimeSeconds,
      },
    });
  }
  return index;
}

/**
 * Walks every eligible result with a cursor, oldest first.
 *
 * Order matters: the accumulator counts only a student's FIRST encounter with a
 * question, so the pages must arrive in the order the attempts happened. `skip` is
 * deliberately avoided — on a growing table an offset scan gets slower every page.
 */
async function scanResults(
  prisma: PrismaClient,
  accumulator: ReturnType<typeof createCalibrationAccumulator>
): Promise<number> {
  const questionOrderCache = new Map<string, Map<string, { order: number; sectionIndex: number | null }>>();
  let cursor: string | undefined;
  let scanned = 0;

  for (;;) {
    const page = await prisma.simulationResult.findMany({
      where: CALIBRATION_RESULT_WHERE,
      select: {
        id: true,
        studentId: true,
        simulationId: true,
        answers: true,
        durationSeconds: true,
        completedAt: true,
        simulation: {
          select: { id: true, durationMinutes: true, isPaperBased: true, hasSections: true, sections: true },
        },
      },
      orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
      take: RESULT_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (page.length === 0) break;

    for (const result of page) {
      const positions = resolveQuestionPositions(result.simulation, questionOrderCache);
      const answers: CalibrationAnswer[] = parseResultAnswers(result.answers).map((answer) => {
        const position = positions.get(answer.questionId);
        return {
          questionId: answer.questionId,
          answerId: answer.answerId,
          answerText: answer.answerText,
          isCorrect: answer.isCorrect,
          timeSpent: answer.timeSpent,
          order: position?.order ?? 0,
          sectionIndex: position?.sectionIndex ?? null,
        };
      });

      accumulator.addAttempt({
        studentId: result.studentId,
        answers,
        isPaperBased: result.simulation.isPaperBased,
        ranOutOfTime: hitTimeLimit(result.durationSeconds, result.simulation.durationMinutes),
      });
      scanned += 1;
    }

    cursor = page[page.length - 1].id;
    if (page.length < RESULT_PAGE_SIZE) break;
  }

  return scanned;
}

type SimulationForPositions = {
  id: string;
  hasSections: boolean;
  sections: Prisma.JsonValue | null;
};

/**
 * Question positions within a simulation, cached per simulation because dozens of
 * attempts share one. Only the not-reached detector uses them, but computing them
 * here keeps that detector a pure function.
 */
function resolveQuestionPositions(
  simulation: SimulationForPositions,
  cache: Map<string, Map<string, { order: number; sectionIndex: number | null }>>
): Map<string, { order: number; sectionIndex: number | null }> {
  const cached = cache.get(simulation.id);
  if (cached) return cached;

  const positions = new Map<string, { order: number; sectionIndex: number | null }>();
  if (simulation.hasSections && Array.isArray(simulation.sections)) {
    simulation.sections.forEach((rawSection, sectionIndex) => {
      const section = rawSection as { questionIds?: unknown };
      if (!Array.isArray(section?.questionIds)) return;
      section.questionIds.forEach((questionId, order) => {
        if (typeof questionId === 'string') positions.set(questionId, { order, sectionIndex });
      });
    });
  }
  cache.set(simulation.id, positions);
  return positions;
}

function hitTimeLimit(durationSeconds: number | null, durationMinutes: number): boolean {
  if (!durationSeconds || durationMinutes <= 0) return false;
  return durationSeconds >= durationMinutes * 60 - TIME_LIMIT_SLACK_SECONDS;
}

/**
 * Writes only the questions whose numbers actually moved.
 *
 * Without that filter every quiet night would rewrite the entire bank, which on a
 * pooled Neon connection is slow enough to blow the function's time budget.
 */
async function persistStats(
  prisma: PrismaClient,
  questions: Map<string, QuestionRecord>,
  stats: Map<string, QuestionStatsSnapshot>,
  signals: Map<string, QualitySignals>,
  now: Date,
  errors: string[]
): Promise<number> {
  const pending: {
    id: string;
    next: QuestionStatsSnapshot;
    discriminationIndex: number | null;
    qualityFlagCode: string | null;
  }[] = [];

  for (const [questionId, next] of stats) {
    const record = questions.get(questionId);
    if (!record) continue;
    const { discriminationIndex, qualityFlagCode } = signals.get(questionId) ?? {
      discriminationIndex: null,
      qualityFlagCode: null,
    };
    // The quality signals travel with the counts. Computing them and dropping them —
    // as this did — left "N domande da verificare" permanently at zero while the
    // decision rule was already refusing to touch the very questions it never showed.
    const moved =
      statsChanged(record.stats, next) ||
      record.qualityFlagCode !== qualityFlagCode ||
      !sameDiscrimination(record.discriminationIndex, discriminationIndex);
    if (!moved) continue;
    pending.push({ id: questionId, next, discriminationIndex, qualityFlagCode });
  }

  let written = 0;
  for (let i = 0; i < pending.length; i += WRITE_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + WRITE_CHUNK_SIZE);
    try {
      await prisma.$transaction(
        chunk.map(({ id, next, discriminationIndex, qualityFlagCode }) =>
          prisma.question.update({
            where: { id },
            data: {
              timesAnswered: next.timesAnswered,
              timesCorrect: next.timesCorrect,
              timesWrong: next.timesWrong,
              timesSkipped: next.timesSkipped,
              timesGraded: next.timesGraded,
              avgCorrectRate: next.avgCorrectRate,
              avgTimeSeconds: next.avgTimeSeconds,
              discriminationIndex,
              qualityFlagCode,
              statsComputedAt: now,
            },
          })
        )
      );
      written += chunk.length;
    } catch (error) {
      errors.push(`persistStats chunk ${i}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return written;
}

function sameDiscrimination(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < 1e-6;
}

interface MeasuredCandidate {
  questionId: string;
  decisionInput: Omit<Parameters<typeof decideDifficulty>[0], 'now'>;
}

/** The anchored scale of one subject: where to slide its scores, and where to cut. */
interface SubjectScale {
  shift: number;
  cuts: ScaleCuts;
}

/**
 * Turns the response matrix into per-question measurements.
 *
 * Every score is moved onto its subject's anchored scale before being compared with
 * that subject's cuts. Without the shift the comparison would be against a zero point
 * that this run's cohort defines — the exact drift the anchors exist to remove.
 */
function measureQuestions(
  aggregate: ReturnType<ReturnType<typeof createCalibrationAccumulator>['finish']>,
  estimate: ReturnType<typeof estimateRasch>,
  questions: Map<string, QuestionRecord>,
  lastApplied: Map<string, { at: Date; sampleSize: number }>,
  scales: Map<string, SubjectScale>,
  signals: Map<string, QualitySignals>
): MeasuredCandidate[] {
  const candidates: MeasuredCandidate[] = [];

  aggregate.questionIds.forEach((questionId, itemIndex) => {
    const record = questions.get(questionId);
    const stats = aggregate.stats.get(questionId);
    if (!record || !stats) return;

    const qualityFlagCode = signals.get(questionId)?.qualityFlagCode ?? null;
    const scale = scales.get(record.subjectId ?? '') ?? { shift: 0, cuts: DEFAULT_CUTS };

    candidates.push({
      questionId,
      decisionInput: {
        currentLevel: record.difficulty,
        source: record.difficultySource,
        score: estimate.itemDifficulty[itemIndex] + scale.shift,
        standardError: estimate.itemStandardError[itemIndex],
        sampleSize: stats.timesGraded,
        cuts: scale.cuts,
        connected: estimate.itemConnected[itemIndex],
        qualityFlagCode,
        lastApplied: lastApplied.get(questionId) ?? null,
      },
    });
  });

  return candidates;
}

/**
 * Builds the per-subject measured view the scale code works on.
 *
 * `humanLabel` is filled only for `MANUAL` questions. `LEGACY` is the column default
 * wearing a teacher's clothes, and `AUTO` is the system's own past output — fitting
 * the cuts on either would either encode a default or close a feedback loop where the
 * machine keeps confirming itself.
 */
function groupMeasuredItemsBySubject(
  aggregate: ReturnType<ReturnType<typeof createCalibrationAccumulator>['finish']>,
  estimate: ReturnType<typeof estimateRasch>,
  questions: Map<string, QuestionRecord>
): Map<string, MeasuredItem[]> {
  const bySubject = new Map<string, MeasuredItem[]>();

  aggregate.questionIds.forEach((questionId, itemIndex) => {
    const record = questions.get(questionId);
    const stats = aggregate.stats.get(questionId);
    if (!record || !record.subjectId || !stats) return;

    const list = bySubject.get(record.subjectId) ?? [];
    list.push({
      id: questionId,
      subjectId: record.subjectId,
      score: estimate.itemDifficulty[itemIndex],
      sampleSize: stats.timesGraded,
      connected: estimate.itemConnected[itemIndex],
      humanLabel: record.difficultySource === 'MANUAL' ? record.difficulty : null,
    });
    bySubject.set(record.subjectId, list);
  });

  return bySubject;
}

/**
 * Resolves each subject's scale, creating it the first time and equating to it after.
 *
 * A subject whose anchors cannot be re-measured this run keeps its stored cuts with a
 * zero shift rather than silently re-centring: refusing to equate is a much smaller
 * error than equating against a scale that is no longer the same one.
 */
async function resolveSubjectScales(
  prisma: PrismaClient,
  bySubject: Map<string, MeasuredItem[]>,
  now: Date,
  persist: boolean,
  errors: string[]
): Promise<Map<string, SubjectScale>> {
  const scales = new Map<string, SubjectScale>();
  const stored = await prisma.difficultyScale.findMany({
    where: { subjectId: { in: [...bySubject.keys()] } },
  });
  const storedBySubject = new Map(stored.map((row) => [row.subjectId, row]));

  for (const [subjectId, items] of bySubject) {
    try {
      const existing = storedBySubject.get(subjectId);

      if (!existing) {
        const anchors = selectAnchors(items, CALIBRATION.anchorsPerSubject);
        if (anchors.length < CALIBRATION.anchorsMinimum) {
          // Too thin to pin a scale to. Defaults keep the decision rule running while
          // the subject accumulates data; nothing is frozen prematurely.
          scales.set(subjectId, { shift: 0, cuts: DEFAULT_CUTS });
          continue;
        }
        const fit = fitCutsFromLabels(items, 0);
        const cuts = fit?.cuts ?? DEFAULT_CUTS;
        scales.set(subjectId, { shift: 0, cuts });

        if (persist) {
          await prisma.difficultyScale.create({
            data: {
              subjectId,
              anchorQuestionIds: anchors as unknown as Prisma.InputJsonValue,
              cutEasyMedium: cuts.easyMedium,
              cutMediumHard: cuts.mediumHard,
              frozenAt: now,
              confidence: scaleConfidence(anchors.length, fit?.sampleSize ?? 0),
              fitKappa: fit?.kappa ?? null,
              fitSampleSize: fit?.sampleSize ?? 0,
            },
          });
        }
        continue;
      }

      const anchors = parseAnchors(existing.anchorQuestionIds);
      const currentScores = new Map(items.map((item) => [item.id, item.score]));
      const equating = equateToAnchors(anchors, currentScores);
      const cuts: ScaleCuts = {
        easyMedium: existing.cutEasyMedium,
        mediumHard: existing.cutMediumHard,
      };
      scales.set(subjectId, { shift: equating?.shift ?? 0, cuts });

      if (persist && equating) {
        await prisma.difficultyScale.update({
          where: { subjectId },
          data: { lastEquatingRmsd: equating.rmsd, lastEquatedAt: now },
        });
      }
    } catch (error) {
      errors.push(
        `resolveSubjectScales ${subjectId}: ${error instanceof Error ? error.message : String(error)}`
      );
      scales.set(subjectId, { shift: 0, cuts: DEFAULT_CUTS });
    }
  }

  return scales;
}

/**
 * The most recent confirmed change per question, for the cooldown. Only APPLIED rows
 * count: a proposal that was rejected, or one still waiting, has not changed
 * anything and must not hold the question back.
 */
async function loadLastAppliedChanges(
  prisma: PrismaClient
): Promise<Map<string, { at: Date; sampleSize: number }>> {
  const rows = await prisma.questionDifficultyAudit.findMany({
    where: { status: 'APPLIED' },
    orderBy: { createdAt: 'desc' },
    select: { questionId: true, createdAt: true, decidedAt: true, sampleSize: true },
  });

  const latest = new Map<string, { at: Date; sampleSize: number }>();
  for (const row of rows) {
    // Rows arrive newest first, so the first one seen per question is the one to keep.
    if (latest.has(row.questionId)) continue;
    latest.set(row.questionId, {
      at: row.decidedAt ?? row.createdAt,
      sampleSize: row.sampleSize,
    });
  }
  return latest;
}

/**
 * A question the strong students get wrong more often than the weak ones is very
 * likely mis-keyed, not hard. Flagged for a human, never relabelled — and the wording
 * around it must stay "worth a look", because a low correlation can also mean the
 * item covers a topic unlike the rest of its subject.
 */
interface QualitySignals {
  discriminationIndex: number | null;
  qualityFlagCode: string | null;
}

/** The quality read of every measured question, in one pass over the aggregate. */
function deriveQualitySignals(
  aggregate: ReturnType<ReturnType<typeof createCalibrationAccumulator>['finish']>
): Map<string, QualitySignals> {
  const signals = new Map<string, QualitySignals>();
  for (const [questionId, stats] of aggregate.stats) {
    const discriminationIndex = aggregate.discrimination.get(questionId) ?? null;
    signals.set(questionId, {
      discriminationIndex,
      qualityFlagCode: deriveQualityFlag(discriminationIndex, stats),
    });
  }
  return signals;
}

function deriveQualityFlag(
  discrimination: number | null,
  stats: QuestionStatsSnapshot
): string | null {
  if (discrimination === null) return null;
  if (discrimination < 0) return 'KEY_SUSPECT';
  if (
    discrimination <= CALIBRATION.lowDiscriminationThreshold &&
    stats.timesGraded >= CALIBRATION.minSampleForDiscrimination
  ) {
    return 'LOW_DISCRIMINATION';
  }
  return null;
}

/**
 * Proposals are recomputed at most weekly. A correct rate does not move in 24 hours,
 * and a queue that re-proposes the same changes every night is a queue the staff
 * learns to ignore. Read from the run history so the rule is data-driven rather than
 * a magic weekday check.
 */
async function proposalWindowOpen(prisma: PrismaClient, now: Date): Promise<boolean> {
  const lastWithProposals = await prisma.questionCalibrationRun.findFirst({
    where: { mode: 'PROPOSE', proposalsCreated: { gt: 0 } },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  });
  if (!lastWithProposals) return true;
  const elapsedDays =
    (now.getTime() - lastWithProposals.startedAt.getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays >= CALIBRATION.proposalIntervalDays;
}

/** Median proposal count of previous healthy runs, for the volume-spike guard. */
async function medianPreviousProposalCount(prisma: PrismaClient): Promise<number | null> {
  const previous = await prisma.questionCalibrationRun.findMany({
    where: { mode: 'PROPOSE', isAnomalous: false, proposalsCreated: { gt: 0 } },
    orderBy: { startedAt: 'desc' },
    take: 10,
    select: { proposalsCreated: true },
  });
  if (previous.length === 0) return null;
  const counts = previous.map((run) => run.proposalsCreated).sort((a, b) => a - b);
  const middle = Math.floor(counts.length / 2);
  return counts.length % 2 === 0 ? (counts[middle - 1] + counts[middle]) / 2 : counts[middle];
}

async function recordRun(
  prisma: PrismaClient,
  summary: CalibrationRunSummary,
  options: CalibrationOptions,
  errors: string[]
): Promise<string | null> {
  try {
    const run = await prisma.questionCalibrationRun.create({
      data: {
        mode: summary.mode,
        trigger: options.trigger ?? 'CRON',
        triggeredById: options.triggeredById ?? null,
        finishedAt: new Date(),
        durationMs: summary.durationMs,
        resultsScanned: summary.resultsScanned,
        answersScanned: summary.answersScanned,
        questionsWithStats: summary.questionsWithStats,
        statsUpdated: summary.statsUpdated,
        proposalsCreated: summary.proposalsCreated,
        skippedLowEvidence: summary.skipped.LOW_EVIDENCE,
        skippedCooldown: summary.skipped.COOLDOWN,
        skippedAlreadyCorrect: summary.skipped.ALREADY_CORRECT,
        skippedUnconnected: summary.skipped.UNCONNECTED,
        skippedQualityFlag: summary.skipped.QUALITY_FLAG,
        skippedBucketFloor: summary.skipped.BUCKET_FLOOR,
        qualityFlagged: summary.qualityFlagged,
        distributionBefore: summary.distributionBefore,
        distributionAfter: summary.distributionAfter,
        isAnomalous: summary.isAnomalous,
        anomalyReason: summary.anomalyReason ?? null,
        errors,
      },
      select: { id: true },
    });
    return run.id;
  } catch (error) {
    errors.push(`recordRun: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Replaces the undecided worklist with the one this run computed.
 *
 * Deleting the PROPOSED rows first is what makes the job idempotent: an undecided
 * proposal is a worklist entry, not history, so regenerating it is correct. Rows the
 * staff has already acted on carry a different status and are never touched.
 *
 * The delete covers the whole scanned scope, not just the questions being re-proposed.
 * Scoping it to the new batch left behind every proposal that had stopped qualifying —
 * evidence shifted, cooldown started, quality flag raised — and those kept their
 * mirrored `suggestedDifficulty` and their place in the badge count for ninety days.
 */
async function syncProposals(
  prisma: PrismaClient,
  runId: string,
  proposals: (DifficultyProposal & { questionId: string; fromLevel: DifficultyLevel })[],
  scope: string[] | null,
  now: Date,
  errors: string[]
): Promise<void> {
  const inScope = scope?.length ? { questionId: { in: scope } } : {};
  try {
    await prisma.questionDifficultyAudit.deleteMany({
      where: { status: 'PROPOSED', ...inScope },
    });
    // Clear the mirror too: it is what the question lists read, so a stale value there
    // shows a pending change on a question that no longer has one.
    await prisma.question.updateMany({
      where: {
        suggestedDifficulty: { not: null },
        ...(scope?.length ? { id: { in: scope } } : {}),
      },
      data: { suggestedDifficulty: null, suggestionConfidence: null, suggestedAt: null },
    });
    if (proposals.length === 0) return;

    await prisma.questionDifficultyAudit.createMany({
      data: proposals.map((proposal) => ({
        questionId: proposal.questionId,
        runId,
        status: 'PROPOSED' as const,
        trigger: 'CRON',
        fromLevel: proposal.fromLevel,
        toLevel: proposal.toLevel,
        reasonCode: proposal.reasonCode,
        reasonMetadata: {
          ...proposal.metadata,
          contradictsHuman: proposal.contradictsHuman,
        },
        difficultyScore: proposal.metadata.score,
        confidence: proposal.confidence,
        sampleSize: proposal.metadata.sampleSize,
      })),
    });

    // Mirror the current proposal onto the question so lists and the question page
    // can show it without joining the audit table on every read.
    await prisma.$transaction(
      proposals.map((proposal) =>
        prisma.question.update({
          where: { id: proposal.questionId },
          data: {
            suggestedDifficulty: proposal.toLevel,
            suggestionConfidence: proposal.confidence,
            suggestedAt: now,
            difficultyScore: proposal.metadata.score,
          },
        })
      )
    );
  } catch (error) {
    errors.push(`persistProposals: ${error instanceof Error ? error.message : String(error)}`);
  }
}
