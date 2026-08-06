/**
 * Pure logic of the difficulty calibration: aggregation, quality signals and the
 * decision rule. No Prisma calls, no I/O — the service around it does that, so
 * everything that could get the maths wrong is unit-testable.
 *
 * The one thing to keep in mind while reading: this module never decides to WRITE
 * anything. It produces proposals. A difficulty only ever changes because a human
 * clicked, which is what makes the whole feature safe by construction rather than
 * by careful thresholds.
 */
import type { DifficultyLevel, DifficultySource, Prisma } from '@prisma/client';
import { classify } from '@/lib/statistics/agreement';
import {
  accumulatePointBiserial,
  createPointBiserialAccumulator,
  finalizePointBiserial,
  type PointBiserialAccumulator,
} from '@/lib/statistics/discrimination';
import { normalCdf } from '@/lib/statistics/intervals';
import type { RaschResponses } from '@/lib/statistics/rasch';
import { classifyAnswerOutcome, type AnswerOutcome } from '@/server/trpc/routers/simulations.helpers';

export const CALIBRATION = {
  // ── Decision rule ─────────────────────────────────────────────────────────
  /** Dead band around a cut, in logits: stops a question flapping across it. */
  hysteresis: 0.2,
  /** The whole 95% interval must clear the cut, not just the point estimate. */
  confidenceZ: 1.96,
  /**
   * Inflates every standard error. Local independence is violated in these papers
   * (shared reading passages, shared figures), so the nominal interval is
   * optimistic. Not rigorous — deliberately prudent.
   */
  designEffect: 1.2,

  // ── Cooldown: both conditions, not either ─────────────────────────────────
  cooldownDays: 30,
  cooldownNewResponses: 30,

  /** Below this, no difficultyScore is published at all: it would be noise. */
  minSampleForScore: 20,

  // ── Quality signals ───────────────────────────────────────────────────────
  minSampleForDiscrimination: 30,
  /** At or below this, the item stops agreeing with the rest of the test. */
  lowDiscriminationThreshold: 0.05,
  keyCheckMinPicks: 8,
  keyCheckMarginInSd: 0.5,

  /**
   * Above this share of omissions, a question's measured difficulty says more about
   * avoidance than about the question.
   *
   * These papers carry a penalty for a wrong answer and none for a blank, so leaving
   * one out is a tactic, not a failed attempt — and the model counts every blank as an
   * error. That is defensible on average and misleading at the extremes: a question a
   * third of the room skips on sight is measured as brutally hard whether it is hard or
   * merely long, off-syllabus, or intimidating to look at.
   *
   * Flagged rather than corrected. Guessing what a skipped question would have scored
   * means inventing data, and the honest move is to say the measure cannot be trusted
   * and leave the label alone.
   */
  highOmissionShare: 0.4,
  minSampleForOmission: 20,

  // ── Scale bootstrap ───────────────────────────────────────────────────────
  anchorsPerSubject: 50,
  anchorsMinimum: 20,
  minGoldSetForCuts: 40,
  minBandWidth: 0.4,
  /** Fallback cuts, used until a subject has enough labelled data to fit its own. */
  defaultCutEasyMedium: -0.65,
  defaultCutMediumHard: 0.65,

  // ── Run-level sanity ──────────────────────────────────────────────────────
  anomalyVolumeMultiple: 3,
  anomalyAbsoluteCount: 150,
  anomalyOneDirectionShare: 0.8,
  anomalyMinCountForShare: 20,

  /** Accepting every proposal must not starve a (subject, level) bucket. */
  minPublishedPerBucket: 20,

  /**
   * Off until `scripts/audit-timespent-reliability.ts` proves the signal is
   * trustworthy. If some client path writes `timeSpent: 0` for questions the
   * student actually read, the detector would drop too many blanks and soften
   * every question — the mirror image of the drift we are guarding against, and
   * the more insidious one because nobody complains when questions get easier.
   */
  notReachedDetection: false,

  /**
   * Proposals are recomputed at most this often. A correct rate does not move in
   * 24 hours, and re-proposing the same changes nightly turns the review queue
   * into noise the staff learns to ignore.
   */
  proposalIntervalDays: 7,
} as const;

