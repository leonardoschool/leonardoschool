'use client';

/**
 * Real answer statistics for one question.
 *
 * These columns have existed since the initial schema and were never written, so
 * this card showed "N/A" for its entire life. The nightly calibration now fills
 * them, and the numbers deserve to be read carefully:
 *
 * - The denominator is `timesGraded`, not `timesAnswered`. An open answer nobody has
 *   corrected yet is not evidence either way, and counting it as an error is what
 *   used to make every open question look catastrophic.
 * - A blank counts as an error, because a student who left it blank could not answer
 *   it — that is a property of the question, not an absence of data.
 * - `null` and `0%` are different claims. "Nobody got it right" is a measurement;
 *   "nothing measured yet" is not, and the card says so in words.
 */

import { colors } from '@/lib/theme/colors';
import { difficultyLabels, type DifficultyLevel } from '@/lib/validations/questionValidation';

interface QuestionStats {
  timesUsed?: number | null;
  timesAnswered?: number | null;
  timesCorrect?: number | null;
  timesWrong?: number | null;
  timesSkipped?: number | null;
  timesGraded?: number | null;
  avgCorrectRate?: number | null;
  avgTimeSeconds?: number | null;
  statsComputedAt?: string | Date | null;
  // Optional because the project compiles with `strict: false`, which makes every
  // field of an inferred tRPC payload optional regardless of the schema.
  difficulty?: DifficultyLevel | null;
  difficultySource?: string | null;
  difficultyLockedAt?: string | Date | null;
  suggestedDifficulty?: DifficultyLevel | null;
  suggestionConfidence?: number | null;
}

/** Mirrors the thresholds used by the per-simulation question analysis. */
function rateClass(rate: number): string {
  if (rate >= 70) return 'text-green-600 dark:text-green-400';
  if (rate >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${colors.text.muted}`}>{label}</span>
      <span className={`font-medium ${valueClass ?? colors.text.primary}`}>{value}</span>
    </div>
  );
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

function difficultyOrigin(stats: QuestionStats): string {
  if (stats.difficultySource === 'MANUAL') {
    return stats.difficultyLockedAt
      ? `impostata a mano il ${formatDate(stats.difficultyLockedAt)}`
      : 'impostata a mano';
  }
  if (stats.difficultySource === 'AUTO') return 'confermata dalla calibrazione';
  return 'mai verificata';
}

export default function QuestionStatsCard({ stats }: { stats: QuestionStats }) {
  const graded = stats.timesGraded ?? 0;
  const hasRate = graded > 0 && stats.avgCorrectRate !== null && stats.avgCorrectRate !== undefined;

  return (
    <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
      <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Statistiche</h3>

      <div className="space-y-3">
        <Row label="Usata in simulazioni" value={stats.timesUsed ?? 0} />
        <Row label="Risposte ricevute" value={stats.timesAnswered ?? 0} />
        <Row label="Risposte valutate" value={graded} />
        <Row
          label="Corrette"
          value={stats.timesCorrect ?? 0}
          valueClass="text-green-600 dark:text-green-400"
        />
        <Row
          label="Errate"
          value={stats.timesWrong ?? 0}
          valueClass="text-red-600 dark:text-red-400"
        />
        <Row label="In bianco" value={stats.timesSkipped ?? 0} />

        <div className={`pt-3 border-t ${colors.border.primary}`}>
          <Row
            label="% corrette"
            value={hasRate ? `${Math.round(stats.avgCorrectRate!)}%` : 'Nessun dato'}
            valueClass={hasRate ? rateClass(stats.avgCorrectRate!) : colors.text.muted}
          />
          {stats.avgTimeSeconds != null && (
            <div className="mt-3">
              <Row label="Tempo medio" value={formatSeconds(stats.avgTimeSeconds)} />
            </div>
          )}
        </div>

        <div className={`pt-3 border-t ${colors.border.primary} space-y-2`}>
          {stats.difficulty && (
            <Row
              label="Difficoltà"
              value={`${difficultyLabels[stats.difficulty]} · ${difficultyOrigin(stats)}`}
            />
          )}
          {stats.suggestedDifficulty && stats.suggestedDifficulty !== stats.difficulty && (
            <p className="text-sm rounded-lg px-3 py-2 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Il sistema propone <strong>{difficultyLabels[stats.suggestedDifficulty]}</strong>
              {stats.suggestionConfidence != null &&
                ` (confidenza ${Math.round(stats.suggestionConfidence * 100)}%)`}
              . Da confermare nella pagina di calibrazione.
            </p>
          )}
        </div>

        <p className={`text-xs ${colors.text.muted} pt-1`}>
          {stats.statsComputedAt
            ? `Statistiche aggiornate il ${formatDate(stats.statsComputedAt)}`
            : 'Statistiche non ancora calcolate: vengono aggiornate ogni notte.'}
        </p>
      </div>
    </div>
  );
}
