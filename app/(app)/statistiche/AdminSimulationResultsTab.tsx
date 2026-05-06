'use client';

import { keepPreviousData } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Award,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  RotateCcw,
  Search,
} from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';
import { Spinner } from '@/components/ui/loaders';
import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';

const TODAY = new Date();
const DATE_MIN_YEAR = 2020;

const PAGE_SIZE = 20;

type SortBy = 'date' | 'score';
type SortOrder = 'asc' | 'desc';

type SimulationResultFilters = {
  simulationSearch: string;
  studentSearch: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: SimulationResultFilters = {
  simulationSearch: '',
  studentSearch: '',
  dateFrom: '',
  dateTo: '',
};

function formatDate(value: Date | string | null) {
  if (!value) return '-';

  return new Date(value).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SortIcon({ active, sortOrder }: { active: boolean; sortOrder: SortOrder }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5" />;
  return sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className={`text-xs font-medium ${colors.text.muted}`}>{label}</span>
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${colors.text.muted}`} />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border ${colors.border.input} ${colors.background.input} ${colors.text.primary} px-3 py-2 pl-9 text-sm outline-none ${colors.border.focus}`}
        />
      </div>
    </label>
  );
}

function DateFilterInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <span className={`block text-xs font-medium ${colors.text.muted}`}>{label}</span>
      <DatePicker
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? 'Seleziona data'}
        minYear={DATE_MIN_YEAR}
        maxYear={TODAY.getFullYear()}
        defaultViewDate={TODAY}
      />
    </div>
  );
}