/**
 * Results the calibration is allowed to learn from.
 *
 * A student's own practice quiz measures nothing about difficulty: they pick the
 * pool, nobody supervises, there is no time pressure. Excluded at the root rather
 * than filtered downstream, and exported so the service, the backfill script and
 * the UI cannot drift apart on what "counts".
 */
export const CALIBRATION_RESULT_WHERE = {
  completedAt: { not: null },
  simulation: {
    creatorRole: { not: 'STUDENT' },
    type: { not: 'QUICK_QUIZ' },
  },
} satisfies Prisma.SimulationResultWhereInput;

// ==================== AGGREGATION ====================

export interface CalibrationAnswer {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  isCorrect: boolean | null;
  timeSpent: number;
  /** Position of the question inside the attempt (or inside its section). */
  order: number;
  /** Section index, or null when the simulation has no sections. */
  sectionIndex: number | null;
}

export interface CalibrationAttempt {
  studentId: string;
  answers: CalibrationAnswer[];
  /** Paper results carry no timing, so the not-reached detector must stay off. */
  isPaperBased: boolean;
  /** Whether the attempt hit the time limit; only then can anything be unreached. */
  ranOutOfTime: boolean;
}

export interface QuestionStatsSnapshot {
  timesAnswered: number;
  timesCorrect: number;
  timesWrong: number;
  timesSkipped: number;
  /** Denominator of avgCorrectRate: everything that entered the estimate. */
  timesGraded: number;
  /** Percentage 0..100, or null when nothing has been graded yet. */
  avgCorrectRate: number | null;
  avgTimeSeconds: number | null;
}

export interface CalibrationAggregate {
  stats: Map<string, QuestionStatsSnapshot>;
  /** questionId -> point-biserial, or null when unmeasurable. */
  discrimination: Map<string, number | null>;
  /** Response matrix for the estimator. */
  responses: RaschResponses;
  /** Item index -> question id. */
  questionIds: string[];
  attemptsCounted: number;
  answersCounted: number;
  repeatExposuresExcluded: number;
  notReachedExcluded: number;
  pendingExcluded: number;
}

interface MutableCounters {
  answered: number;
  correct: number;
  wrong: number;
  blank: number;
  pending: number;
  timeSum: number;
  timeCount: number;
  discrimination: PointBiserialAccumulator;
}

/**
 * Marks the trailing run of untouched blanks in an attempt as "not reached".
 *
 * A blank at the end of a timed test usually means the clock ran out, not that the
 * question was hard; counting those would systematically harden whatever sits last
 * in every simulation. The earliest blank of the run is kept, because that one is a
 * genuine omission — the student was there and moved on.
 *
 * Sections are handled independently: each has its own clock, so each has its own
 * tail.
 */
export function detectNotReached(
  answers: readonly CalibrationAnswer[],
  opts: { isPaperBased: boolean; ranOutOfTime: boolean }
): Set<string> {
  const unreached = new Set<string>();
  if (opts.isPaperBased || !opts.ranOutOfTime) return unreached;

  const bySection = new Map<number, CalibrationAnswer[]>();
  for (const answer of answers) {
    const key = answer.sectionIndex ?? -1;
    const bucket = bySection.get(key);
    if (bucket) bucket.push(answer);
    else bySection.set(key, [answer]);
  }

  for (const sectionAnswers of bySection.values()) {
    const ordered = [...sectionAnswers].sort((a, b) => a.order - b.order);
    const tail: CalibrationAnswer[] = [];
    for (let i = ordered.length - 1; i >= 0; i--) {
      const answer = ordered[i];
      const untouchedBlank =
        classifyAnswerOutcome(answer) === 'blank' && answer.timeSpent === 0;
      if (!untouchedBlank) break;
      tail.push(answer);
    }
    // Keep the first blank of the run: it is an omission, not a question never seen.
    for (let i = 0; i < tail.length - 1; i++) unreached.add(tail[i].questionId);
  }

  return unreached;
}

export interface CalibrationAccumulator {
  addAttempt(attempt: CalibrationAttempt): void;
  finish(): CalibrationAggregate;
}

/**
 * Streaming aggregator: the service feeds it one page of results at a time, so the
 * whole bank can be measured without ever holding every attempt in memory.
 *
 * `knownQuestionIds` limits what is counted to the questions the caller cares
 * about — answers pointing at deleted or archived questions are simply skipped.
 */
