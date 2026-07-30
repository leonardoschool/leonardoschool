'use client';

/**
 * Compact "% correct" badge for the question lists.
 *
 * Extracted rather than inlined because both list pages are already around 1450
 * lines: adding logic there makes a known problem worse.
 *
 * Renders nothing when there is no measurement yet. A dash would read as "measured
 * and it's zero", which is a different and much stronger claim than "no data".
 */

import { colors } from '@/lib/theme/colors';

interface QuestionStatsBadgeProps {
  avgCorrectRate?: number | null;
  timesGraded?: number | null;
  /** A calibration proposal is waiting for confirmation on this question. */
  hasSuggestion?: boolean;
}

/** Same thresholds as the per-simulation question analysis, so staff sees one scale. */
function toneFor(rate: number): string {
  if (rate >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (rate >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
}

export default function QuestionStatsBadge({
  avgCorrectRate,
  timesGraded,
  hasSuggestion,
}: QuestionStatsBadgeProps) {
  const graded = timesGraded ?? 0;
  const hasRate = graded > 0 && avgCorrectRate !== null && avgCorrectRate !== undefined;

  if (!hasRate && !hasSuggestion) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      {hasRate && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${toneFor(avgCorrectRate!)}`}
          title={`${Math.round(avgCorrectRate!)}% di risposte corrette su ${graded} valutate`}
        >
          {Math.round(avgCorrectRate!)}%
        </span>
      )}
      {hasSuggestion && (
        <span
          className="w-2 h-2 rounded-full bg-amber-500"
          title="Il sistema propone una difficoltà diversa: da confermare"
          aria-label="Proposta di ricalibrazione in attesa"
        />
      )}
      <span className={`sr-only ${colors.text.muted}`}>
        {hasRate ? `${Math.round(avgCorrectRate!)}% corrette su ${graded} risposte valutate` : ''}
      </span>
    </span>
  );
}
