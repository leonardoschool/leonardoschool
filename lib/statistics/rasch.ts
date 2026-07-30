/**
 * Rasch (1-parameter IRT) difficulty estimation by joint maximum likelihood.
 *
 * Why not the raw correct rate: the share of students who got a question right
 * measures the *interaction* between the question and whoever happened to answer
 * it. A question that only appeared in a recovery test, sat by the weakest
 * students, looks brutal; the same question given to the top of the class looks
 * easy. On an admission-test bank the median correct rate is already around 0.40,
 * so any absolute threshold ("below 50% ⇒ hard") relabels most of the bank.
 *
 * The Rasch difficulty `b` is instead *sample-invariant*: person ability and item
 * difficulty are estimated jointly on the same logit scale, so who answered is
 * divided out. That invariance is the whole reason this file exists.
 *
 * Estimation is JMLE: alternate Newton-Raphson steps that drive each item's and
 * each person's *expected* score onto its observed score. The naive "alternating
 * logits" shortcut (b = logit(1−p) − mean θ, θ = logit(p) + mean b) is not used
 * because it does not converge: on a complete design its global level flips
 * between two values forever, and on an incomplete one that unresolved level is
 * precisely the sampling bias we are here to remove.
 *
 * `b` is identified only up to an additive constant. It is pinned by re-centring
 * the items on zero after every iteration — which also makes convergence
 * well-defined. The caller then re-anchors to a frozen scale, and *that*
 * anchoring, not this file, is what keeps labels stable across cohorts.
 */
import {
  clampProportion,
  invLogit,
  logit,
  standardErrorOfDifficulty,
} from './intervals';

/**
 * A person who answered everything right (or everything wrong) has no finite
 * ability, and likewise for items. The standard fix is to pull the extreme score
 * in by a fraction of an observation so the estimate stays finite and ordered.
 */
const EXTREME_SCORE_ADJUSTMENT = 0.3;
/** Hard bound on any estimate, so a pathological pattern cannot produce ±Infinity. */
const LOGIT_LIMIT = 6;
/** Largest single Newton step, in logits: keeps early iterations from overshooting. */
const MAX_STEP = 1;

/**
 * Observed responses as three parallel arrays — one entry per answer. Compact on
 * purpose: a full person × item matrix would be mostly holes, and the calibration
 * job holds hundreds of thousands of responses at once.
 */
export interface RaschResponses {
  personCount: number;
  itemCount: number;
  personIndex: ArrayLike<number>;
  itemIndex: ArrayLike<number>;
  /** 1 = correct, 0 = wrong. Anything not gradeable must be left out entirely. */
  correct: ArrayLike<number>;
}

export interface RaschEstimate {
  /** Hardness in logits, centred on zero. Higher = harder. */
  itemDifficulty: Float64Array;
  /** Standard error of each difficulty, from the real response pattern. */
  itemStandardError: Float64Array;
  personAbility: Float64Array;
  itemResponses: Int32Array;
  itemCorrect: Int32Array;
  personResponses: Int32Array;
  /**
   * False when an item shares no chain of common respondents with the bulk of
   * the data. Difficulties from separate components are not on the same scale
   * and must never be compared, however good they look individually.
   */
  itemConnected: boolean[];
  iterations: number;
  converged: boolean;
}

interface RaschOptions {
  maxIterations?: number;
  /** Convergence threshold on the largest single-parameter move, in logits. */
  tolerance?: number;
}

/**
 * Alternating Newton steps settle into a tiny limit cycle rather than a exact
 * fixed point — empirically around 1e-4 logits. Anything finer than that would
 * report "not converged" forever, so the threshold sits just above it. It is
 * still two orders of magnitude below the 0.2-logit dead band the calibration
 * uses to decide anything, so the residual cannot influence a single label.
 */
const DEFAULT_TOLERANCE = 1e-3;

