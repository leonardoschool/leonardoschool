'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import {
  Mail,
  Search,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

type EmailStatus = 'SENT' | 'FAILED';

// Etichette italiane per le categorie (i valori tecnici arrivano dal server)
const categoryLabels: Record<string, string> = {
  CONTRACT_ASSIGNED: 'Contratto assegnato',
  CONTRACT_SIGNED_CONFIRMATION: 'Conferma firma contratto',
  CONTRACT_REMINDER: 'Promemoria contratto',
  CONTRACT_EXPIRED: 'Contratto scaduto',
  ACCOUNT_ACTIVATED: 'Account attivato',
  ADMIN_NOTIFICATION_PROFILE_COMPLETED: 'Notifica: profilo completato',
  ADMIN_NOTIFICATION_CONTRACT_SIGNED: 'Notifica: contratto firmato',
  AUTH_EMAIL_VERIFICATION: 'Verifica email',
  AUTH_PASSWORD_RESET: 'Reset password',
  WELCOME: 'Benvenuto / Set password',
  EVENT_INVITATION: 'Invito evento',
  EVENT_MODIFICATION: 'Modifica evento',
  EVENT_CANCELLATION: 'Annullamento evento',
  ABSENCE_STATUS: 'Stato assenza',
  SIMULATION_INVITATION: 'Invito simulazione',
};

const categoryLabel = (category: string) => categoryLabels[category] ?? category;

export default function LogEmailContent() {
  const [statusFilter, setStatusFilter] = useState<EmailStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const sharedFilters = {
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    search: searchQuery || undefined,
  };

  const { data, isLoading } = trpc.emailLog.getAll.useQuery({
    ...sharedFilters,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: currentPage,
    limit: 20,
  });

  const { data: stats } = trpc.emailLog.getStats.useQuery(sharedFilters);

  const formatDate = (date: Date | string) =>
    new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));

  const resetPage = () => setCurrentPage(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Mail className="w-8 h-8" />
          Log Email
        </h1>
        <p className={`mt-1 ${colors.text.secondary}`}>
          Storico degli invii email della piattaforma con relativo esito
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <p className={`text-sm ${colors.text.secondary}`}>Totali</p>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.total}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#22c55e' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Inviate</p>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.sent}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#ef4444' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Fallite</p>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.failed}</p>
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
              placeholder="Cerca per destinatario o oggetto..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetPage();
              }}
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${colors.background.secondary} border border-transparent focus:border-pink-500 focus:outline-none`}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              resetPage();
            }}
            className={`px-3 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} border border-transparent focus:border-pink-500 focus:outline-none`}
          >
            <option value="all">Tutte le categorie</option>
            {Object.keys(categoryLabels).map((cat) => (
              <option key={cat} value={cat}>{categoryLabels[cat]}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'SENT', 'FAILED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); resetPage(); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? `${colors.primary.gradient} text-white`
                    : `${colors.background.secondary} ${colors.text.primary} hover:opacity-80`
                }`}
              >
                {status === 'all' ? 'Tutte' : status === 'SENT' ? 'Inviate' : 'Fallite'}
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
            <Mail className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>
              {statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery
                ? 'Nessun invio trovato con questi filtri'
                : 'Nessun invio registrato'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {data.logs.map((log) => {
                const isFailed = log.status === 'FAILED';
                return (
                  <div key={log.id} className="p-5 flex items-start gap-4">
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {isFailed ? (
                        <XCircle className={`w-6 h-6 ${colors.status.error.text}`} />
                      ) : (
                        <CheckCircle2 className={`w-6 h-6 ${colors.status.success.text}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className={`font-semibold ${colors.text.primary} truncate`}>{log.to}</p>
                        <span className={`text-xs ${colors.text.muted} flex-shrink-0`}>
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      <p className={`text-sm ${colors.text.secondary} mt-1 line-clamp-1`}>
                        {log.subject}
                      </p>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.background.secondary} ${colors.text.secondary}`}>
                          {categoryLabel(log.category)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isFailed ? colors.status.error.softBg + ' ' + colors.status.error.text : colors.status.success.softBg + ' ' + colors.status.success.text}`}>
                          {isFailed ? 'Fallita' : 'Inviata'}
                        </span>
                      </div>

                      {/* Error detail */}
                      {isFailed && log.error && (
                        <div className={`mt-2 text-xs ${colors.status.error.text} flex items-start gap-1.5`}>
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{log.error}</span>
                        </div>
                      )}
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