export function createCalibrationAccumulator(
  knownQuestionIds: ReadonlySet<string>,
  opts: { notReachedDetection?: boolean } = {}
): CalibrationAccumulator {
  const notReachedDetection = opts.notReachedDetection ?? CALIBRATION.notReachedDetection;

  const counters = new Map<string, MutableCounters>();
  const questionIndex = new Map<string, number>();
  const questionIds: string[] = [];
  const studentIndex = new Map<string, number>();
  /** Question indices already counted for each student index. */
  const seenByStudent = new Map<number, Set<number>>();

  const personIndex: number[] = [];
  const itemIndex: number[] = [];
  const correctFlags: number[] = [];

  let attemptsCounted = 0;
  let answersCounted = 0;
  let repeatExposuresExcluded = 0;
  let notReachedExcluded = 0;
  let pendingExcluded = 0;

  const indexOfQuestion = (questionId: string): number => {
    const existing = questionIndex.get(questionId);
    if (existing !== undefined) return existing;
    const next = questionIds.length;
    questionIndex.set(questionId, next);
    questionIds.push(questionId);
    return next;
  };

  const countersFor = (questionId: string): MutableCounters => {
    const existing = counters.get(questionId);
    if (existing) return existing;
    const fresh: MutableCounters = {
      answered: 0,
      correct: 0,
      wrong: 0,
      blank: 0,
      pending: 0,
      timeSum: 0,
      timeCount: 0,
      discrimination: createPointBiserialAccumulator(),
    };
    counters.set(questionId, fresh);
    return fresh;
  };

  return {
    addAttempt(attempt) {
      let studentIdx = studentIndex.get(attempt.studentId);
      if (studentIdx === undefined) {
        studentIdx = studentIndex.size;
        studentIndex.set(attempt.studentId, studentIdx);
      }
      const seen = seenByStudent.get(studentIdx) ?? new Set<number>();
      seenByStudent.set(studentIdx, seen);

      const unreached = notReachedDetection
        ? detectNotReached(attempt.answers, attempt)
        : new Set<string>();

      // First pass: decide what counts, and score the attempt. The attempt total is
      // needed before the second pass because the discrimination of each item is
      // measured against the REST of the attempt.
      const counted: { answer: CalibrationAnswer; outcome: AnswerOutcome; itemIdx: number }[] = [];
      for (const answer of attempt.answers) {
        if (!knownQuestionIds.has(answer.questionId)) continue;
        if (unreached.has(answer.questionId)) {
          notReachedExcluded += 1;
          continue;
        }
        const itemIdx = indexOfQuestion(answer.questionId);
        // Only the first time a student meets a question tells us anything: on the
        // second sitting they may simply remember the answer, which would drag every
        // reused question towards EASY.
        if (seen.has(itemIdx)) {
          repeatExposuresExcluded += 1;
          continue;
        }

        const outcome = classifyAnswerOutcome(answer);
        const bucket = countersFor(answer.questionId);
        bucket.answered += 1;
        if (answer.timeSpent > 0) {
          bucket.timeSum += answer.timeSpent;
          bucket.timeCount += 1;
        }

        if (outcome === 'pending') {
          // An open answer nobody has corrected yet is not evidence either way — and
          // it must NOT consume the student's first encounter: marking it as seen here
          // meant the graded answer they give at the next sitting was then discarded as
          // a repeat, and the only usable evidence disappeared without a trace.
          bucket.pending += 1;
          pendingExcluded += 1;
          continue;
        }

        seen.add(itemIdx);
        counted.push({ answer, outcome, itemIdx });
      }

      if (counted.length === 0) return;
      attemptsCounted += 1;

      const attemptCorrect = counted.filter((c) => c.outcome === 'correct').length;

      for (const { answer, outcome, itemIdx } of counted) {
        const bucket = countersFor(answer.questionId);
        const isCorrect = outcome === 'correct';
        if (isCorrect) bucket.correct += 1;
        else if (outcome === 'wrong') bucket.wrong += 1;
        else bucket.blank += 1; // a blank is a question the student could not answer

        personIndex.push(studentIdx);
        itemIndex.push(itemIdx);
        correctFlags.push(isCorrect ? 1 : 0);
        answersCounted += 1;

        accumulatePointBiserial(
          bucket.discrimination,
          isCorrect,
          attemptCorrect - (isCorrect ? 1 : 0)
        );
      }
    },

    finish() {
      const stats = new Map<string, QuestionStatsSnapshot>();
      const discrimination = new Map<string, number | null>();
      for (const [questionId, bucket] of counters) {
        stats.set(questionId, finalizeCounters(bucket));
        discrimination.set(
          questionId,
          finalizePointBiserial(bucket.discrimination, CALIBRATION.minSampleForDiscrimination)
        );
      }
      return {
        stats,
        discrimination,
        responses: {
          personCount: studentIndex.size,
          itemCount: questionIds.length,
          personIndex,
          itemIndex,
          correct: correctFlags,
        },
        questionIds,
        attemptsCounted,
        answersCounted,
        repeatExposuresExcluded,
        notReachedExcluded,
        pendingExcluded,
      };
    },
  };
}

