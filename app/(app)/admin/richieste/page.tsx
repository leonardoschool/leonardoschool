'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  MessageSquare,
  Search,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  MailCheck,
  Archive,
  Mail,
  Phone,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Reply,
} from 'lucide-react';

type RequestStatus = 'PENDING' | 'READ' | 'REPLIED' | 'ARCHIVED';

const statusConfig: Record<RequestStatus, { label: string; icon: typeof Clock; bgClass: string; textClass: string }> = {
  PENDING: {
    label: 'Da Leggere',
    icon: Clock,
    bgClass: colors.status.warning.softBg,
    textClass: colors.status.warning.text,
  },
  READ: {
    label: 'Letta',
    icon: Eye,
    bgClass: colors.status.info.softBg,
    textClass: colors.status.info.text,
  },
  REPLIED: {
    label: 'Risposto',
    icon: MailCheck,
    bgClass: colors.status.success.softBg,
    textClass: colors.status.success.text,
  },
  ARCHIVED: {
    label: 'Archiviata',
    icon: Archive,
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
};

export default function ContactRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Fetch requests
  const { data, isLoading } = trpc.contactRequests.getAll.useQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
    page: currentPage,
    limit: 10,
  });

  // Fetch stats
  const { data: stats } = trpc.contactRequests.getStats.useQuery();

  // Fetch single request for detail view
  const { data: requestDetail } = trpc.contactRequests.getById.useQuery(
    { id: selectedRequest! },
    { enabled: !!selectedRequest }
  );

  // Mutations
  const updateStatusMutation = trpc.contactRequests.updateStatus.useMutation({
    onSuccess: () => {
      utils.contactRequests.getAll.invalidate();
      utils.contactRequests.getStats.invalidate();
      utils.contactRequests.getById.invalidate();
      showSuccess('Stato aggiornato', 'Lo stato della richiesta è stato aggiornato.');
    },
    onError: handleMutationError,
  });

  const markAsReadMutation = trpc.contactRequests.markAsRead.useMutation({
    onSuccess: () => {
      utils.contactRequests.getAll.invalidate();
      utils.contactRequests.getStats.invalidate();
      utils.contactRequests.getById.invalidate();
    },
    onError: handleMutationError,
  });

  const deleteMutation = trpc.contactRequests.delete.useMutation({
    onSuccess: () => {
      utils.contactRequests.getAll.invalidate();
      utils.contactRequests.getStats.invalidate();
      setDeleteModal({ open: false, id: '', name: '' });
      setSelectedRequest(null);
      showSuccess('Richiesta eliminata', 'La richiesta è stata eliminata.');
    },
    onError: handleMutationError,
  });

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const handleOpenDetail = (id: string, status: RequestStatus) => {
    setSelectedRequest(id);
    // Mark as read when opening if it's pending
    if (status === 'PENDING') {
      markAsReadMutation.mutate({ id });
    }
  };

  const handleStatusChange = (id: string, newStatus: RequestStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8" />
            Richieste Informazioni
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Gestisci le richieste ricevute dal form &quot;Contattaci&quot;
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <p className={`text-sm ${colors.text.secondary}`}>Totali</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#f59e0b' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Da Leggere</p>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#3b82f6' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Lette</p>
            <p className="text-2xl font-bold">{stats.read}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#22c55e' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Risposte</p>
            <p className="text-2xl font-bold">{stats.replied}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#6b7280' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Archiviate</p>
            <p className="text-2xl font-bold">{stats.archived}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              placeholder="Cerca per nome, email, oggetto..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${colors.background.secondary} border border-transparent focus:border-pink-500 focus:outline-none`}
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? `${colors.primary.gradient} text-white`
                  : `${colors.background.secondary} hover:opacity-80`
              }`}
            >
              Tutte
            </button>
            {(Object.keys(statusConfig) as RequestStatus[]).map((status) => {
              const config = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? `${colors.primary.gradient} text-white`
                      : `${colors.background.secondary} hover:opacity-80`
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className={`${colors.background.card} rounded-xl shadow-sm overflow-hidden`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento richieste...</p>
          </div>
        ) : !data?.requests?.length ? (
          <div className="p-12 text-center">
            <MessageSquare className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>
              {statusFilter !== 'all' || searchQuery
                ? 'Nessuna richiesta trovata con questi filtri'
                : 'Nessuna richiesta ricevuta'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {data.requests.map((request) => {
                const statusInfo = statusConfig[request.status as RequestStatus];
                const StatusIcon = statusInfo.icon;
                const isUnread = request.status === 'PENDING';

                return (
                  <div
                    key={request.id}
                    className={`p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                      isUnread ? 'bg-pink-50/50 dark:bg-pink-900/10' : ''
                    }`}
                    onClick={() => handleOpenDetail(request.id, request.status as RequestStatus)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-xl ${isUnread ? colors.primary.softBg : colors.background.secondary} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-lg font-bold ${isUnread ? colors.primary.text : colors.text.secondary}`}>
                          {request.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className={`font-semibold ${isUnread ? 'font-bold' : ''}`}>{request.name}</p>
                            <div className={`flex items-center gap-2 text-sm ${colors.text.secondary} mt-1`}>
                              <Mail className="w-4 h-4" />
                              <span>{request.email}</span>
                            </div>
                            <div className={`flex items-center gap-4 text-sm ${colors.text.muted} mt-2`}>
                              <span>{formatDate(request.createdAt)}</span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusInfo.bgClass}`}>
                            <StatusIcon className={`w-4 h-4 ${statusInfo.textClass}`} />
                            <span className={`text-sm font-medium ${statusInfo.textClass}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>

                        {/* Subject preview */}
                        <p className={`text-sm ${colors.text.secondary} mt-2 line-clamp-1 ${isUnread ? 'font-medium' : ''}`}>
                          <span className="font-medium">Oggetto:</span> {request.subject}
                        </p>
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
                    className={`p-2 rounded-lg ${colors.background.secondary} disabled:opacity-50`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={currentPage === data.pagination.totalPages}
                    className={`p-2 rounded-lg ${colors.background.secondary} disabled:opacity-50`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && requestDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${colors.background.card} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-inherit border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Dettaglio Richiesta</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Richiedente Info */}
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl ${colors.primary.softBg} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-2xl font-bold ${colors.primary.text}`}>
                    {requestDetail.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{requestDetail.name}</h3>
                  <div className={`flex items-center gap-2 ${colors.text.secondary} mt-1`}>
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${requestDetail.email}`} className="hover:underline">
                      {requestDetail.email}
                    </a>
                  </div>
                  <div className={`flex items-center gap-2 ${colors.text.secondary} mt-1`}>
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${requestDetail.phone}`} className="hover:underline">
                      {requestDetail.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick Reply Button */}
              <a
                href={`mailto:${requestDetail.email}?subject=Re: ${encodeURIComponent(requestDetail.subject)}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white hover:opacity-90`}
                onClick={() => {
                  // Mark as replied when clicking reply
                  if (requestDetail.status !== 'REPLIED') {
                    handleStatusChange(requestDetail.id, 'REPLIED');
                  }
                }}
              >
                <Reply className="w-4 h-4" />
                Rispondi via Email
              </a>

              {/* Status & Actions */}
              <div className={`${colors.background.secondary} rounded-xl p-4`}>
                <p className={`text-sm ${colors.text.muted} mb-2`}>Stato richiesta</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusConfig) as RequestStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const isActive = requestDetail.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(requestDetail.id, status)}
                        disabled={updateStatusMutation.isPending}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          isActive
                            ? `${config.bgClass} ${config.textClass} ring-2 ring-current`
                            : `${colors.background.card} hover:opacity-80`
                        }`}
                      >
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`${colors.background.secondary} rounded-xl p-4`}>
                  <p className={`text-sm ${colors.text.muted} mb-1`}>Data richiesta</p>
                  <p className="font-medium">{formatDate(requestDetail.createdAt)}</p>
                </div>
                {requestDetail.readAt && (
                  <div className={`${colors.background.secondary} rounded-xl p-4`}>
                    <p className={`text-sm ${colors.text.muted} mb-1`}>Letta il</p>
                    <p className="font-medium">{formatDate(requestDetail.readAt)}</p>
                  </div>
                )}
                {requestDetail.repliedAt && (
                  <div className={`${colors.background.secondary} rounded-xl p-4`}>
                    <p className={`text-sm ${colors.text.muted} mb-1`}>Risposta inviata il</p>
                    <p className="font-medium">{formatDate(requestDetail.repliedAt)}</p>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className={`${colors.background.secondary} rounded-xl p-4`}>
                <p className={`text-sm ${colors.text.muted} mb-1`}>Oggetto</p>
                <p className="font-medium">{requestDetail.subject}</p>
              </div>

              {/* Message */}
              <div className={`${colors.background.secondary} rounded-xl p-4`}>
                <p className={`text-sm ${colors.text.muted} mb-2`}>Messaggio</p>
                <p className="whitespace-pre-wrap">{requestDetail.message}</p>
              </div>

              {/* Admin Notes */}
              {requestDetail.adminNotes && (
                <div className={`${colors.background.secondary} rounded-xl p-4`}>
                  <p className={`text-sm ${colors.text.muted} mb-2 flex items-center gap-2`}>
                    <AlertCircle className="w-4 h-4" />
                    Note Admin
                  </p>
                  <p className="whitespace-pre-wrap">{requestDetail.adminNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-inherit border-t px-6 py-4 flex justify-between">
              <button
                onClick={() => setDeleteModal({ open: true, id: requestDetail.id, name: requestDetail.name })}
                className={`px-4 py-2 rounded-lg ${colors.status.error.softBg} ${colors.status.error.text} hover:opacity-80 flex items-center gap-2`}
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className={`px-4 py-2 rounded-lg ${colors.background.secondary} hover:opacity-80`}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: '', name: '' })}
        onConfirm={() => deleteMutation.mutate({ id: deleteModal.id })}
        title="Elimina richiesta"
        message={`Sei sicuro di voler eliminare la richiesta di "${deleteModal.name}"? Questa azione non può essere annullata.`}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
