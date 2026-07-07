'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import {
  FileWarning,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertOctagon,
  AlertTriangle,
  Info,
  Trash2,
} from 'lucide-react';

type Level = 'ERROR' | 'WARN' | 'INFO';

const levelMeta: Record<Level, { label: string; icon: typeof AlertOctagon; badge: string; text: string }> = {
  ERROR: {
    label: 'Errore',
    icon: AlertOctagon,
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    text: 'text-red-600 dark:text-red-400',
  },
  WARN: {
    label: 'Warning',
    icon: AlertTriangle,
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    text: 'text-amber-600 dark:text-amber-400',
  },
  INFO: {
    label: 'Info',
    icon: Info,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    text: 'text-blue-600 dark:text-blue-400',
  },
};

export default function LogErroriContent() {
  const [levelFilter, setLevelFilter] = useState<Level | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { showSuccess } = useToast();
  const { handleMutationError } = useApiError();
  const utils = trpc.useUtils();

  const sharedFilters = {
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    search: searchQuery || undefined,
  };

  const { data, isLoading } = trpc.appLog.getAll.useQuery({
    ...sharedFilters,
    level: levelFilter === 'all' ? undefined : levelFilter,
    page: currentPage,
    limit: 20,
  });

  const { data: stats } = trpc.appLog.getStats.useQuery(sharedFilters);

  const clearOld = trpc.appLog.clearOlderThan.useMutation({
    onError: handleMutationError,
    onSuccess: async ({ deleted }) => {
      showSuccess('Pulizia completata', `Eliminati ${deleted} log più vecchi di 30 giorni`);
      await Promise.all([utils.appLog.getAll.invalidate(), utils.appLog.getStats.invalidate()]);
    },
  });

  const formatDate = (date: Date | string) =>
    new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));

  const resetPage = () => setCurrentPage(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FileWarning className="w-8 h-8" />
            Log Errori
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Storico degli errori applicativi della piattaforma (API, simulazioni, login, email…)
          </p>
        </div>
        <button
          onClick={() => clearOld.mutate({ days: 30 })}
          disabled={clearOld.isPending}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} disabled:opacity-50 transition-colors self-start`}
        >
          <Trash2 className="w-4 h-4" />
          Pulisci &gt; 30 giorni
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <p className={`text-sm ${colors.text.secondary}`}>Totali</p>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.total}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#ef4444' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Errori</p>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.errors}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#f59e0b' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Warning</p>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.warnings}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              placeholder="Cerca per messaggio, percorso o utente..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetPage();
              }}
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${colors.background.secondary} border border-transparent focus:border-pink-500 focus:outline-none`}
            />
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              resetPage();
            }}
            className={`px-3 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} border border-transparent focus:border-pink-500 focus:outline-none`}
          >
            <option value="all">Tutte le sorgenti</option>
            {stats?.sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          {/* Level Filter */}
          <div className="flex gap-2">
            {(['all', 'ERROR', 'WARN', 'INFO'] as const).map((level) => (
              <button
                key={level}
                onClick={() => {
                  setLevelFilter(level);
                  resetPage();
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  levelFilter === level
                    ? `${colors.primary.gradient} text-white`
                    : `${colors.background.secondary} ${colors.text.primary} hover:opacity-80`
                }`}
              >
                {level === 'all' ? 'Tutti' : levelMeta[level].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className={`${colors.background.card} rounded-xl shadow-sm overflow-hidden`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento log...</p>
          </div>
        ) : !data?.logs?.length ? (
          <div className="p-12 text-center">
            <FileWarning className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>
              {levelFilter !== 'all' || sourceFilter !== 'all' || searchQuery
                ? 'Nessun log trovato con questi filtri'
                : 'Nessun errore registrato 🎉'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {data.logs.map((log) => {
                const meta = levelMeta[log.level as Level] ?? levelMeta.ERROR;
                const LevelIcon = meta.icon;
                const isExpanded = expandedId === log.id;
                const hasDetail = Boolean(log.stack || log.metadata);
                return (
                  <div key={log.id} className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <LevelIcon className={`w-6 h-6 ${meta.text}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <p className={`font-semibold ${colors.text.primary} break-words`}>{log.message}</p>
                          <span className={`text-xs ${colors.text.muted} flex-shrink-0`}>
                            {formatDate(log.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.background.secondary} ${colors.text.secondary}`}>
                            {log.source}
                          </span>
                          {log.path && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.background.secondary} ${colors.text.muted} font-mono`}>
                              {log.path}
                            </span>
                          )}
                          {log.userEmail && (
                            <span className={`text-xs ${colors.text.muted}`}>{log.userEmail}</span>
                          )}
                          {log.userRole && !log.userEmail && (
                            <span className={`text-xs ${colors.text.muted}`}>{log.userRole}</span>
                          )}
                        </div>

                        {hasDetail && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className={`mt-2 inline-flex items-center gap-1 text-xs ${colors.primary.text} hover:underline`}
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded ? 'Nascondi dettagli' : 'Mostra dettagli'}
                          </button>
                        )}

                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            {log.stack && (
                              <div>
                                <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>Stack trace</p>
                                <pre className={`text-xs ${colors.background.secondary} ${colors.text.secondary} rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words`}>
                                  {log.stack}
                                </pre>
                              </div>
                            )}
                            {log.metadata != null && (
                              <div>
                                <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>Metadata</p>
                                <pre className={`text-xs ${colors.background.secondary} ${colors.text.secondary} rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words`}>
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.requestId && (
                              <p className={`text-xs ${colors.text.muted} font-mono`}>requestId: {log.requestId}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t">
                <p className={`text-sm ${colors.text.secondary}`}>
                  Pagina {data.pagination.page} di {data.pagination.totalPages} ({data.pagination.total} risultati)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={currentPage === data.pagination.totalPages}
                    className={`p-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
