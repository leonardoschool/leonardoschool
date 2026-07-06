'use client';

import { useEffect, useState } from 'react';
import { colors } from '@/lib/theme/colors';
import { ButtonLoader } from '@/components/ui/loaders';
import Button from '@/components/ui/Button';
import { RotateCcw, Clock, TimerReset } from 'lucide-react';

export interface ResetAttemptModalProps {
  readonly isOpen: boolean;
  readonly studentName: string;
  readonly isPending: boolean;
  readonly onConfirm: (resetTimer: boolean) => void;
  readonly onClose: () => void;
}

/**
 * Confirm dialog for resetting a student's simulation attempt.
 * The saved answers are always kept; staff chooses whether to keep the
 * elapsed time or restart the timer from zero.
 */
export function ResetAttemptModal({
  isOpen,
  studentName,
  isPending,
  onConfirm,
  onClose,
}: ResetAttemptModalProps) {
  const [resetTimer, setResetTimer] = useState(false);

  // The component stays mounted between opens: restore the safe default so the
  // previous student's timer choice never leaks onto the next one
  useEffect(() => {
    if (isOpen) setResetTimer(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const timerOptions = [
    {
      value: false,
      icon: Clock,
      title: 'Mantieni il tempo trascorso',
      description: 'Lo studente riprende con il tempo residuo.',
    },
    {
      value: true,
      icon: TimerReset,
      title: 'Azzera il timer',
      description: 'Lo studente riparte con tutto il tempo a disposizione.',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className={`font-semibold ${colors.text.primary}`}>Resetta tentativo</h3>
            <p className={`text-sm ${colors.text.muted}`}>Le risposte salvate verranno mantenute</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className={colors.text.secondary}>
            Stai per resettare il tentativo di{' '}
            <span className={`font-semibold ${colors.text.primary}`}>{studentName}</span>: lo
            studente potrà riprendere la simulazione da dove era rimasto.
          </p>

          {timerOptions.map((option) => (
            <button
              key={option.title}
              onClick={() => setResetTimer(option.value)}
              disabled={isPending}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${
                resetTimer === option.value
                  ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-500/10'
                  : `${colors.border.light} ${colors.background.secondary} hover:bg-gray-100 dark:hover:bg-white/10`
              }`}
            >
              <div className="flex items-center gap-3">
                <option.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    resetTimer === option.value
                      ? 'text-amber-600 dark:text-amber-400'
                      : colors.text.muted
                  }`}
                />
                <div>
                  <p className={`font-medium ${colors.text.primary}`}>{option.title}</p>
                  <p className={`text-sm ${colors.text.muted} mt-0.5`}>{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-5 pt-0 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className={`${colors.text.muted} hover:text-gray-900 dark:hover:text-white`}
          >
            Annulla
          </Button>
          <Button
            onClick={() => onConfirm(resetTimer)}
            disabled={isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 px-6"
          >
            <ButtonLoader loading={isPending} loadingText="Reset in corso...">
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetta tentativo
            </ButtonLoader>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ResetAttemptModal;
