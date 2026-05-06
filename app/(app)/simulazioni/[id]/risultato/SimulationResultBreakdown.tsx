'use client';

import { BarChart3, BookOpen, CheckCircle, HelpCircle, Layers, XCircle } from 'lucide-react';
import { colors } from '@/lib/theme/colors';

export type ResultBreakdownItem = {
  name: string;
  color: string | null;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  score: number;
  accuracy: number;
};

type SimulationResultBreakdownProps = {
  subjectBreakdown?: ResultBreakdownItem[];
  sectionBreakdown?: ResultBreakdownItem[];
};

function formatScore(value: number) {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentage(value: number) {
  return value.toLocaleString('it-IT', {
    maximumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  });
}

function getScoreClass(score: number) {
  if (score > 0) return colors.status.success.text;
  if (score < 0) return colors.status.error.text;
  return colors.text.muted;
}

function BreakdownRow({ item }: { item: ResultBreakdownItem }) {
  const total = Math.max(item.totalQuestions, 1);
  const correctWidth = (item.correctAnswers / total) * 100;
  const wrongWidth = (item.wrongAnswers / total) * 100;
  const blankWidth = (item.blankAnswers / total) * 100;

  return (
    <li className={`px-4 py-3 ${colors.background.hover}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {item.color && (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            )}
            <p className={`truncate text-sm font-semibold ${colors.text.primary}`}>{item.name}</p>
          </div>
          <p className={`mt-1 text-xs ${colors.text.muted}`}>
            {item.totalQuestions} domande · {formatPercentage(item.accuracy)}% corrette
          </p>
        </div>
        <p className={`shrink-0 text-sm font-bold ${getScoreClass(item.score)}`}>
          {formatScore(item.score)} pt
        </p>
      </div>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
        <div className={colors.status.success.bg} style={{ width: `${correctWidth}%` }} />
        <div className={colors.status.error.bg} style={{ width: `${wrongWidth}%` }} />
        <div className="bg-gray-400 dark:bg-slate-500" style={{ width: `${blankWidth}%` }} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${colors.status.success.bgLight} ${colors.status.success.text}`}>
          <CheckCircle className="h-3.5 w-3.5" />
          {item.correctAnswers}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${colors.status.error.bgLight} ${colors.status.error.text}`}>
          <XCircle className="h-3.5 w-3.5" />
          {item.wrongAnswers}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
          <HelpCircle className="h-3.5 w-3.5" />
          {item.blankAnswers}
        </span>
      </div>
    </li>
  );
}

function BreakdownGroup({
  title,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: typeof BookOpen;
  items: ResultBreakdownItem[];
  emptyLabel: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border ${colors.border.light} ${colors.background.card}`}>
      <div className={`flex items-center justify-between gap-3 border-b ${colors.border.light} px-4 py-3 ${colors.background.secondary}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colors.primary.text}`} />
          <h3 className={`font-semibold ${colors.text.primary}`}>{title}</h3>
        </div>
        <span className={`rounded-lg px-2 py-1 text-xs ${colors.background.card} ${colors.text.muted}`}>
          {items.length}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className={`max-h-96 overflow-y-auto divide-y ${colors.border.light}`}>
          {items.map((item) => (
            <BreakdownRow key={item.name} item={item} />
          ))}
        </ul>
      ) : (
        <div className={`px-4 py-8 text-center text-sm ${colors.text.muted}`}>{emptyLabel}</div>
      )}
    </div>
  );
}

export default function SimulationResultBreakdown({
  subjectBreakdown = [],
  sectionBreakdown = [],
}: SimulationResultBreakdownProps) {
  if (subjectBreakdown.length === 0 && sectionBreakdown.length === 0) return null;

  return (
    <section className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-5 sm:p-6 mb-8`}>
      <div className="mb-5 flex items-start gap-3">
        <div className={`rounded-lg p-2 ${colors.primary.softBg}`}>
          <BarChart3 className={`h-5 w-5 ${colors.primary.text}`} />
        </div>
        <div>
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Dettaglio del risultato</h2>
          <p className={`text-sm ${colors.text.muted}`}>Punteggi riferiti solo a questa simulazione</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownGroup
          title="Per materia"
          icon={BookOpen}
          items={subjectBreakdown}
          emptyLabel="Nessuna materia disponibile"
        />
        <BreakdownGroup
          title="Per sezione"
          icon={Layers}
          items={sectionBreakdown}
          emptyLabel="Questa simulazione non ha sezioni configurate"
        />
      </div>
    </section>
  );
}