export function estimateRasch(
  responses: RaschResponses,
  options: RaschOptions = {}
): RaschEstimate {
  const maxIterations = options.maxIterations ?? 60;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const { personCount, itemCount } = responses;
  const total = responses.correct.length;

  const itemResponses = new Int32Array(itemCount);
  const itemCorrect = new Int32Array(itemCount);
  const personResponses = new Int32Array(personCount);
  const personCorrect = new Int32Array(personCount);

  for (let k = 0; k < total; k++) {
    const item = responses.itemIndex[k];
    const person = responses.personIndex[k];
    const correct = responses.correct[k] ? 1 : 0;
    itemResponses[item] += 1;
    itemCorrect[item] += correct;
    personResponses[person] += 1;
    personCorrect[person] += correct;
  }

  // Newton-Raphson targets: the observed scores, with extreme ones pulled in.
  const itemTarget = adjustedTargets(itemCorrect, itemResponses);
  const personTarget = adjustedTargets(personCorrect, personResponses);

  // Marginal logits are a good starting point — they are already the right answer
  // when every person sees every item.
  const itemDifficulty = new Float64Array(itemCount);
  for (let i = 0; i < itemCount; i++) {
    if (itemResponses[i] === 0) continue;
    const p = clampProportion(itemTarget[i] / itemResponses[i], itemResponses[i]);
    itemDifficulty[i] = logit(1 - p); // hardness: low correct rate ⇒ high logit
  }
  const personAbility = new Float64Array(personCount);
  for (let s = 0; s < personCount; s++) {
    if (personResponses[s] === 0) continue;
    const p = clampProportion(personTarget[s] / personResponses[s], personResponses[s]);
    personAbility[s] = logit(p);
  }

  const expectedByItem = new Float64Array(itemCount);
  const informationByItem = new Float64Array(itemCount);
  const expectedByPerson = new Float64Array(personCount);
  const informationByPerson = new Float64Array(personCount);

  let iterations = 0;
  let converged = false;
  while (iterations < maxIterations) {
    iterations += 1;
    let maxMove = 0;

    // Item step: raise b when the model expects more correct answers than observed.
    expectedByItem.fill(0);
    informationByItem.fill(0);
    for (let k = 0; k < total; k++) {
      const item = responses.itemIndex[k];
      const p = invLogit(personAbility[responses.personIndex[k]] - itemDifficulty[item]);
      expectedByItem[item] += p;
      informationByItem[item] += p * (1 - p);
    }
    for (let i = 0; i < itemCount; i++) {
      if (itemResponses[i] === 0 || informationByItem[i] <= 0) continue;
      const step = (expectedByItem[i] - itemTarget[i]) / informationByItem[i];
      maxMove = Math.max(maxMove, Math.abs(step));
      itemDifficulty[i] = clampLogit(itemDifficulty[i] + limitStep(step));
    }

    // Pinning the item mean each round removes the model's free additive constant,
    // which would otherwise wander and make "converged" meaningless.
    centreOnZero(itemDifficulty, itemResponses, personAbility, personResponses);

    // Person step: raise θ when the student scored more than the model expects.
    expectedByPerson.fill(0);
    informationByPerson.fill(0);
    for (let k = 0; k < total; k++) {
      const person = responses.personIndex[k];
      const p = invLogit(personAbility[person] - itemDifficulty[responses.itemIndex[k]]);
      expectedByPerson[person] += p;
      informationByPerson[person] += p * (1 - p);
    }
    for (let s = 0; s < personCount; s++) {
      if (personResponses[s] === 0 || informationByPerson[s] <= 0) continue;
      const step = (personTarget[s] - expectedByPerson[s]) / informationByPerson[s];
      maxMove = Math.max(maxMove, Math.abs(step));
      personAbility[s] = clampLogit(personAbility[s] + limitStep(step));
    }

    if (maxMove < tolerance) {
      converged = true;
      break;
    }
  }

  return {
    itemDifficulty,
    itemStandardError: computeStandardErrors(responses, itemDifficulty, personAbility, itemCount),
    personAbility,
    itemResponses,
    itemCorrect,
    personResponses,
    itemConnected: findConnectedItems(responses),
    iterations,
    converged,
  };
}

/**
 * Observed scores with perfect and zero scores pulled in by a fraction of an
 * observation, so they yield finite ordered estimates instead of ±Infinity.
 */
