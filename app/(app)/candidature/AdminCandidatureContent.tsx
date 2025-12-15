'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Briefcase,
  Search,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Mail,
  Phone,
  BookOpen,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

type ApplicationStatus = 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED';

const statusConfig: Record<ApplicationStatus, { label: string; icon: typeof Clock; bgClass: string; textClass: string }> = {
  PENDING: {
    label: 'In Attesa',
    icon: Clock,
    bgClass: colors.status.warning.softBg,
    textClass: colors.status.warning.text,
  },
  REVIEWING: {
    label: 'In Revisione',
    icon: Eye,
    bgClass: colors.status.info.softBg,
    textClass: colors.status.info.text,
  },
  APPROVED: {
    label: 'Approvata',
    icon: CheckCircle,
    bgClass: colors.status.success.softBg,
    textClass: colors.status.success.text,
  },
  REJECTED: {
    label: 'Rifiutata',
    icon: XCircle,
    bgClass: colors.status.error.softBg,
    textClass: colors.status.error.text,
  },
};

export default function AdminCandidatureContent() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Fetch applications
  const { data, isLoading } = trpc.jobApplications.getAll.useQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
    page: currentPage,
    limit: 10,
  });

  // Fetch stats
  const { data: stats } = trpc.jobApplications.getStats.useQuery();

  // Fetch single application for detail view
  const { data: applicationDetail } = trpc.jobApplications.getById.useQuery(
    { id: selectedApplication! },
    { enabled: !!selectedApplication }
  );

  // Mutations
  const updateStatusMutation = trpc.jobApplications.updateStatus.useMutation({
    onSuccess: () => {
      utils.jobApplications.getAll.invalidate();
      utils.jobApplications.getStats.invalidate();
      utils.jobApplications.getById.invalidate();
      showSuccess('Stato aggiornato', 'Lo stato della candidatura è stato aggiornato.');
    },
    onError: handleMutationError,
  });

  const deleteMutation = trpc.jobApplications.delete.useMutation({
    onSuccess: () => {
      utils.jobApplications.getAll.invalidate();
      utils.jobApplications.getStats.invalidate();
      setDeleteModal({ open: false, id: '', name: '' });
      setSelectedApplication(null);
      showSuccess('Candidatura eliminata', 'La candidatura è stata eliminata.');
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

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Briefcase className="w-8 h-8" />
            Candidature
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Gestisci le candidature ricevute dal form &quot;Lavora con noi&quot;
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
            <p className={`text-sm ${colors.text.secondary}`}>In Attesa</p>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#3b82f6' }}>
            <p className={`text-sm ${colors.text.secondary}`}>In Revisione</p>
            <p className="text-2xl font-bold">{stats.reviewing}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#22c55e' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Approvate</p>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm border-l-4`} style={{ borderColor: '#ef4444' }}>
            <p className={`text-sm ${colors.text.secondary}`}>Rifiutate</p>
            <p className="text-2xl font-bold">{stats.rejected}</p>
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
              placeholder="Cerca per nome, email, materia..."
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
                  : `${colors.background.secondary} ${colors.text.primary} hover:opacity-80`
              }`}
            >
              Tutte
            </button>
            {(Object.keys(statusConfig) as ApplicationStatus[]).map((status) => {
              const config = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? `${colors.primary.gradient} text-white`
                      : `${colors.background.secondary} ${colors.text.primary} hover:opacity-80`
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className={`${colors.background.card} rounded-xl shadow-sm overflow-hidden`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento candidature...</p>
          </div>
        ) : !data?.applications?.length ? (
          <div className="p-12 text-center">
            <Briefcase className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>
              {statusFilter !== 'all' || searchQuery
                ? 'Nessuna candidatura trovata con questi filtri'
                : 'Nessuna candidatura ricevuta'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {data.applications.map((application) => {
                const statusInfo = statusConfig[application.status as ApplicationStatus];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={application.id}
                    className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedApplication(application.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-xl ${colors.primary.softBg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-lg font-bold ${colors.primary.text}`}>
                          {application.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">{application.name}</p>
                            <div className={`flex items-center gap-2 text-sm ${colors.text.secondary} mt-1`}>
                              <Mail className="w-4 h-4" />
                              <span>{application.email}</span>
                            </div>
                            <div className={`flex items-center gap-4 text-sm ${colors.text.muted} mt-2`}>
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                {application.materia || 'Non specificata'}
                              </span>
                              <span>{formatDate(application.createdAt)}</span>
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
                        <p className={`text-sm ${colors.text.secondary} mt-2 line-clamp-1`}>
                          <span className="font-medium">Oggetto:</span> {application.subject}
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
      {selectedApplication && applicationDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${colors.background.card} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-inherit border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Dettaglio Candidatura</h2>
              <button
                onClick={() => setSelectedApplication(null)}
                className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80`}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Candidato Info */}
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl ${colors.primary.softBg} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-2xl font-bold ${colors.primary.text}`}>
                    {applicationDetail.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{applicationDetail.name}</h3>
                  <div className={`flex items-center gap-2 ${colors.text.secondary} mt-1`}>
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${applicationDetail.email}`} className="hover:underline">
                      {applicationDetail.email}
                    </a>
                  </div>
                  <div className={`flex items-center gap-2 ${colors.text.secondary} mt-1`}>
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${applicationDetail.phone}`} className="hover:underline">
                      {applicationDetail.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className={`${colors.background.secondary} rounded-xl p-4`}>
                <p className={`text-sm ${colors.text.muted} mb-2`}>Stato candidatura</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusConfig) as ApplicationStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const isActive = applicationDetail.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(applicationDetail.id, status)}
                        disabled={updateStatusMutation.isPending}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          isActive
                            ? `${config.bgClass} ${config.textClass} ring-2 ring-current`
                            : `${colors.background.card} ${colors.text.primary} hover:opacity-80`
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
                  <p className={`text-sm ${colors.text.muted} mb-1`}>Materia</p>
                  <p className="font-medium flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {applicationDetail.materia || 'Non specificata'}
                  </p>
                </div>
                <div className={`${colors.background.secondary} rounded-xl p-4`}>
                  <p className={`text-sm ${colors.text.muted} mb-1`}>Data candidatura</p>
                  <p className="font-medium">{formatDate(applicationDetail.createdAt)}</p>
                </div>
              </div>

              {/* Subject */}
              <div className={`${colors.background.secondary} rounded-xl p-4`}>
                <p className={`text-sm ${colors.text.muted} mb-1`}>Oggetto</p>
                <p className="font-medium">{applicationDetail.subject}</p>
              </div>

              {/* Message */}
              <div className={`${colors.background.secondary} rounded-xl p-4`}>
                <p className={`text-sm ${colors.text.muted} mb-2`}>Messaggio</p>
                <p className="whitespace-pre-wrap">{applicationDetail.message}</p>
              </div>

              {/* CV */}
              {applicationDetail.cvUrl && (
                <div className={`${colors.background.secondary} rounded-xl p-4`}>
                  <p className={`text-sm ${colors.text.muted} mb-2`}>Curriculum Vitae</p>
                  <a
                    href={applicationDetail.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.softBg} ${colors.primary.text} hover:opacity-80`}
                  >
                    <Download className="w-4 h-4" />
                    <span>{applicationDetail.cvFileName || 'Scarica CV'}</span>
                  </a>
                </div>
              )}

              {/* Admin Notes */}
              {applicationDetail.adminNotes && (
                <div className={`${colors.background.secondary} rounded-xl p-4`}>
                  <p className={`text-sm ${colors.text.muted} mb-2 flex items-center gap-2`}>
                    <AlertCircle className="w-4 h-4" />
                    Note Admin
                  </p>
                  <p className="whitespace-pre-wrap">{applicationDetail.adminNotes}</p>
                </div>
              )}

              {/* Review Info */}
              {applicationDetail.reviewedAt && (
                <div className={`text-sm ${colors.text.muted} flex items-center gap-2`}>
                  <FileText className="w-4 h-4" />
                  Revisionata il {formatDate(applicationDetail.reviewedAt)}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-inherit border-t px-6 py-4 flex justify-between">
              <button
                onClick={() => setDeleteModal({ open: true, id: applicationDetail.id, name: applicationDetail.name })}
                className={`px-4 py-2 rounded-lg ${colors.status.error.softBg} ${colors.status.error.text} hover:opacity-80 flex items-center gap-2`}
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
              <button
                onClick={() => setSelectedApplication(null)}
                className={`px-4 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:opacity-80`}
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
        title="Elimina candidatura"
        message={`Sei sicuro di voler eliminare la candidatura di "${deleteModal.name}"? Questa azione non può essere annullata.`}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
