'use client';

/**
 * Difficulty calibration review.
 *
 * The queue the automatic calibration fills, and the only place a proposed difficulty
 * can actually be applied. Nothing on this page happens on its own: the job proposes,
 * a human confirms.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { isStaff } from '@/lib/permissions';
import { PageLoader, ButtonLoader } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import CalibrationProposalRow from './CalibrationProposalRow';
import CalibrationHistoryTab from './CalibrationHistoryTab';
import { scaleConfidenceLabels } from '@/lib/questions/calibrationLabels';
import { ArrowLeft, Check, RefreshCw, Scale, TrendingDown, TrendingUp, X } from 'lucide-react';

type DirectionFilter = 'all' | 'harder' | 'easier';
type Tab = 'proposals' | 'history';

export default function CalibrazionePage() {
  const { user, loading: authLoading } = useAuth();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [subjectId, setSubjectId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<'ACCEPT' | 'REJECT' | null>(null);
  const [tab, setTab] = useState<Tab>('proposals');

  const canDecide = can('questions.calibrateDifficulty');
  const canRevertRun = can('questions.calibrateAllSubjects');

  const { data: overview } = trpc.questionCalibration.getOverview.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: subjects } = trpc.materials.getAllSubjects.useQuery(undefined, { enabled: !!user });
  const { data: list, isLoading } = trpc.questionCalibration.listProposals.useQuery(
    {
      page: 1,
      pageSize: 100,
      direction: direction === 'all' ? undefined : direction,
      subjectId: subjectId || undefined,
    },
    { enabled: !!user }
  );

  const decide = trpc.questionCalibration.decideProposals.useMutation({
    onError: handleMutationError,
    onSuccess: (result) => {
      const parts = [
        result.applied > 0 ? `${result.applied} confermate` : '',
        result.rejected > 0 ? `${result.rejected} rifiutate` : '',
        // A conflict means someone edited the question while this page was open. The
        // proposal was NOT applied, and saying so plainly is the whole point.
        result.conflicts > 0
          ? `${result.conflicts} non applicate: la domanda è stata modificata nel frattempo`
          : '',
      ].filter(Boolean);
      showSuccess('Operazione completata', parts.join(' · ') || 'Nessuna modifica.');
      setSelectedIds(new Set());
      utils.questionCalibration.listProposals.invalidate();
      utils.questionCalibration.getOverview.invalidate();
      utils.questionCalibration.getPendingProposalCount.invalidate();
      utils.questions.getQuestions.invalidate();
    },
  });

  // The weekly gate now counts a refused run as an attempt, so the nightly cron stops
  // re-flagging the same batch. That only works if a human who has fixed something
  // upstream can ask for a fresh run instead of waiting out the week.
  const rerun = trpc.questionCalibration.runNow.useMutation({
    onError: handleMutationError,
    onSuccess: (summary) => {
      showSuccess(
        'Ricalcolo eseguito',
        summary.isAnomalous
          ? `${summary.proposalsComputed} proposte calcolate, nessuna pubblicata: ancora anomalo (${summary.anomalyReason}).`
          : `${summary.proposalsCreated} proposte pubblicate.`
      );
      utils.questionCalibration.listProposals.invalidate();
      utils.questionCalibration.getOverview.invalidate();
      utils.questionCalibration.getPendingProposalCount.invalidate();
    },
  });

  const subjectNames = useMemo(
    () => new Map((subjects ?? []).map((s) => [s.id, s.name])),
    [subjects]
  );

  const subjectOptions = useMemo(
    () => [
      { value: '', label: 'Tutte le materie' },
      ...(subjects ?? [])
        .map((s) => ({ value: s.id, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    ],
    [subjects]
  );

  const proposals = list?.proposals ?? [];

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDecide = (ids: string[], decision: 'ACCEPT' | 'REJECT') => {
    if (ids.length === 0) return;
    decide.mutate({ auditIds: ids, decision });
  };

  if (authLoading || permissionsLoading) return <PageLoader />;
  if (!user || !isStaff(user.role)) {
    return (
      <div className={`${colors.background.card} rounded-xl p-8 text-center ${colors.text.muted}`}>
        Non hai accesso a questa pagina.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/domande"
          className={`p-2 rounded-lg ${colors.text.secondary} hover:${colors.background.secondary}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Calibrazione difficoltà</h1>
          <p className={`text-sm ${colors.text.muted}`}>
            Modifiche proposte in base alle performance reali degli studenti. Nulla viene
            applicato senza la tua conferma.
          </p>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Scale className="w-5 h-5" />}
          value={overview?.pendingTotal ?? 0}
          label="Da confermare"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-red-500" />}
          value={overview?.byDirection.harder ?? 0}
          label="Diventerebbero più difficili"
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5 text-emerald-500" />}
          value={overview?.byDirection.easier ?? 0}
          label="Diventerebbero più facili"
        />
        <StatCard
          value={overview?.measuredQuestions ?? 0}
          label="Domande con dati sufficienti"
          hint={
            overview?.unmeasuredQuestions
              ? `${overview.unmeasuredQuestions} senza risposte`
              : undefined
          }
        />
      </div>

      {overview?.lastRun?.isAnomalous && (
        <div className="rounded-xl p-4 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          <p className="font-medium">L&apos;ultimo ricalcolo è stato marcato come anomalo.</p>
          <p className="text-sm mt-1">
            Aveva calcolato <strong>{overview.lastRun.proposalsComputed} proposte</strong>{' '}
            ({overview.lastRun.proposalsHarder} più difficili, {overview.lastRun.proposalsEasier} più
            facili) e non ne ha pubblicata nessuna. Venti domande non cambiano natura nella stessa
            settimana: conviene capire cosa è cambiato a monte prima di procedere.
          </p>
          <p className="text-sm mt-1 opacity-80">
            Nessuna difficoltà è stata modificata. Codice del controllo:{' '}
            <code>{overview.lastRun.anomalyReason}</code>.
          </p>
          {canRevertRun && (
            <button
              type="button"
              onClick={() => rerun.mutate({ mode: 'PROPOSE', forceProposals: true })}
              disabled={rerun.isPending}
              className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.primary} disabled:opacity-50`}
            >
              <ButtonLoader loading={rerun.isPending} loadingText="Ricalcolo in corso...">
                <RefreshCw className="w-4 h-4" />
                Riprova adesso
              </ButtonLoader>
            </button>
          )}
        </div>
      )}

      {/*
        The scale is the reason a label means the same thing this month as last. If no
        subject has one yet, the cuts are still the generic ones and a reviewer deserves
        to know that before treating a proposal as authoritative.
      */}
      {overview && (overview.scales?.length ?? 0) === 0 && (
        <div className={`rounded-xl p-4 ${colors.background.card} ${colors.effects.shadow.sm}`}>
          <p className={`text-sm ${colors.text.secondary}`}>
            Nessuna materia ha ancora una <strong>scala di riferimento</strong>: servono almeno{' '}
            {overview.minAnchorsForScale} domande ben misurate per materia. Fino ad allora il sistema usa
            soglie generiche, quindi le proposte vanno lette come un suggerimento da verificare, non
            come una misura.
          </p>
        </div>
      )}

      {overview && (overview.scales?.length ?? 0) > 0 && (
        <div className={`rounded-xl p-4 ${colors.background.card} ${colors.effects.shadow.sm}`}>
          <p className={`text-sm ${colors.text.secondary} mb-2`}>
            Scala di riferimento per materia — è ciò che tiene ferme le etichette nel tempo.
          </p>
          <div className="flex flex-wrap gap-2">
            {(overview.scales ?? []).map((scale) => (
              <span
                key={scale.subjectId}
                className={`text-xs px-2 py-1 rounded-full ${colors.background.secondary} ${colors.text.secondary}`}
                title={
                  scale.fitKappa != null
                    ? `Accordo con le etichette dei docenti: ${scale.fitKappa.toFixed(2)} su ${scale.fitSampleSize} domande`
                    : 'Soglie generiche: non ci sono ancora abbastanza etichette scelte a mano'
                }
              >
                {subjectNames.get(scale.subjectId) ?? 'Materia'} ·{' '}
                {scaleConfidenceLabels[scale.confidence] ?? scale.confidence}
              </span>
            ))}
          </div>
        </div>
      )}

      {overview && overview.flaggedQuestions > 0 && (
        <div className={`rounded-xl p-4 ${colors.background.card} ${colors.effects.shadow.sm}`}>
          <p className={`text-sm ${colors.text.secondary}`}>
            <strong>{overview.flaggedQuestions}</strong> domande sono state segnalate come{' '}
            <em>da verificare</em>: gli studenti più preparati le sbagliano più degli altri, il che
            spesso indica una risposta corretta segnata sull&apos;opzione sbagliata. Queste{' '}
            <strong>non</strong> vengono riclassificate — vanno riviste a mano.
          </p>
        </div>
      )}

      <div className={`flex items-center gap-1 border-b ${colors.border.primary}`}>
        {([
          ['proposals', 'Da confermare'],
          ['history', 'Storico'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === key
                ? `${colors.primary.text} ${colors.primary.border}`
                : `${colors.text.muted} border-transparent`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'history' ? (
        <CalibrationHistoryTab canDecide={canDecide} canRevertRun={canRevertRun} />
      ) : (
      <>
      {/* Filters + bulk actions */}
      <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm} flex flex-wrap items-center gap-3`}>
        <div className="w-48">
          <CustomSelect
            value={subjectId}
            onChange={setSubjectId}
            options={subjectOptions}
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'harder', 'easier'] as DirectionFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDirection(option)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                direction === option
                  ? `${colors.primary.bg} text-white ${colors.primary.border}`
                  : `${colors.border.primary} ${colors.text.secondary}`
              }`}
            >
              {option === 'all' ? 'Tutte' : option === 'harder' ? 'Più difficili' : 'Più facili'}
            </button>
          ))}
        </div>

        {canDecide && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className={`text-sm ${colors.text.muted}`}>{selectedIds.size} selezionate</span>
            <button
              type="button"
              onClick={() => setBulkConfirm('ACCEPT')}
              disabled={decide.isPending}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white disabled:opacity-50`}
            >
              <Check className="w-4 h-4" />
              {decide.isPending ? <ButtonLoader>Conferma</ButtonLoader> : 'Conferma'}
            </button>
            <button
              type="button"
              onClick={() => setBulkConfirm('REJECT')}
              disabled={decide.isPending}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} disabled:opacity-50`}
            >
              <X className="w-4 h-4" />
              Rifiuta
            </button>
          </div>
        )}
      </div>

      {/* Proposals */}
      <div className={`${colors.background.card} rounded-xl ${colors.effects.shadow.sm} overflow-hidden`}>
        {isLoading ? (
          <div className="p-8">
            <PageLoader />
          </div>
        ) : proposals.length === 0 ? (
          <div className={`p-8 text-center ${colors.text.muted}`}>
            Nessuna proposta in attesa. Le statistiche si aggiornano ogni notte; le proposte al
            massimo una volta a settimana.
          </div>
        ) : (
          proposals.map((proposal) => (
            <CalibrationProposalRow
              key={proposal.id}
              proposal={proposal}
              selected={selectedIds.has(proposal.id)}
              canDecide={canDecide}
              expanded={expandedId === proposal.id}
              onToggleSelect={toggleSelect}
              onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              onDecide={handleDecide}
              isBusy={decide.isPending}
            />
          ))
        )}
      </div>
      </>
      )}

      <ConfirmModal
        isOpen={bulkConfirm !== null}
        onClose={() => setBulkConfirm(null)}
        onConfirm={() => {
          handleDecide([...selectedIds], bulkConfirm ?? 'ACCEPT');
          setBulkConfirm(null);
        }}
        title={bulkConfirm === 'ACCEPT' ? 'Confermare le modifiche?' : 'Rifiutare le proposte?'}
        message={
          bulkConfirm === 'ACCEPT'
            ? `Stai per cambiare la difficoltà di ${selectedIds.size} domande. Ogni modifica resta annullabile dallo storico.`
            : `Stai per rifiutare ${selectedIds.size} proposte. Potranno essere riproposte se i dati cambiano.`
        }
        confirmText={bulkConfirm === 'ACCEPT' ? 'Conferma' : 'Rifiuta'}
      />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  hint,
}: {
  icon?: React.ReactNode;
  value: number;
  label: string;
  hint?: string;
}) {
  return (
    <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-2xl font-bold ${colors.text.primary}`}>{value}</span>
      </div>
      <p className={`text-sm ${colors.text.muted} mt-1`}>{label}</p>
      {hint && <p className={`text-xs ${colors.text.muted} mt-0.5`}>{hint}</p>}
    </div>
  );
}
