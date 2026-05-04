'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import { colors } from '@/lib/theme/colors';

type FeedbackType = 'ERROR_IN_QUESTION' | 'ERROR_IN_ANSWER' | 'UNCLEAR' | 'SUGGESTION' | 'OTHER';

interface FeedbackModalProps {
  readonly isOpen: boolean;
  readonly questionId: string;
  readonly onClose: () => void;
  readonly onSubmit: (data: { questionId: string; type: FeedbackType; message: string }) => void;
  readonly isSubmitting: boolean;
}

const feedbackOptions = [
  { value: 'ERROR_IN_QUESTION', label: 'Errore nel testo della domanda' },
  { value: 'ERROR_IN_ANSWER', label: 'Errore nelle risposte' },
  { value: 'UNCLEAR', label: 'Domanda poco chiara' },
  { value: 'SUGGESTION', label: 'Suggerimento miglioramento' },
  { value: 'OTHER', label: 'Altro' },
] as const;

export default function FeedbackModal({
  isOpen,
  questionId,
  onClose,
  onSubmit,
  isSubmitting,
}: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('ERROR_IN_QUESTION');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (feedbackMessage.length >= 10) {
      onSubmit({
        questionId,
        type: feedbackType,
        message: feedbackMessage,
      });
    }
  };

  const handleClose = () => {
    setFeedbackMessage('');
    setFeedbackType('ERROR_IN_QUESTION');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-xl ${colors.background.card} border ${colors.border.light} shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.border.primary}`}>
          <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
            Segnala Problema
          </h3>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded-lg ${colors.background.hover} ${colors.text.secondary} hover:${colors.text.primary} transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="feedback-type-select" className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
              Tipo di problema
            </label>
            <CustomSelect
              id="feedback-type-select"
              value={feedbackType}
              onChange={(value) => setFeedbackType(value as FeedbackType)}
              options={[...feedbackOptions]}
              placeholder="Seleziona tipo di problema"
            />
          </div>

          <div>
            <label htmlFor="feedback-description" className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
              Descrizione del problema
            </label>
            <textarea
              id="feedback-description"
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Descrivi il problema in almeno 10 caratteri..."
              rows={4}
              className={`w-full p-3 rounded-lg border ${colors.border.primary} ${colors.background.secondary} ${colors.text.primary} placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#a8012b]/50`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className={`flex-1 px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:${colors.background.hover} font-medium transition-colors`}
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={feedbackMessage.length < 10 || isSubmitting}
              className={`flex-1 px-4 py-2.5 rounded-lg ${colors.primary.gradient} text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              {isSubmitting ? 'Invio...' : 'Invia Segnalazione'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
