'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { stripHtml } from '@/lib/utils/sanitizeHtml';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { downloadSimulationPdf } from '@/lib/utils/simulationPdfGenerator';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Archive,
  Send,
  Target,
  Award,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileDown,
  Printer,
} from 'lucide-react';
import type { SimulationType, SimulationStatus } from '@/lib/validations/simulationValidation';

// Type labels
const typeLabels: Record<SimulationType, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

// Status labels
const statusLabels: Record<SimulationStatus, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicata',
  ARCHIVED: 'Archiviata',
};

// Status colors
const statusColors: Record<SimulationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ARCHIVED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

interface StaffSimulationDetailContentProps {
  id: string;
  role: 'ADMIN' | 'COLLABORATOR';
}

export default function StaffSimulationDetailContent({ id, role }: StaffSimulationDetailContentProps) {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const isAdmin = role === 'ADMIN';

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState<{ resultsCount: number } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  // Fetch simulation
  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery({ id });

  // Mutations
  const deleteMutation = trpc.simulations.delete.useMutation({
    onSuccess: () => {
      showSuccess('Eliminata', 'Simulazione eliminata con successo');
      router.push('/simulazioni');
    },
    onError: (error) => {
      // Check if error is about having results - offer force delete
      if (error.message.includes('risultati salvati') || error.message.includes('Usa l\'eliminazione forzata')) {
        // Extract results count from message if possible
        const match = error.message.match(/ha (\d+) risultati/);
        const resultsCount = match ? parseInt(match[1], 10) : 0;
        
        // Close normal delete dialog and show force delete dialog
        setDeleteConfirm(false);
        setForceDeleteConfirm({ resultsCount });
      } else {
        handleMutationError(error);
      }
    },
  });

  const publishMutation = trpc.simulations.publish.useMutation({
    onSuccess: () => {
      showSuccess('Pubblicata', 'Simulazione pubblicata con successo');
      utils.simulations.getSimulation.invalidate({ id });
    },
    onError: handleMutationError,
  });

  const archiveMutation = trpc.simulations.archive.useMutation({
    onSuccess: () => {
      showSuccess('Archiviata', 'Simulazione archiviata con successo');
      utils.simulations.getSimulation.invalidate({ id });
      setArchiveConfirm(false);
    },
    onError: handleMutationError,
  });

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'Illimitato';
    if (minutes < 60) return `${minutes} minuti`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} ore`;
  };

  // Download PDF handler
  const handleDownloadPdf = () => {
    if (!simulation) return;
    
    const pdfData = {
      title: simulation.title,
      description: simulation.description || undefined,
      durationMinutes: simulation.durationMinutes || 0,
      correctPoints: simulation.correctPoints || 1.5,
      wrongPoints: simulation.wrongPoints || -0.4,
      blankPoints: simulation.blankPoints || 0,
      paperInstructions: simulation.paperInstructions || undefined,
      schoolName: 'Leonardo School',
      date: simulation.startDate 
        ? new Date(simulation.startDate).toLocaleDateString('it-IT', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })
        : undefined,
      questions: simulation.questions.map(sq => ({
        id: sq.question.id,
        text: sq.question.text,
        type: sq.question.type,
        difficulty: sq.question.difficulty,
        subject: sq.question.subject,
        topic: sq.question.topic,
        answers: sq.question.answers.map(a => ({
          id: a.id,
          text: a.text,
          isCorrect: a.isCorrect,
          order: a.order,
        })),
      })),
    };
    
    downloadSimulationPdf(pdfData, `${simulation.title.replace(/\s+/g, '_')}.pdf`);
    showSuccess('PDF Scaricato', 'Il PDF della simulazione è stato scaricato');
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!simulation) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={`text-center py-12 ${colors.background.card} rounded-xl`}>
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className={colors.text.muted}>Simulazione non trovata</p>
          <Link
            href="/simulazioni"
            className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alle simulazioni
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/simulazioni"
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Torna alle simulazioni</span>
          <span className="sm:hidden">Indietro</span>
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              {simulation.isOfficial && (
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                  <Award className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className={`text-xl sm:text-2xl font-bold ${colors.text.primary} break-words`}>{simulation.title}</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[simulation.status as SimulationStatus]}`}>
                    {statusLabels[simulation.status as SimulationStatus]}
                  </span>
                  <span className={`text-xs sm:text-sm ${colors.text.muted}`}>
                    {typeLabels[simulation.type as SimulationType]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
            {simulation.status === 'DRAFT' && (
              <button
                onClick={() => publishMutation.mutate({ id })}
                disabled={publishMutation.isPending}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50`}
              >
                {publishMutation.isPending ? <Spinner size="sm" variant="white" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Pubblica</span>
              </button>
            )}
            <Link
              href={`/simulazioni/${id}/modifica`}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border ${colors.border.light} ${colors.text.secondary} ${colors.background.hover}`}
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Modifica</span>
            </Link>
            {/* Show statistics only if there are results */}
            {simulation.results.filter(r => r.completedAt !== null).length > 0 && (
              <Link
                href={`/simulazioni/${id}/statistiche`}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-sm`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden lg:inline">Statistiche</span>
              </Link>
            )}
            <Link
              href={`/simulazioni/${id}/stampa`}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
              title="Versione stampabile con formule LaTeX"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden xl:inline">Stampa</span>
            </Link>
            <button
              onClick={handleDownloadPdf}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border border-purple-300 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20`}
              title="PDF semplice (senza formule LaTeX grafiche)"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden xl:inline">PDF</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setArchiveConfirm(true)}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20`}
              >
                <Archive className="w-4 h-4" />
                <span className="hidden xl:inline">Archivia</span>
              </button>
            )}
            <button
              onClick={() => setDeleteConfirm(true)}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden xl:inline">Elimina</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main content - Wider on desktop */}
        <div className="xl:col-span-3 space-y-6">
          {/* Description */}
          {simulation.description && (
            <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} mb-3`}>Descrizione</h2>
              <p className={colors.text.secondary}>{simulation.description}</p>
            </div>
          )}

          {/* Questions */}
          <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
            <div className={`px-4 sm:px-6 py-4 border-b ${colors.border.light} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                Domande ({simulation.questions.length})
              </h2>
              <Link
                href={`/simulazioni/${id}/domande`}
                className={`text-sm ${colors.primary.text} hover:underline self-start sm:self-auto`}
              >
                Modifica domande
              </Link>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              {simulation.questions.map((sq, index) => (
                <div
                  key={sq.id}
                  className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${colors.border.light} last:border-b-0 ${colors.background.hover}`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span className={`w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs sm:text-sm font-medium ${colors.text.primary}`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${colors.text.primary} line-clamp-2 leading-relaxed`}>
                        {stripHtml(sq.question.text)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                        {sq.question.subject && (
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                            style={{ backgroundColor: sq.question.subject.color + '20', color: sq.question.subject.color }}
                          >
                            {sq.question.subject.name}
                          </span>
                        )}
                        {sq.question.topic && (
                          <span className={`text-xs ${colors.text.muted} truncate`}>{sq.question.topic.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results preview - only show if there are completed results */}
          {simulation.results.filter(r => r.completedAt !== null).length > 0 && (
            <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${colors.border.light} flex items-center justify-between`}>
                <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                  Ultimi risultati ({simulation.results.filter(r => r.completedAt !== null).length})
                </h2>
                <Link
                  href={`/simulazioni/${id}/statistiche`}
                  className={`text-sm ${colors.primary.text} hover:underline`}
                >
                  Vedi tutti
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={colors.background.secondary}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}>Studente</th>
                      <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Punteggio</th>
                      <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Risposte</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}>Data</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${colors.border.light}`}>
                    {simulation.results.filter(r => r.completedAt !== null).slice(0, 10).map((result) => (
                      <tr key={result.id} className={colors.background.hover}>
                        <td className={`px-4 py-3 ${colors.text.primary}`}>
                          {result.student?.user?.name || 'Studente'}
                        </td>
                        <td className={`px-4 py-3 text-center font-medium ${colors.text.primary}`}>
                          {result.totalScore?.toFixed(1) ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="text-green-600">{result.correctAnswers ?? 0}</span>
                            <span className={colors.text.muted}>/</span>
                            <span className="text-red-600">{result.wrongAnswers ?? 0}</span>
                            <span className={colors.text.muted}>/</span>
                            <span className="text-gray-500">{result.blankAnswers ?? 0}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${colors.text.muted}`}>
                          {result.completedAt ? formatDate(result.completedAt) : 'In corso'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Statistiche</h2>
            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className={`flex items-center gap-2 ${colors.text.muted}`}>
                  <Target className="w-4 h-4" />
                  Domande
                </dt>
                <dd className={`font-semibold ${colors.text.primary}`}>{simulation.totalQuestions}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={`flex items-center gap-2 ${colors.text.muted}`}>
                  <Clock className="w-4 h-4" />
                  Durata
                </dt>
                <dd className={`font-semibold ${colors.text.primary}`}>{formatDuration(simulation.durationMinutes)}</dd>
              </div>
            </dl>
          </div>

          {/* Configuration */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Configurazione</h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Mostra risultati</dt>
                <dd>{simulation.showResults ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Mostra risposte</dt>
                <dd>{simulation.showCorrectAnswers ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Ripetibile</dt>
                <dd>{simulation.isRepeatable ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Ordine casuale</dt>
                <dd>{simulation.randomizeOrder ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Sistema anticheat</dt>
                <dd>
                  {simulation.enableAntiCheat ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Scoring */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Punteggi</h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Corretta</dt>
                <dd className="font-medium text-green-600">+{simulation.correctPoints}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Errata</dt>
                <dd className="font-medium text-red-600">{simulation.wrongPoints}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Non data</dt>
                <dd className={`font-medium ${colors.text.primary}`}>{simulation.blankPoints}</dd>
              </div>
              {simulation.passingScore && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <dt className={colors.text.muted}>Soglia superamento</dt>
                  <dd className={`font-medium ${colors.text.primary}`}>{simulation.passingScore}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Dates */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Date</h2>
            <dl className="space-y-3">
              <div>
                <dt className={`text-xs ${colors.text.muted} uppercase`}>Creata il</dt>
                <dd className={`font-medium ${colors.text.primary}`}>{formatDate(simulation.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Assignments */}
          {simulation.assignments.length > 0 && (
            <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>
                Assegnazioni ({simulation.assignments.length})
              </h2>
              {/* Group assignments by type */}
              {(() => {
                const groupAssignments = simulation.assignments.filter(a => a.group);

                return (
                  <div className="space-y-4">
                    {/* Groups */}
                    {groupAssignments.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-medium ${colors.text.muted} uppercase mb-2`}>
                          Gruppi ({groupAssignments.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {groupAssignments.map((a) => (
                            <span
                              key={a.id}
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: (a.group?.color || '#6B7280') + '20',
                                color: a.group?.color || '#6B7280',
                              }}
                            >
                              {a.group?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Elimina Simulazione"
          message={`Sei sicuro di voler eliminare "${simulation.title}"? Questa azione non può essere annullata.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id })}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}

      {/* Force Delete Confirmation Modal - shown when simulation has results */}
      {forceDeleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="⚠️ Eliminazione Forzata"
          message={`ATTENZIONE: Stai per eliminare definitivamente "${simulation.title}".\n\n🗑️ Verranno eliminati:\n• ${forceDeleteConfirm.resultsCount} risultati degli studenti\n• Tutte le statistiche e analisi\n• Tutte le assegnazioni e sessioni\n• Gli eventi calendario correlati\n\n❌ Questa operazione è IRREVERSIBILE.\n\nSei assolutamente sicuro di voler procedere?`}
          confirmText="Elimina Definitivamente"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id, force: true })}
          onCancel={() => setForceDeleteConfirm(null)}
        />
      )}

      {/* Archive Confirmation Modal */}
      {archiveConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Archivia Simulazione"
          message={`Sei sicuro di voler archiviare "${simulation.title}"? La simulazione non sarà più accessibile agli studenti.`}
          confirmText="Archivia"
          cancelText="Annulla"
          variant="warning"
          isLoading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate({ id })}
          onCancel={() => setArchiveConfirm(false)}
        />
      )}
    </div>
  );
}
