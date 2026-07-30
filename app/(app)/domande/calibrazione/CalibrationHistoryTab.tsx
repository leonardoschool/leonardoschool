'use client';

/**
 * Decided changes, and the way back.
 *
 * A revert is itself a human decision, so it does not "unset" anything: it applies the
 * previous level and marks the difficulty as manual, which is exactly what the router
 * does. The per-run button exists for the case the per-row one cannot cover — a whole
 * recalculation that turned out to be wrong.
 */

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import { ArrowRight, ExternalLink, RotateCcw } from 'lucide-react';
import { difficultyLabels, type DifficultyLevel } from '@/lib/validations/questionValidation';
import { reasonCodeLabels } from '@/lib/questions/calibrationLabels';

const difficultyColors: Record<DifficultyLevel, string> = {
  EASY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  HARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  APPLIED: 'Applicata',
  REJECTED: 'Rifiutata',
  REVERTED: 'Annullata',
};

const statusColors: Record<string, string> = {
  APPLIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  REJECTED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  REVERTED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  canDecide: boolean;
  canRevertRun: boolean;
}

export default function CalibrationHistoryTab({ canDecide, canRevertRun }: Props) {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const [runId, setRunId] = useState('');
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [confirmRunRevert, setConfirmRunRevert] = useState(false);

  const { data: runs } = trpc.questionCalibration.listRuns.useQuery({ limit: 20 });
  const { data, isLoading } = trpc.questionCalibration.listHistory.useQuery({
    page: 1,
    pageSize: 50,
    runId: runId || undefined,
  });

  const invalidate = () => {
    utils.questionCalibration.listHistory.invalidate();
    utils.questionCalibration.getOverview.invalidate();
    utils.questions.getQuestions.invalidate();
  };

  const revert = trpc.questionCalibration.revertChange.useMutation({
    onError: handleMutationError,
    onSuccess: () => {
      showSuccess('Modifica annullata', 'La difficoltà precedente è stata ripristinata.');
      invalidate();
    },
  });

  const revertRun = trpc.questionCalibration.revertRun.useMutation({
    onError: handleMutationError,
    onSuccess: (result) => {
      showSuccess(
        'Ricalcolo annullato',
        result.reverted > 0
          ? `${result.reverted} domande riportate alla difficoltà precedente.`
          : 'Nessuna modifica da annullare per questo ricalcolo.'
      );
      invalidate();
    },
  });

  const runOptions = [
    { value: '', label: 'Tutti i ricalcoli' },
    ...(runs ?? []).map((run) => ({
      value: run.id,
      label: `${formatDate(run.startedAt)} · ${run.proposalsCreated ?? 0} proposte${run.isAnomalous ? ' · anomalo' : ''}`,
    })),
  ];

  const changes = data?.changes ?? [];

  return (
    <div className="space-y-4">
      <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm} flex flex-wrap items-center gap-3`}>
        <div className="w-80 max-w-full">
          <CustomSelect value={runId} onChange={setRunId} options={runOptions} />
        </div>
        {canRevertRun && runId && (
          <button
            type="button"
            onClick={() => setConfirmRunRevert(true)}
            disabled={revertRun.isPending}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.status.error.text} disabled:opacity-50`}
          >
            <RotateCcw className="w-4 h-4" />
            Annulla l&apos;intero ricalcolo
          </button>
        )}
      </div>

      <div className={`${colors.background.card} rounded-xl ${colors.effects.shadow.sm} overflow-hidden`}>
        {isLoading ? (
          <div className="p-8">
            <PageLoader />
          </div>
        ) : changes.length === 0 ? (
          <div className={`p-8 text-center ${colors.text.muted}`}>
            Nessuna modifica decisa finora.
          </div>
        ) : (
          changes.map((change) => (
            <div key={change.id} className={`border-b ${colors.border.primary} last:border-b-0 p-4`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[change.status] ?? ''}`}>
                      {statusLabels[change.status] ?? change.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[change.fromLevel as DifficultyLevel]}`}>
                      {difficultyLabels[change.fromLevel as DifficultyLevel]}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${colors.text.muted}`} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[change.toLevel as DifficultyLevel]}`}>
                      {difficultyLabels[change.toLevel as DifficultyLevel]}
                    </span>
                    {change.question?.subject?.name && (
                      <span className={`text-xs ${colors.text.muted}`}>· {change.question.subject.name}</span>
                    )}
                    <span className={`text-xs ${colors.text.muted}`}>
                      · {formatDate(change.decidedAt ?? change.createdAt)}
                    </span>
                    {change.trigger === 'STAFF_REVIEW' && (
                      <span className={`text-xs ${colors.text.muted}`}>· modifica manuale</span>
                    )}
                  </div>

                  <RichTextRenderer
                    text={(change.question?.text ?? '').slice(0, 220)}
                    className={`text-sm ${colors.text.primary} line-clamp-2`}
                  />

                  <p className={`text-xs ${colors.text.muted} mt-1`}>
                    {reasonCodeLabels[change.reasonCode] ?? change.reasonCode}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {change.question?.id && (
                    <Link
                      href={`/domande/${change.question.id}`}
                      className={`p-2 rounded-lg ${colors.text.muted} hover:${colors.background.secondary}`}
                      title="Apri la domanda"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                  {/* Only an applied change can be undone: a rejection left the question untouched. */}
                  {canDecide && change.status === 'APPLIED' && (
                    <button
                      type="button"
                      onClick={() => setRevertingId(change.id)}
                      disabled={revert.isPending}
                      title="Ripristina la difficoltà precedente"
                      className={`p-2 rounded-lg ${colors.status.error.text} hover:${colors.background.secondary} disabled:opacity-50`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={revertingId !== null}
        onClose={() => setRevertingId(null)}
        onConfirm={() => {
          if (revertingId) revert.mutate({ auditId: revertingId });
          setRevertingId(null);
        }}
        title="Ripristinare la difficoltà precedente?"
        message="La domanda torna al livello che aveva prima, e la difficoltà viene marcata come impostata a mano."
        confirmText="Ripristina"
      />

      <ConfirmModal
        isOpen={confirmRunRevert}
        onClose={() => setConfirmRunRevert(false)}
        onConfirm={() => {
          if (runId) revertRun.mutate({ runId });
          setConfirmRunRevert(false);
        }}
        title="Annullare tutto il ricalcolo?"
        message="Tutte le modifiche applicate da questo ricalcolo tornano al livello precedente. Le proposte rifiutate non vengono toccate."
        confirmText="Annulla il ricalcolo"
      />
    </div>
  );
}
