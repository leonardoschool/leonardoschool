'use client';

import { KeyRound, Lightbulb } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import RichTextRenderer from '@/components/ui/RichTextRenderer';

export type OpenAnswerSolutionKeyword = {
  keyword: string;
};

type OpenAnswerSolutionProps = {
  keywords?: OpenAnswerSolutionKeyword[];
  correctExplanation?: string | null;
  generalExplanation?: string | null;
};

/**
 * Solution panel for OPEN_TEXT questions, shown to students during review.
 * Keywords are presented as alternatives because autoScoreOpenAnswer uses OR
 * logic: matching a single keyword already scores the answer as correct.
 */
export default function OpenAnswerSolution({
  keywords = [],
  correctExplanation,
  generalExplanation,
}: OpenAnswerSolutionProps) {
  const explanation = correctExplanation || generalExplanation;
  const hasKeywords = keywords.length > 0;

  if (!hasKeywords && !explanation) {
    return (
      <div className={`p-3 rounded-lg border ${colors.border.light} ${colors.background.secondary}`}>
        <p className={`text-sm ${colors.text.muted}`}>
          Per questa domanda non è stata inserita una soluzione di riferimento.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Soluzione
        </span>
      </div>

      {hasKeywords && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {keywords.length === 1
                ? 'Elemento chiave atteso:'
                : 'Elementi chiave attesi (ne basta uno):'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw.keyword}
                className="px-2 py-0.5 text-xs rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
              >
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {explanation && (
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
            Risposta di riferimento:
          </p>
          <RichTextRenderer
            text={explanation}
            className="text-sm text-emerald-800 dark:text-emerald-200"
          />
        </div>
      )}
    </div>
  );
}
