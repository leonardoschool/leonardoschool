'use client';

import { BarChart3, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { colors } from '@/lib/theme/colors';

type SectionStat = {
  section: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  accuracy: number;
};

type SectionPerformanceCardProps = {
  sectionStats?: SectionStat[] | null;
};

function getAccuracyTone(accuracy: number) {
  if (accuracy >= 70) {
    return {
      bar: colors.status.success.bg,
      surface: colors.status.success.bgLight,
      text: colors.status.success.text,
    };
  }

  if (accuracy >= 40) {
    return {
      bar: colors.status.warning.bg,
      surface: colors.status.warning.bgLight,
      text: colors.status.warning.text,
    };
  }

  return {
    bar: colors.status.error.bg,
    surface: colors.status.error.bgLight,
    text: colors.status.error.text,
  };
}

function formatPercentage(value: number) {
  return value.toLocaleString('it-IT', {
    maximumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  });
}

function SectionPerformanceRow({ section }: { section: SectionStat }) {
  const accuracyTone = getAccuracyTone(section.accuracy);
  const accuracy = Math.min(Math.max(section.accuracy, 0), 100);

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h4 className="break-words text-sm font-semibold text-gray-900 dark:text-white">
            {section.section}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {section.totalQuestions} domande affrontate
          </p>
        </div>

        <div className={`w-fit rounded-lg px-3 py-1 text-sm font-bold ${accuracyTone.surface} ${accuracyTone.text}`}>
          {formatPercentage(section.accuracy)}%
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-full rounded-full ${accuracyTone.bar}`}
          style={{ width: `${accuracy}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 ${colors.status.success.bgLight} ${colors.status.success.text}`}>
          <CheckCircle className="h-3.5 w-3.5" />
          {section.correctAnswers} corrette
        </span>
        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 ${colors.status.error.bgLight} ${colors.status.error.text}`}>
          <XCircle className="h-3.5 w-3.5" />
          {section.wrongAnswers} errate
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          <HelpCircle className="h-3.5 w-3.5" />
          {section.blankAnswers} vuote
        </span>
      </div>
    </li>
  );
}

export default function SectionPerformanceCard({ sectionStats }: SectionPerformanceCardProps) {
  const hasSectionStats = Boolean(sectionStats?.length);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 ${colors.primary.softBg}`}>
            <BarChart3 className={`h-5 w-5 ${colors.primary.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Performance per Sezione
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Accuratezza e risposte aggregate per area
            </p>
          </div>
        </div>

        {hasSectionStats && (
          <span className="w-fit rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {sectionStats?.length} sezioni
          </span>
        )}
      </div>

      {hasSectionStats ? (
        <ul className="grid gap-x-8 divide-y divide-gray-100 dark:divide-gray-700 xl:grid-cols-2 xl:divide-y-0">
          {sectionStats?.map((section) => (
            <SectionPerformanceRow key={section.section} section={section} />
          ))}
        </ul>
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
          Dati sezione non disponibili
        </div>
      )}
    </section>
  );
}