function finalizeCounters(bucket: MutableCounters): QuestionStatsSnapshot {
  const timesGraded = bucket.correct + bucket.wrong + bucket.blank;
  return {
    timesAnswered: bucket.answered,
    timesCorrect: bucket.correct,
    timesWrong: bucket.wrong,
    timesSkipped: bucket.blank,
    timesGraded,
    // null, not 0: "no data" and "nobody got it right" are different claims, and
    // conflating them is what previously marked every open question as critical.
    avgCorrectRate: timesGraded > 0 ? (bucket.correct / timesGraded) * 100 : null,
    avgTimeSeconds: bucket.timeCount > 0 ? bucket.timeSum / bucket.timeCount : null,
  };
}

/**
 * Whether a question's numbers actually moved. Without this gate the nightly job
 * would rewrite every row in the bank every night, which on a pooled connection is
 * slow enough to time the function out.
 */
export function statsChanged(
  current: QuestionStatsSnapshot,
  next: QuestionStatsSnapshot
): boolean {
  return (
    current.timesAnswered !== next.timesAnswered ||
    current.timesCorrect !== next.timesCorrect ||
    current.timesWrong !== next.timesWrong ||
    current.timesSkipped !== next.timesSkipped ||
    current.timesGraded !== next.timesGraded ||
    !closeEnough(current.avgCorrectRate, next.avgCorrectRate) ||
    !closeEnough(current.avgTimeSeconds, next.avgTimeSeconds)
  );
}

function closeEnough(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < 1e-6;
}

// ==================== DECISION RULE ====================

const LEVEL_ORDER: readonly DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];

export type DifficultySkipReason =
  | 'ALREADY_CORRECT'
  | 'LOW_EVIDENCE'
  | 'COOLDOWN'
  | 'UNCONNECTED'
  | 'QUALITY_FLAG'
  // Not a verdict of `decideDifficulty`: the supply check applies it afterwards, once
  // the whole batch is known and it can tell whether a bucket would run dry.
  | 'BUCKET_FLOOR';

export type DifficultyReasonCode = 'TOO_HARD_FOR_LEVEL' | 'TOO_EASY_FOR_LEVEL';

export interface DifficultyProposal {
  kind: 'proposal';
  toLevel: DifficultyLevel;
  reasonCode: DifficultyReasonCode;
  /** Probability the question really is on the far side of the cut, 0..1. */
  confidence: number;
  /** The proposal contradicts an explicit human choice: show it, flag it, never hide it. */
  contradictsHuman: boolean;
  metadata: {
    score: number;
    cut: number;
    standardError: number;
    effectiveError: number;
    requiredMargin: number;
    observedMargin: number;
    sampleSize: number;
  };
}

export type DifficultyDecision =
  | DifficultyProposal
  | { kind: 'skipped'; reason: DifficultySkipReason };

export interface DifficultyDecisionInput {
  currentLevel: DifficultyLevel;
  source: DifficultySource;
  /** Hardness on the subject's anchored logit scale. */
  score: number;
  /** Standard error of `score`, before the design-effect inflation. */
  standardError: number;
  sampleSize: number;
  cuts: { easyMedium: number; mediumHard: number };
  /** False when this question's scale is not comparable with the rest of the subject. */
  connected: boolean;
  qualityFlagCode: string | null;
  /** The most recent applied change, for the cooldown. */
  lastApplied: { at: Date; sampleSize: number } | null;
  now: Date;
}

