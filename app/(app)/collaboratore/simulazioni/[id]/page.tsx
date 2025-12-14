'use client';

import { use } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { downloadSimulationPdf } from '@/lib/utils/simulationPdfGenerator';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Send,
  Target,
  Users,
  Award,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileDown,
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
  CLOSED: 'Chiusa',
  ARCHIVED: 'Archiviata',
};

// Status colors
const statusColors: Record<SimulationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ARCHIVED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export default function CollaboratorSimulationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Fetch simulation
  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery({ id });

  // Mutations
  const deleteMutation = trpc.simulations.delete.useMutation({
    onSuccess: () => {
      showSuccess('Eliminata', 'Simulazione eliminata con successo');
      router.push('/collaboratore/simulazioni');
    },
    onError: handleMutationError,
  });

  const publishMutation = trpc.simulations.publish.useMutation({
    onSuccess: () => {
      showSuccess('Pubblicata', 'Simulazione pubblicata con successo');
      utils.simulations.getSimulation.invalidate({ id });
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
            href="/collaboratore/simulazioni"
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
      <div className="mb-8">
        <Link
          href="/collaboratore/simulazioni"
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle simulazioni
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
                {simulation.title}
              </h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[simulation.status as SimulationStatus]}`}>
                {statusLabels[simulation.status as SimulationStatus]}
              </span>
              {simulation.isOfficial && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  <Award className="w-3 h-3" />
                  Ufficiale
                </span>
              )}
            </div>
            <p className={colors.text.muted}>
              {typeLabels[simulation.type as SimulationType]} • Creata {formatDate(simulation.createdAt)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {simulation.status === 'DRAFT' && (
              <button
                onClick={() => publishMutation.mutate({ id })}
                disabled={publishMutation.isPending}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white`}
              >
                {publishMutation.isPending ? <Spinner size="sm" variant="white" /> : <Send className="w-4 h-4" />}
                Pubblica
              </button>
            )}
            <Link
              href={`/collaboratore/simulazioni/${id}/modifica`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} ${colors.background.hover}`}
            >
              <Edit2 className="w-4 h-4" />
              Modifica
            </Link>
            <Link
              href={`/collaboratore/simulazioni/${id}/statistiche`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} ${colors.background.hover}`}
            >
              <BarChart3 className="w-4 h-4" />
              Statistiche
            </Link>
            {simulation.isPaperBased && (
              <Link
                href={`/collaboratore/simulazioni/${id}/risultati-cartacei`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
              >
                <Edit2 className="w-4 h-4" />
                Inserisci Risultati
              </Link>
            )}
            <button
              onClick={handleDownloadPdf}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-300 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20`}
            >
              <FileDown className="w-4 h-4" />
              Scarica PDF
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}
            >
              <Trash2 className="w-4 h-4" />
              Elimina
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {simulation.description && (
            <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} mb-3`}>Descrizione</h2>
              <p className={colors.text.secondary}>{simulation.description}</p>
            </div>
          )}

          {/* Questions preview */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                Domande ({simulation.questions.length})
              </h2>
              <Link
                href={`/collaboratore/simulazioni/${id}/domande`}
                className={`text-sm ${colors.primary.text} hover:underline`}
              >
                Vedi tutte
              </Link>
            </div>
            
            <div className="space-y-3">
              {simulation.questions.slice(0, 5).map((sq, index) => (
                <div key={sq.question.id} className={`p-3 rounded-lg ${colors.background.secondary}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${colors.background.card} ${colors.text.muted}`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${colors.text.primary} line-clamp-2`}>
                        {sq.question.text.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {sq.question.subject && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.background.card} ${colors.text.muted}`}>
                            {sq.question.subject.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {simulation.questions.length > 5 && (
                <p className={`text-center text-sm ${colors.text.muted}`}>
                  e altre {simulation.questions.length - 5} domande...
                </p>
              )}
            </div>
          </div>

          {/* Recent results */}
          {simulation.results.length > 0 && (
            <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>
                Risultati Recenti
              </h2>
              <div className="space-y-2">
                {simulation.results.slice(0, 5).map((result) => {
                  const isPassed = simulation.passingScore 
                    ? (result.totalScore ?? 0) >= simulation.passingScore 
                    : (result.percentageScore ?? 0) >= 60;
                  return (
                    <div key={result.id} className={`flex items-center justify-between p-3 rounded-lg ${colors.background.secondary}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {isPassed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`font-medium ${colors.text.primary}`}>
                            {result.student?.user?.name || 'Studente'}
                          </p>
                          <p className={`text-xs ${colors.text.muted}`}>
                            {formatDate(result.completedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                          {(result.totalScore ?? 0).toFixed(1)} / {simulation.maxScore?.toFixed(1) || simulation.totalQuestions}
                        </p>
                        <p className={`text-xs ${colors.text.muted}`}>
                          {(result.percentageScore ?? 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info card */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Dettagli</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Target className={`w-5 h-5 ${colors.text.muted}`} />
                <div>
                  <p className={`text-sm ${colors.text.muted}`}>Domande</p>
                  <p className={`font-medium ${colors.text.primary}`}>{simulation.totalQuestions}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${colors.text.muted}`} />
                <div>
                  <p className={`text-sm ${colors.text.muted}`}>Durata</p>
                  <p className={`font-medium ${colors.text.primary}`}>{formatDuration(simulation.durationMinutes || 0)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${colors.text.muted}`} />
                <div>
                  <p className={`text-sm ${colors.text.muted}`}>Assegnazioni</p>
                  <p className={`font-medium ${colors.text.primary}`}>{simulation.assignments.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Award className={`w-5 h-5 ${colors.text.muted}`} />
                <div>
                  <p className={`text-sm ${colors.text.muted}`}>Punteggi</p>
                  <p className={`font-medium ${colors.text.primary}`}>
                    +{simulation.correctPoints} / {simulation.wrongPoints} / {simulation.blankPoints}
                  </p>
                </div>
              </div>

              {simulation.startDate && (
                <div>
                  <p className={`text-sm ${colors.text.muted}`}>Data Inizio</p>
                  <p className={`font-medium ${colors.text.primary}`}>{formatDate(simulation.startDate)}</p>
                </div>
              )}

              {simulation.endDate && (
                <div>
                  <p className={`text-sm ${colors.text.muted}`}>Data Fine</p>
                  <p className={`font-medium ${colors.text.primary}`}>{formatDate(simulation.endDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Statistiche</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={colors.text.muted}>Completamenti</span>
                <span className={`font-medium ${colors.text.primary}`}>
                  {simulation.results.filter(r => r.completedAt).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={colors.text.muted}>Superati</span>
                <span className="font-medium text-green-600">
                  {simulation.results.filter(r => {
                    if (!r.completedAt) return false;
                    return simulation.passingScore 
                      ? (r.totalScore ?? 0) >= simulation.passingScore 
                      : (r.percentageScore ?? 0) >= 60;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={colors.text.muted}>Non Superati</span>
                <span className="font-medium text-red-600">
                  {simulation.results.filter(r => {
                    if (!r.completedAt) return false;
                    const isPassed = simulation.passingScore 
                      ? (r.totalScore ?? 0) >= simulation.passingScore 
                      : (r.percentageScore ?? 0) >= 60;
                    return !isPassed;
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate({ id })}
        title="Elimina Simulazione"
        message={`Sei sicuro di voler eliminare "${simulation.title}"? Questa azione è irreversibile.`}
        confirmText="Elimina"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