function SortableHeader({
  label,
  active,
  sortOrder,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  sortOrder: SortOrder;
  onClick: () => void;
  align?: 'left' | 'center';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase ${colors.text.muted} ${align === 'center' ? 'justify-center' : ''} ${colors.primary.textHover}`}
    >
      {label}
      <SortIcon active={active} sortOrder={sortOrder} />
    </button>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const firstResult = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);

  return (
    <div className={`flex flex-col gap-3 border-t ${colors.border.primary} px-4 py-3 sm:flex-row sm:items-center sm:justify-between`}>
      <p className={`text-sm ${colors.text.muted}`}>
        Mostrando {firstResult}-{lastResult} di {total} simulazioni svolte
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`rounded-lg border ${colors.border.primary} p-2 transition-colors ${page <= 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          aria-label="Pagina precedente"
        >
          <ChevronLeft className={`h-5 w-5 ${colors.text.muted}`} />
        </button>
        <span className={`text-sm ${colors.text.primary}`}>
          Pagina {page} di {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`rounded-lg border ${colors.border.primary} p-2 transition-colors ${page >= totalPages ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          aria-label="Pagina successiva"
        >
          <ChevronRight className={`h-5 w-5 ${colors.text.muted}`} />
        </button>
      </div>
    </div>
  );
}

export default function AdminSimulationResultsTab() {
  const [filters, setFilters] = useState<SimulationResultFilters>(emptyFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<SimulationResultFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  const { data, isLoading, isFetching } = trpc.users.getAdminSimulationResults.useQuery(
    {
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortOrder,
      simulationSearch: debouncedFilters.simulationSearch || undefined,
      studentSearch: debouncedFilters.studentSearch || undefined,
      dateFrom: debouncedFilters.dateFrom || undefined,
      dateTo: debouncedFilters.dateTo || undefined,
    },
    { placeholderData: keepPreviousData }
  );

  const results = data?.results ?? [];
  const pagination = data?.pagination ?? { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 };

  const updateFilter = (key: keyof SimulationResultFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const updateSort = (nextSortBy: SortBy) => {
    setPage(1);
    if (sortBy === nextSortBy) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(nextSortBy);
    setSortOrder('desc');
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setDebouncedFilters(emptyFilters);
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className={`${colors.background.card} overflow-hidden rounded-xl border ${colors.border.primary}`}>
        <div className={`border-b ${colors.border.primary} p-4`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${colors.primary.softBg}`}>
                <ClipboardList className={`h-5 w-5 ${colors.primary.text}`} />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Simulazioni svolte dagli studenti</h2>
                <p className={`text-sm ${colors.text.muted}`}>
                  Filtra per simulazione, studente e data; ordina data o punteggio in entrambi i versi.
                </p>
              </div>
            </div>

            {isFetching && !isLoading && (
              <span className={`inline-flex items-center gap-2 text-sm ${colors.text.muted}`}>
                <Spinner size="xs" />
                Aggiornamento
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto] xl:items-end">
            <FilterInput
              label="Simulazione"
              value={filters.simulationSearch}
              onChange={(value) => updateFilter('simulationSearch', value)}
              placeholder="Cerca per titolo"
            />
            <FilterInput
              label="Persona"
              value={filters.studentSearch}
              onChange={(value) => updateFilter('studentSearch', value)}
              placeholder="Nome, email o matricola"
            />
            <DateFilterInput
              id="filter-date-from"
              label="Dal"
              value={filters.dateFrom}
              onChange={(value) => updateFilter('dateFrom', value)}
            />
            <DateFilterInput
              id="filter-date-to"
              label="Al"
              value={filters.dateTo}
              onChange={(value) => updateFilter('dateTo', value)}
            />
            <button
              type="button"
              onClick={resetFilters}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border ${colors.border.primary} px-3 py-2 text-sm ${colors.text.secondary} transition-colors hover:bg-gray-50 dark:hover:bg-slate-700`}
            >
              <RotateCcw className="h-4 w-4" />
              Reimposta
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={colors.background.secondary}>
              <tr>
                <th className="px-4 py-3 text-left">
                  <SortableHeader
                    label="Data"
                    active={sortBy === 'date'}
                    sortOrder={sortOrder}
                    onClick={() => updateSort('date')}
                  />
                </th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${colors.text.muted}`}>Studente</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${colors.text.muted}`}>Simulazione</th>
                <th className="px-4 py-3 text-center">
                  <SortableHeader
                    label="Punteggio"
                    active={sortBy === 'score'}
                    sortOrder={sortOrder}
                    onClick={() => updateSort('score')}
                    align="center"
                  />
                </th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase ${colors.text.muted}`}>Azioni</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${colors.border.primary}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <span className={`inline-flex items-center gap-2 ${colors.text.muted}`}>
                      <Spinner size="sm" />
                      Caricamento simulazioni...
                    </span>
                  </td>
                </tr>
              ) : results.length > 0 ? (
                results.map((result) => (
                  <tr key={result.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className={`whitespace-nowrap px-4 py-3 text-sm ${colors.text.secondary}`}>
                      {formatDate(result.completedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-medium ${colors.text.primary}`}>{result.studentName || result.studentEmail}</p>
                      <p className={`text-xs ${colors.text.muted}`}>{result.studentEmail}</p>
                      {result.studentMatricola && (
                        <p className={`text-xs ${colors.text.muted}`}>Matricola: {result.studentMatricola}</p>
                      )}
                    </td>
                    <td className={`min-w-64 px-4 py-3 ${colors.text.secondary}`}>{result.simulationTitle}</td>
                    <td className={`px-4 py-3 text-center font-semibold ${colors.text.primary}`}>
                      {result.percentageScore.toFixed(1)}%
                      <p className={`text-xs ${colors.text.muted}`}>
                        {result.correctAnswers} / {result.wrongAnswers} / {result.blankAnswers}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/simulazioni/${result.simulationId}/risultato?resultId=${result.id}`}
                          className={`inline-flex items-center gap-1 rounded-lg border ${colors.border.primary} px-3 py-1.5 text-sm ${colors.text.secondary} transition-colors hover:bg-gray-50 dark:hover:bg-slate-700`}
                        >
                          <Eye className="h-4 w-4" />
                          Risultato
                        </Link>
                        <Link
                          href={`/simulazioni/${result.simulationId}/classifica`}
                          className={`inline-flex items-center gap-1 rounded-lg ${colors.primary.bg} px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90`}
                        >
                          <Award className="h-4 w-4" />
                          Classifica
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={`px-4 py-10 text-center ${colors.text.muted}`}>
                    Nessuna simulazione completata trovata con questi filtri.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