/**
 * The rule, in one place, symmetric by construction.
 *
 * There is no separate branch for "make it harder" and "make it easier": a HARD
 * question with a low score is the same arithmetic as an EASY question with a high
 * score, with the sign flipped. A calibrator that only moves one way is not a
 * calibrator, it is a ratchet.
 *
 * There is also deliberately no fixed minimum sample size. The requirement is that
 * the *whole* confidence interval clears the cut, plus a dead band. Because the
 * interval narrows with the square root of the sample, the data needed scales with
 * how borderline the question is: a handful of responses moves something blatantly
 * misplaced, while a question sitting almost exactly on the boundary would need
 * thousands and therefore never moves. That is the anti-drift guarantee, expressed
 * as arithmetic rather than as a tuned threshold.
 */
export function decideDifficulty(input: DifficultyDecisionInput): DifficultyDecision {
  if (!Number.isFinite(input.score) || !Number.isFinite(input.standardError)) {
    return { kind: 'skipped', reason: 'LOW_EVIDENCE' };
  }
  if (input.sampleSize < CALIBRATION.minSampleForScore) {
    return { kind: 'skipped', reason: 'LOW_EVIDENCE' };
  }
  if (!input.connected) return { kind: 'skipped', reason: 'UNCONNECTED' };
  // A question whose key looks wrong is not a hard question. It goes to a human as
  // a defect report; relabelling it would bury the actual problem.
  if (input.qualityFlagCode) return { kind: 'skipped', reason: 'QUALITY_FLAG' };

  const currentIdx = LEVEL_ORDER.indexOf(input.currentLevel);
  const targetIdx = classify(input.score, input.cuts.easyMedium, input.cuts.mediumHard);
  if (targetIdx === currentIdx) return { kind: 'skipped', reason: 'ALREADY_CORRECT' };

  // One level per run, in either direction: never EASY→HARD nor HARD→EASY at once.
  const step = targetIdx > currentIdx ? 1 : -1;
  const nextIdx = currentIdx + step;
  const cut =
    Math.min(currentIdx, nextIdx) === 0 ? input.cuts.easyMedium : input.cuts.mediumHard;

  const effectiveError = input.standardError * CALIBRATION.designEffect;
  const requiredMargin = CALIBRATION.hysteresis + CALIBRATION.confidenceZ * effectiveError;
  const observedMargin = step > 0 ? input.score - cut : cut - input.score;
  if (observedMargin <= requiredMargin) {
    return { kind: 'skipped', reason: 'LOW_EVIDENCE' };
  }

  if (!cooldownElapsed(input)) return { kind: 'skipped', reason: 'COOLDOWN' };

  return {
    kind: 'proposal',
    toLevel: LEVEL_ORDER[nextIdx],
    reasonCode: step > 0 ? 'TOO_HARD_FOR_LEVEL' : 'TOO_EASY_FOR_LEVEL',
    confidence: normalCdf(Math.abs(input.score - cut) / effectiveError),
    contradictsHuman: input.source === 'MANUAL',
    metadata: {
      score: input.score,
      cut,
      standardError: input.standardError,
      effectiveError,
      requiredMargin,
      observedMargin,
      sampleSize: input.sampleSize,
    },
  };
}

/** Both conditions must hold: enough time AND enough new evidence. */
function cooldownElapsed(input: DifficultyDecisionInput): boolean {
  if (!input.lastApplied) return true;
  const elapsedDays =
    (input.now.getTime() - input.lastApplied.at.getTime()) / (1000 * 60 * 60 * 24);
  const newResponses = input.sampleSize - input.lastApplied.sampleSize;
  return (
    elapsedDays >= CALIBRATION.cooldownDays &&
    newResponses >= CALIBRATION.cooldownNewResponses
  );
}

/**
 * The quality read of one question: reasons to look at it rather than relabel it.
 *
 * Order is precedence, worst first. A mis-keyed question is the only one of these
 * that is outright broken; the other two say the measurement cannot carry a decision,
 * which is a different and softer claim.
 */
