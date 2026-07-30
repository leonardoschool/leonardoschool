/**
 * Score deltas when a single open answer's verdict is flipped.
 *
 * `previousState` is null while an open answer awaits correction, so this cannot
 * be a plain boolean comparison: the pending counter has to come down too.
 */

import { describe, it, expect } from 'vitest';
import { calculateVerdictDeltas } from '@/server/services/openAnswerGrading';

describe('calculateVerdictDeltas', () => {
  it('moves a pending answer to correct', () => {
    expect(calculateVerdictDeltas(true, null)).toEqual({
      correctDelta: 1,
      wrongDelta: 0,
      pendingDelta: -1,
    });
  });

  it('moves a pending answer to wrong', () => {
    expect(calculateVerdictDeltas(false, null)).toEqual({
      correctDelta: 0,
      wrongDelta: 1,
      pendingDelta: -1,
    });
  });

  it('moves a wrong answer to correct', () => {
    expect(calculateVerdictDeltas(true, false)).toEqual({
      correctDelta: 1,
      wrongDelta: -1,
      pendingDelta: 0,
    });
  });

  it('moves a correct answer to wrong', () => {
    expect(calculateVerdictDeltas(false, true)).toEqual({
      correctDelta: -1,
      wrongDelta: 1,
      pendingDelta: 0,
    });
  });

  it('leaves the counters alone when the verdict does not change', () => {
    expect(calculateVerdictDeltas(true, true)).toEqual({
      correctDelta: 0,
      wrongDelta: 0,
      pendingDelta: 0,
    });
    expect(calculateVerdictDeltas(false, false)).toEqual({
      correctDelta: 0,
      wrongDelta: 0,
      pendingDelta: 0,
    });
  });
});