function adjustedTargets(correct: Int32Array, responses: Int32Array): Float64Array {
  const targets = new Float64Array(correct.length);
  for (let i = 0; i < correct.length; i++) {
    if (responses[i] === 0) continue;
    if (correct[i] === 0) targets[i] = EXTREME_SCORE_ADJUSTMENT;
    else if (correct[i] === responses[i]) targets[i] = responses[i] - EXTREME_SCORE_ADJUSTMENT;
    else targets[i] = correct[i];
  }
  return targets;
}

function limitStep(step: number): number {
  return Math.max(-MAX_STEP, Math.min(MAX_STEP, step));
}

function clampLogit(value: number): number {
  return Math.max(-LOGIT_LIMIT, Math.min(LOGIT_LIMIT, value));
}

/**
 * Fixes the free additive constant by putting the mean item difficulty at zero.
 * The same shift is applied to abilities: only the difference `θ − b` drives the
 * model, so shifting one without the other would change every predicted
 * probability.
 */
function centreOnZero(
  itemDifficulty: Float64Array,
  itemResponses: Int32Array,
  personAbility: Float64Array,
  personResponses: Int32Array
): void {
  let sum = 0;
  let seen = 0;
  for (let i = 0; i < itemDifficulty.length; i++) {
    if (itemResponses[i] === 0) continue;
    sum += itemDifficulty[i];
    seen += 1;
  }
  if (seen === 0) return;
  const mean = sum / seen;
  for (let i = 0; i < itemDifficulty.length; i++) {
    if (itemResponses[i] !== 0) itemDifficulty[i] -= mean;
  }
  for (let s = 0; s < personAbility.length; s++) {
    if (personResponses[s] !== 0) personAbility[s] -= mean;
  }
}

/** Accumulates Fisher information per item without materialising the ability lists. */
function computeStandardErrors(
  responses: RaschResponses,
  itemDifficulty: Float64Array,
  personAbility: Float64Array,
  itemCount: number
): Float64Array {
  const information = new Float64Array(itemCount);
  for (let k = 0; k < responses.correct.length; k++) {
    const item = responses.itemIndex[k];
    const p = invLogit(personAbility[responses.personIndex[k]] - itemDifficulty[item]);
    information[item] += p * (1 - p);
  }
  const errors = new Float64Array(itemCount);
  for (let i = 0; i < itemCount; i++) {
    errors[i] = information[i] > 0 ? 1 / Math.sqrt(information[i]) : Infinity;
  }
  return errors;
}

/**
 * Union-find over the bipartite person/item graph, marking the items in the
 * largest component. Two groups that never share a respondent produce two
 * incomparable scales, and nothing in the numbers themselves reveals it.
 */
function findConnectedItems(responses: RaschResponses): boolean[] {
  const { personCount, itemCount } = responses;
  const parent = new Int32Array(personCount + itemCount);
  for (let i = 0; i < parent.length; i++) parent[i] = i;

  const find = (node: number): number => {
    let root = node;
    while (parent[root] !== root) root = parent[root];
    let walk = node;
    while (parent[walk] !== root) {
      const next = parent[walk];
      parent[walk] = root;
      walk = next;
    }
    return root;
  };
  const union = (a: number, b: number): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let k = 0; k < responses.correct.length; k++) {
    union(responses.personIndex[k], personCount + responses.itemIndex[k]);
  }

  const sizes = new Map<number, number>();
  for (let i = 0; i < itemCount; i++) {
    const root = find(personCount + i);
    sizes.set(root, (sizes.get(root) ?? 0) + 1);
  }
  let biggestRoot = -1;
  let biggestSize = -1;
  for (const [root, size] of sizes) {
    if (size > biggestSize) {
      biggestSize = size;
      biggestRoot = root;
    }
  }

  const connected: boolean[] = [];
  for (let i = 0; i < itemCount; i++) {
    connected.push(find(personCount + i) === biggestRoot);
  }
  return connected;
}

/** Re-exported so callers can widen a standard error without importing two modules. */
export { standardErrorOfDifficulty };
