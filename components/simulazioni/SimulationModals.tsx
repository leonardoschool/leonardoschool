'use client';

import ConfirmModal from '@/components/ui/ConfirmModal';
import { colors } from '@/lib/theme/colors';

interface SubmitConfirmModalProps {
  readonly isOpen: boolean;
  readonly answeredCount: number;
  readonly totalQuestions: number;
  readonly flaggedCount: number;
  readonly isLoading: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function SubmitConfirmModal({
  isOpen,
  answeredCount,
  totalQuestions,
  flaggedCount,
  isLoading,
  onConfirm,
  onCancel,
}: SubmitConfirmModalProps) {
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <ConfirmModal
      isOpen={isOpen}
      title="Consegna Simulazione"
      message={
        <div className="space-y-3">
          <p>Sei sicuro di voler consegnare la simulazione?</p>
          <div className={`p-3 rounded-lg ${colors.background.secondary}`}>
            <p className="text-sm">
              <strong>Risposte date:</strong> {answeredCount}/{totalQuestions}
            </p>
            {unansweredCount > 0 && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Hai {unansweredCount} domande senza risposta
              </p>
            )}
            {flaggedCount > 0 && (
              <p className="text-sm text-yellow-600 mt-1">
                ⚠️ Hai {flaggedCount} domande contrassegnate
              </p>
            )}
          </div>
        </div>
      }
      confirmText="Consegna"
      cancelText="Continua"
      variant="warning"
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

interface SectionTransitionModalProps {
  readonly isOpen: boolean;
  readonly currentSectionName: string;
  readonly nextSectionName?: string;
  readonly answeredInSection: number;
  readonly totalInSection: number;
  readonly isLastSection: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function SectionTransitionModal({
  isOpen,
  currentSectionName,
  nextSectionName,
  answeredInSection,
  totalInSection,
  isLastSection,
  onConfirm,
  onCancel,
}: SectionTransitionModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title="Completa Sezione"
      message={
        <div className="space-y-3">
          <p>
            Stai per completare la sezione <strong>&quot;{currentSectionName}&quot;</strong>.
          </p>
          <div className={`p-3 rounded-lg ${colors.background.secondary}`}>
            <p className="text-sm">
              Una volta completata, <strong>non potrai tornare</strong> a questa sezione.
            </p>
            {!isLastSection && nextSectionName && (
              <p className="text-sm mt-2">
                Passerai alla sezione: <strong>&quot;{nextSectionName}&quot;</strong>
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              ⚠️ Domande della sezione completate: {answeredInSection}/{totalInSection}
            </p>
          </div>
        </div>
      }
      confirmText="Completa e Continua"
      cancelText="Torna alla Sezione"
      variant="warning"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

interface SimpleSectionTransitionModalProps {
  readonly isOpen: boolean;
  readonly sectionName: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function SimpleSectionTransitionModal({
  isOpen,
  sectionName,
  onConfirm,
  onCancel,
}: SimpleSectionTransitionModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title={`Concludi "${sectionName}"?`}
      message={`Stai per concludere la sezione "${sectionName}". Non potrai più tornare a questa sezione. Vuoi continuare?`}
      confirmLabel="Concludi Sezione"
      cancelLabel="Annulla"
      variant="warning"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

interface SimpleSubmitModalProps {
  readonly isOpen: boolean;
  readonly answeredCount: number;
  readonly totalQuestions: number;
  readonly isLoading: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function SimpleSubmitModal({
  isOpen,
  answeredCount,
  totalQuestions,
  isLoading,
  onConfirm,
  onCancel,
}: SimpleSubmitModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title="Consegna Simulazione"
      message={`Hai risposto a ${answeredCount}/${totalQuestions} domande. Vuoi consegnare?`}
      confirmLabel="Consegna"
      cancelLabel="Torna alla Simulazione"
      variant="warning"
      onConfirm={onConfirm}
      onCancel={onCancel}
      isLoading={isLoading}
    />
  );
}
