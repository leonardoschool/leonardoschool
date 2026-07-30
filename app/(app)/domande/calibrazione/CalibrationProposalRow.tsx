'use client';

/**
 * One proposed difficulty change, with the evidence behind it.
 *
 * The evidence is the point of this row. A number on its own ("28% corrette") invites
 * a rubber stamp; showing the sample size, the time spent and whether the question was
 * flagged as possibly broken is what lets a tutor disagree with the machine.
 */

import { colors } from '@/lib/theme/colors';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ChevronUp, ExternalLink, Lock, X } from 'lucide-react';
import { difficultyLabels, type DifficultyLevel } from '@/lib/validations/questionValidation';
import { qualityFlagLabels, reasonCodeLabels } from '@/lib/questions/calibrationLabels';

const difficultyColors: Record<DifficultyLevel, string> = {
  EASY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  HARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export interface CalibrationProposal {
  // All optional because the project compiles with `strict: false`: an inferred tRPC
  // payload arrives with every field optional, whatever the schema says.
  id?: string;
  fromLevel?: string;
  toLevel?: string;
  reasonCode?: string;
  confidence?: number | null;
  sampleSize?: number;
  question?: {
    id?: string;
    text?: string;
    difficultySource?: string | null;
    difficultyLockedAt?: string | Date | null;
    avgCorrectRate?: number | null;
    avgTimeSeconds?: number | null;
    timesGraded?: number | null;
    timesAnswered?: number | null;
    qualityFlagCode?: string | null;
    subject?: { name: string; color?: string | null } | null;
  };
}

interface Props {
  proposal: CalibrationProposal;
  selected: boolean;
  canDecide: boolean;
  expanded: boolean;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDecide: (ids: string[], decision: 'ACCEPT' | 'REJECT') => void;
  isBusy: boolean;
}

function rateClass(rate: number): string {
  if (rate >= 70) return 'text-green-600 dark:text-green-400';
  if (rate >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export default function CalibrationProposalRow({
  proposal,
  selected,
  canDecide,
  expanded,
  onToggleSelect,
  onToggleExpand,
  onDecide,
  isBusy,
}: Props) {
  const question = proposal.question ?? {};
  const proposalId = proposal.id ?? '';
  const rate = question.avgCorrectRate;
  const contradictsHuman = question.difficultySource === 'MANUAL';

  return (
    <div className={`border-b ${colors.border.primary} last:border-b-0`}>
      <div className="flex items-start gap-3 p-4">
        {canDecide && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(proposalId)}
            className="mt-1 w-4 h-4 rounded cursor-pointer"
            aria-label="Seleziona proposta"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[proposal.fromLevel as DifficultyLevel]}`}>
              {difficultyLabels[proposal.fromLevel as DifficultyLevel]}
            </span>
            <ArrowRight className={`w-3.5 h-3.5 ${colors.text.muted}`} />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[proposal.toLevel as DifficultyLevel]}`}>
              {difficultyLabels[proposal.toLevel as DifficultyLevel]}
            </span>

            {question.subject?.name && (
              <span className={`text-xs ${colors.text.muted}`}>· {question.subject.name}</span>
            )}

            {rate != null && (
              <span className={`text-xs font-medium ${rateClass(rate)}`}>
                {Math.round(rate)}% corrette
              </span>
            )}
            <span className={`text-xs ${colors.text.muted}`}>
              su {proposal.sampleSize ?? question.timesGraded ?? 0} risposte
            </span>

            {contradictsHuman && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                title="La difficoltà è stata impostata a mano: confermando la sostituisci"
              >
                <Lock className="w-3 h-3" />
                impostata a mano
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onToggleExpand(proposalId)}
            className={`text-left w-full text-sm ${colors.text.primary} hover:underline`}
          >
            <RichTextRenderer text={(question.text ?? '').slice(0, 220)} className="line-clamp-2" />
          </button>

          {expanded && (
            <div className={`mt-3 rounded-lg p-3 ${colors.background.secondary} space-y-2`}>
              <p className={`text-sm ${colors.text.secondary}`}>
                {reasonCodeLabels[proposal.reasonCode ?? ''] ?? proposal.reasonCode}
              </p>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className={colors.text.muted}>
                  Risposte ricevute: <strong>{question.timesAnswered ?? 0}</strong>
                </span>
                <span className={colors.text.muted}>
                  Valutate: <strong>{question.timesGraded ?? 0}</strong>
                </span>
                {question.avgTimeSeconds != null && (
                  <span className={colors.text.muted}>
                    Tempo medio: <strong>{formatSeconds(question.avgTimeSeconds)}</strong>
                  </span>
                )}
                {proposal.confidence != null && (
                  <span className={colors.text.muted}>
                    Confidenza: <strong>{Math.round(proposal.confidence * 100)}%</strong>
                  </span>
                )}
              </div>
              {question.qualityFlagCode && (
                <p className="text-xs rounded-lg px-3 py-2 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  {qualityFlagLabels[question.qualityFlagCode] ?? question.qualityFlagCode}
                </p>
              )}
              {question.id && (
                <Link
                  href={`/domande/${question.id}`}
                  className={`inline-flex items-center gap-1 text-xs ${colors.primary.text} hover:underline`}
                >
                  Apri la domanda <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canDecide && (
            <>
              <button
                type="button"
                onClick={() => onDecide([proposalId], 'ACCEPT')}
                disabled={isBusy}
                title="Conferma la modifica"
                className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDecide([proposalId], 'REJECT')}
                disabled={isBusy}
                title="Rifiuta la proposta"
                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onToggleExpand(proposalId)}
            className={`p-2 rounded-lg ${colors.text.muted} hover:${colors.background.secondary}`}
            aria-label={expanded ? 'Chiudi dettagli' : 'Mostra dettagli'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
