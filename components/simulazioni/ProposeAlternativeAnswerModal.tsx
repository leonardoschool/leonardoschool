'use client';

import { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { ButtonLoader } from '@/components/ui/loaders';
import { MAX_PROPOSED_KEYWORD_LENGTH } from '@/lib/validations/questionValidation';

/**
 * Rendered only while a proposal is open, so the initial state below is seeded from
 * the question actually being proposed. Keeping it mounted meant the field was seeded
 * once, empty, and then carried the previous question's answer into the next one.
 */
interface ProposeAlternativeAnswerModalProps {
  readonly questionId: string;
  /** The student's own answer, used as the starting point of the proposal */
  readonly studentAnswer: string;
  /** Keywords already accepted, so the student doesn't propose one of them */
  readonly currentKeywords: readonly string[];
  readonly onClose: () => void;
  readonly onSubmit: (data: { questionId: string; proposedKeyword: string; message: string }) => void;
  readonly isSubmitting: boolean;
}

export default function ProposeAlternativeAnswerModal({
  questionId,
  studentAnswer,
  currentKeywords,
  onClose,
  onSubmit,
  isSubmitting,
}: ProposeAlternativeAnswerModalProps) {
  const [proposedKeyword, setProposedKeyword] = useState(studentAnswer.trim());
  const [message, setMessage] = useState('');

  const trimmed = proposedKeyword.trim();
  const alreadyAccepted = currentKeywords.some(
    (keyword) => keyword.trim().toLowerCase() === trimmed.toLowerCase()
  );
  const canSubmit = trimmed.length > 0 && !alreadyAccepted && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-xl ${colors.background.card} border ${colors.border.light} shadow-xl overflow-hidden`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.border.primary}`}>
          <h3 className={`flex items-center gap-2 text-lg font-semibold ${colors.text.primary}`}>
            <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Proponi la tua risposta
          </h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${colors.background.hover} ${colors.text.secondary} transition-colors`}
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className={`text-sm ${colors.text.secondary}`}>
            Se pensi che la tua risposta sia equivalente a quella attesa (un sinonimo, un altro
            formato numerico, un termine alternativo), proponila: un tutor la valuta e, se è
            corretta, entra fra le soluzioni accettate della domanda.
          </p>

          <div>
            <label htmlFor="proposed-keyword" className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
              Risposta che dovrebbe essere accettata
            </label>
            <input
              id="proposed-keyword"
              type="text"
              value={proposedKeyword}
              onChange={(e) => setProposedKeyword(e.target.value)}
              maxLength={MAX_PROPOSED_KEYWORD_LENGTH}
              placeholder="Es. 0.83"
              className={`w-full p-3 rounded-lg border ${colors.border.primary} ${colors.background.secondary} ${colors.text.primary} placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#a8012b]/50`}
            />
            <p className={`mt-1 text-xs ${colors.text.muted}`}>
              Scrivi solo la parola o il valore, non l&apos;intera frase.
            </p>
            {alreadyAccepted && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Questa risposta è già fra quelle accettate.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="proposal-message" className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
              Perché dovrebbe valere <span className={colors.text.muted}>(opzionale)</span>
            </label>
            <textarea
              id="proposal-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Es. è lo stesso valore arrotondato diversamente"
              rows={3}
              className={`w-full p-3 rounded-lg border ${colors.border.primary} ${colors.background.secondary} ${colors.text.primary} placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#a8012b]/50`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.primary} font-medium transition-colors`}
            >
              Annulla
            </button>
            <button
              onClick={() => onSubmit({ questionId, proposedKeyword: trimmed, message })}
              disabled={!canSubmit}
              className={`flex-1 px-4 py-2.5 rounded-lg ${colors.primary.gradient} text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              <ButtonLoader loading={isSubmitting}>
                <span>Invia proposta</span>
              </ButtonLoader>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
