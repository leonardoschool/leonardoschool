'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, ButtonLoader } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  MoreHorizontal,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

// Feedback type labels and icons
const feedbackTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ERROR_IN_QUESTION: {
    label: 'Errore nel testo',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  ERROR_IN_ANSWER: {
    label: 'Errore nelle risposte',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  UNCLEAR: {
    label: 'Poco chiara',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  SUGGESTION: {
    label: 'Suggerimento',
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  OTHER: {
    label: 'Altro',
    icon: <MoreHorizontal className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
};

// Status labels
const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'In attesa', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  REVIEWED: { label: 'Revisionata', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  FIXED: { label: 'Corretta', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED: { label: 'Rifiutata', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

type FeedbackStatus = 'PENDING' | 'REVIEWED' | 'FIXED' | 'REJECTED';

export default function FeedbacksPage() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // State
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [_newStatus, setNewStatus] = useState<FeedbackStatus | ''>('');

  // Fetch feedbacks
  const { data, isLoading } = trpc.questions.getPendingFeedbacks.useQuery({
    page,
    pageSize: 20,
    status: statusFilter || undefined,
  });

  // Update feedback mutation
  const updateMutation = trpc.questions.updateFeedback.useMutation({
    onSuccess: () => {
      showSuccess('Segnalazione aggiornata', 'La segnalazione è stata aggiornata con successo.');
      utils.questions.getPendingFeedbacks.invalidate();
      utils.questions.getQuestionStats.invalidate();
      setSelectedFeedback(null);
      setAdminResponse('');
      setNewStatus('');
    },
    onError: handleMutationError,
  });

  const handleUpdateFeedback = (feedbackId: string, status: FeedbackStatus) => {
    updateMutation.mutate({
      id: feedbackId,
      status,
      adminResponse: adminResponse || undefined,
    });
  };

  if (isLoading && !data) {
    return <PageLoader />;
  }

  const feedbacks = data?.feedbacks ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/domande"
            className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
          >
            <ArrowLeft className={`w-5 h-5 ${colors.text.secondary}`} />
          </Link>
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Segnalazioni</h1>
            <p className={`mt-1 ${colors.text.secondary}`}>
              Gestisci le segnalazioni degli studenti sulle domande
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-48">
          <CustomSelect
            options={[
              { value: '', label: 'Tutti gli stati' },
              { value: 'PENDING', label: 'In attesa' },
              { value: 'REVIEWED', label: 'Revisionate' },
              { value: 'FIXED', label: 'Corrette' },
              { value: 'REJECTED', label: 'Rifiutate' },
            ]}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val as FeedbackStatus | '');
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['PENDING', 'REVIEWED', 'FIXED', 'REJECTED'] as const).map((status) => {
          const count = feedbacks.filter((f) => f.status === status).length;
          return (
            <div
              key={status}
              className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm} cursor-pointer hover:opacity-80 transition-opacity ${
                statusFilter === status ? 'ring-2 ring-[#a8012b]' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${statusLabels[status].color} flex items-center justify-center`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${colors.text.primary}`}>{count}</p>
                  <p className={`text-sm ${colors.text.muted}`}>{statusLabels[status].label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedbacks List */}
      <div className={`${colors.background.card} rounded-xl ${colors.effects.shadow.sm}`}>
        {feedbacks.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className={`w-12 h-12 ${colors.text.muted} mx-auto mb-3`} />
            <p className={`font-medium ${colors.text.primary}`}>Nessuna segnalazione trovata</p>
            <p className={`text-sm ${colors.text.muted} mt-1`}>
              {statusFilter
                ? 'Prova a cambiare il filtro di stato'
                : 'Non ci sono segnalazioni dagli studenti'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Feedback Info */}
                  <div className="flex-1 space-y-3">
                    {/* Type and Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${feedbackTypeLabels[feedback.type]?.color || feedbackTypeLabels.OTHER.color}`}>
                        {feedbackTypeLabels[feedback.type]?.icon || feedbackTypeLabels.OTHER.icon}
                        {feedbackTypeLabels[feedback.type]?.label || 'Altro'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusLabels[feedback.status]?.color || statusLabels.PENDING.color}`}>
                        {statusLabels[feedback.status]?.label || 'In attesa'}
                      </span>
                      <span className={`text-xs ${colors.text.muted}`}>
                        {new Date(feedback.createdAt).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Question Preview */}
                    <div className={`p-3 rounded-lg ${colors.background.secondary}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${colors.text.primary} line-clamp-2`}>
                          {feedback.question.text}
                        </p>
                        <Link
                          href={`/admin/domande/${feedback.question.id}`}
                          className={`shrink-0 p-1.5 rounded-lg ${colors.background.tertiary} hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
                          title="Vai alla domanda"
                        >
                          <ExternalLink className={`w-4 h-4 ${colors.text.muted}`} />
                        </Link>
                      </div>
                    </div>

                    {/* Student Message */}
                    <div>
                      <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>
                        Segnalazione da {feedback.student?.user?.name || 'Studente'}:
                      </p>
                      <p className={`text-sm ${colors.text.secondary}`}>{feedback.message}</p>
                    </div>

                    {/* Admin Response (if exists) */}
                    {feedback.adminResponse && (
                      <div className={`p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
                        <p className={`text-xs font-medium text-blue-700 dark:text-blue-300 mb-1`}>
                          Risposta admin:
                        </p>
                        <p className={`text-sm text-blue-600 dark:text-blue-400`}>{feedback.adminResponse}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {feedback.status === 'PENDING' && (
                    <div className="flex flex-col gap-2 lg:w-48">
                      {selectedFeedback === feedback.id ? (
                        <>
                          <textarea
                            value={adminResponse}
                            onChange={(e) => setAdminResponse(e.target.value)}
                            placeholder="Risposta (opzionale)..."
                            rows={2}
                            className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm resize-none focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b]`}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateFeedback(feedback.id, 'FIXED')}
                              disabled={updateMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
                            >
                              <ButtonLoader loading={updateMutation.isPending}>
                                <Check className="w-4 h-4" />
                                Corretto
                              </ButtonLoader>
                            </button>
                            <button
                              onClick={() => handleUpdateFeedback(feedback.id, 'REJECTED')}
                              disabled={updateMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
                            >
                              <ButtonLoader loading={updateMutation.isPending}>
                                <X className="w-4 h-4" />
                                Rifiuta
                              </ButtonLoader>
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFeedback(null);
                              setAdminResponse('');
                            }}
                            className={`text-sm ${colors.text.muted} hover:underline`}
                          >
                            Annulla
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/admin/domande/${feedback.question.id}/modifica`}
                            className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg ${colors.background.secondary} ${colors.text.primary} text-sm hover:${colors.background.tertiary} transition-colors`}
                          >
                            <Eye className="w-4 h-4" />
                            Modifica domanda
                          </Link>
                          <button
                            onClick={() => setSelectedFeedback(feedback.id)}
                            className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg ${colors.primary.bg} text-white text-sm hover:opacity-90 transition-opacity`}
                          >
                            Rispondi
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className={`px-4 py-3 border-t ${colors.border.primary} flex items-center justify-between`}>
            <p className={`text-sm ${colors.text.muted}`}>
              Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} segnalazioni)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={`p-2 rounded-lg border ${colors.border.primary} ${
                  page === 1 ? 'opacity-50 cursor-not-allowed' : `hover:${colors.background.secondary}`
                } transition-colors`}
              >
                <ChevronLeft className={`w-5 h-5 ${colors.text.muted}`} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className={`p-2 rounded-lg border ${colors.border.primary} ${
                  page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : `hover:${colors.background.secondary}`
                } transition-colors`}
              >
                <ChevronRight className={`w-5 h-5 ${colors.text.muted}`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