export function deriveQualityFlag(
  discrimination: number | null,
  stats: QuestionStatsSnapshot
): string | null {
  if (discrimination !== null && discrimination < 0) return 'KEY_SUSPECT';

  // Checked before discrimination, and independently of it: a question most of the
  // room skips has little variance left to correlate with anything, so it tends to
  // look undiscriminating too. Reporting the avoidance is the more useful of the two.
  if (
    stats.timesGraded >= CALIBRATION.minSampleForOmission &&
    stats.timesSkipped / stats.timesGraded >= CALIBRATION.highOmissionShare
  ) {
    return 'HIGH_OMISSION';
  }

  if (
    discrimination !== null &&
    discrimination <= CALIBRATION.lowDiscriminationThreshold &&
    stats.timesGraded >= CALIBRATION.minSampleForDiscrimination
  ) {
    return 'LOW_DISCRIMINATION';
  }

  return null;
}

// ==================== RUN-LEVEL GUARDS ====================

export type DifficultyDistribution = Record<DifficultyLevel, number>;

export function buildDistribution(levels: readonly DifficultyLevel[]): DifficultyDistribution {
  const distribution: DifficultyDistribution = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const level of levels) distribution[level] += 1;
  return distribution;
}

export interface RunAnomaly {
  anomalous: boolean;
  reason?: string;
}

/**
 * Refuses to publish a batch of proposals that does not look like calibration.
 *
 * Twenty questions do not change nature in the same week. If a run wants to move
 * far more than usual, or overwhelmingly in one direction, the likely explanation
 * is upstream — an unusual cohort, a broken import, a mislabelled answer key — and
 * the right response is to stop and say so rather than hand over a queue nobody can
 * meaningfully review.
 */
export function detectRunAnomaly(
  proposals: readonly { reasonCode: DifficultyReasonCode }[],
  medianPreviousCount: number | null
): RunAnomaly {
  const count = proposals.length;
  if (count === 0) return { anomalous: false };

  if (count > CALIBRATION.anomalyAbsoluteCount) {
    return {
      anomalous: true,
      reason: `VOLUME_ABSOLUTE:${count}>${CALIBRATION.anomalyAbsoluteCount}`,
    };
  }
  if (medianPreviousCount !== null && medianPreviousCount > 0) {
    const limit = medianPreviousCount * CALIBRATION.anomalyVolumeMultiple;
    if (count > limit) {
      return { anomalous: true, reason: `VOLUME_SPIKE:${count}>${limit.toFixed(0)}` };
    }
  }

  if (count >= CALIBRATION.anomalyMinCountForShare) {
    const harder = proposals.filter((p) => p.reasonCode === 'TOO_HARD_FOR_LEVEL').length;
    const share = Math.max(harder, count - harder) / count;
    if (share >= CALIBRATION.anomalyOneDirectionShare) {
      return {
        anomalous: true,
        reason: `ONE_DIRECTION:${(share * 100).toFixed(0)}%`,
      };
    }
  }

  return { anomalous: false };
}

export interface BucketFloorViolation {
  subjectId: string;
  level: DifficultyLevel;
  remaining: number;
}

/**
 * Checks that accepting every proposal would not empty a (subject, level) bucket.
 *
 * The automatic simulation builders draw by subject and level with equal quotas. If
 * a bucket runs dry they quietly deliver fewer questions than asked, with no error
 * anywhere — which is exactly the kind of failure that gets discovered weeks later.
 */
export function checkBucketFloors(
  published: readonly { subjectId: string | null; level: DifficultyLevel }[],
  proposals: readonly { subjectId: string | null; fromLevel: DifficultyLevel }[],
  minPerBucket = CALIBRATION.minPublishedPerBucket
): BucketFloorViolation[] {
  const counts = new Map<string, number>();
  const key = (subjectId: string, level: DifficultyLevel) => `${subjectId}::${level}`;

  for (const question of published) {
    if (!question.subjectId) continue;
    const bucketKey = key(question.subjectId, question.level);
    counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1);
  }

  const losses = new Map<string, number>();
  for (const proposal of proposals) {
    if (!proposal.subjectId) continue;
    const bucketKey = key(proposal.subjectId, proposal.fromLevel);
    losses.set(bucketKey, (losses.get(bucketKey) ?? 0) + 1);
  }

  const violations: BucketFloorViolation[] = [];
  for (const [bucketKey, lost] of losses) {
    const before = counts.get(bucketKey) ?? 0;
    const remaining = before - lost;
    if (remaining < minPerBucket) {
      const [subjectId, level] = bucketKey.split('::');
      violations.push({ subjectId, level: level as DifficultyLevel, remaining });
    }
  }
  return violations;
}
