'use client';

import { useState } from 'react';
import { Check, KeyRound } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { ButtonLoader } from '@/components/ui/loaders';
import { MAX_PROPOSED_KEYWORD_LENGTH } from '@/lib/validations/questionValidation';

type AlternativeAnswerReviewProps = {
  proposedKeyword: string | null;
  /** The full open answer the student wrote, when the proposal came from an attempt */
  studentAnswerText: string | null;
  currentKeywords: readonly string[];
};

/** Read-only context a tutor needs to judge a proposed alternative answer. */
export function AlternativeAnswerContext({
  proposedKeyword,
  studentAnswerText,
  currentKeywords,
}: AlternativeAnswerReviewProps) {
  return (
    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
      <div>
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
          Risposta proposta:
        </p>
        <p className={`text-sm font-semibold ${colors.text.primary}`}>
          {proposedKeyword || '—'}
        </p>
      </div>

      {studentAnswerText && studentAnswerText !== proposedKeyword && (
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
            Risposta completa data dallo studente:
          </p>
          <p className={`text-sm ${colors.text.secondary}`}>{studentAnswerText}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
          Soluzioni già accettate:
        </p>
        {currentKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {currentKeywords.map((keyword) => (
              <span
                key={keyword}
                className={`px-2 py-0.5 text-xs rounded ${colors.background.secondary} ${colors.text.secondary}`}
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${colors.text.muted}`}>Nessuna: la domanda non ha keywords.</p>
        )}
      </div>
    </div>
  );
}

/**
 * Approval control: the wording can be corrected before it becomes a keyword,
 * because a student may write "zero virgola ottantatré" where the scorer needs "0.83".
 */
export function AlternativeAnswerApproveAction({
  proposedKeyword,
  isApproving,
  onApprove,
}: {
  proposedKeyword: string | null;
  isApproving: boolean;
  onApprove: (keyword: string) => void;
}) {
  const [keyword, setKeyword] = useState(proposedKeyword ?? '');
  const trimmed = keyword.trim();

  return (
    <div className="space-y-2">
      <label htmlFor={`approve-keyword-${proposedKeyword}`} className={`block text-xs font-medium ${colors.text.muted}`}>
        Keyword da aggiungere
      </label>
      <input
        id={`approve-keyword-${proposedKeyword}`}
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        maxLength={MAX_PROPOSED_KEYWORD_LENGTH}
        className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b]`}
      />
      <button
        onClick={() => onApprove(trimmed)}
        disabled={trimmed.length === 0 || isApproving}
        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ButtonLoader loading={isApproving}>
          <Check className="w-4 h-4" />
          <KeyRound className="w-4 h-4" />
          Approva come keyword
        </ButtonLoader>
      </button>
    </div>
  );
}
