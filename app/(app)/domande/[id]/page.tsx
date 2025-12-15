'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Copy,
  Archive,
  Send,
  XCircle,
  Clock,
  Star,
  Tag,
  BookOpen,
  AlertCircle,
  MoreHorizontal,
  FileText,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import {
  questionTypeLabels,
  questionStatusLabels,
  difficultyLabels,
  openValidationTypeLabels,
} from '@/lib/validations/questionValidation';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function DettaglioDomandaPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const { data: question, isLoading, error } = trpc.questions.getQuestion.useQuery(
    { id: questionId },
    { enabled: !!questionId }
  );

  const deleteMutation = trpc.questions.deleteQuestion.useMutation({
    onSuccess: () => {
      showSuccess('Domanda eliminata', 'La domanda è stata eliminata definitivamente.');
      router.push('/domande');
    },
    onError: handleMutationError,
  });

  const archiveMutation = trpc.questions.archiveQuestion.useMutation({
    onSuccess: () => {
      showSuccess('Domanda archiviata', 'La domanda è stata archiviata.');
      utils.questions.getQuestion.invalidate({ id: questionId });
    },
    onError: handleMutationError,
  });

  const publishMutation = trpc.questions.publishQuestion.useMutation({
    onSuccess: () => {
      showSuccess('Domanda pubblicata', 'La domanda è ora visibile agli studenti.');
      utils.questions.getQuestion.invalidate({ id: questionId });
    },
    onError: handleMutationError,
  });

  const duplicateMutation = trpc.questions.duplicateQuestion.useMutation({
    onSuccess: (data) => {
      showSuccess('Domanda duplicata', 'È stata creata una copia della domanda.');
      if (data) {
        router.push(`/domande/${data.id}/modifica`);
      }
    },
    onError: handleMutationError,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !question) {
    return (
      <div className="p-6 sm:p-8 lg:p-10">
        <div className={`${colors.background.card} rounded-xl p-8 text-center`}>
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${colors.status.error.text}`} />
          <h2 className={`text-xl font-bold ${colors.text.primary} mb-2`}>
            Domanda non trovata
          </h2>
          <p className={`${colors.text.muted} mb-4`}>
            La domanda richiesta non esiste o è stata eliminata.
          </p>
          <Link
            href="/domande"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white`}
          >
            Torna alle domande
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'ARCHIVED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'EASY':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'HARD':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href="/domande"
            className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
          >
            <ArrowLeft className={`w-5 h-5 ${colors.text.secondary}`} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(question.status)}`}>
                {questionStatusLabels[question.status as keyof typeof questionStatusLabels]}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(question.difficulty)}`}>
                {difficultyLabels[question.difficulty as keyof typeof difficultyLabels]}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.background.tertiary} ${colors.text.secondary}`}>
                {questionTypeLabels[question.type as keyof typeof questionTypeLabels]}
              </span>
            </div>
            <h1 className={`text-xl font-bold ${colors.text.primary}`}>
              {question.text.length > 100 ? `${question.text.slice(0, 100)}...` : question.text}
            </h1>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2">
            <Link
              href={`/domande/${questionId}/modifica`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity`}
            >
              <Edit2 className="w-4 h-4" />
              Modifica
            </Link>
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
            >
              <MoreHorizontal className={`w-5 h-5 ${colors.text.secondary}`} />
            </button>
          </div>

          {showActionsMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
              <div className={`absolute right-0 mt-2 w-48 rounded-lg ${colors.background.card} ${colors.effects.shadow.lg} border ${colors.border.primary} z-20`}>
                <div className="py-1">
                  <button
                    onClick={() => {
                      duplicateMutation.mutate({ id: questionId });
                      setShowActionsMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:${colors.background.secondary}`}
                  >
                    <Copy className="w-4 h-4" />
                    Duplica
                  </button>
                  {question.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => {
                        publishMutation.mutate({ id: questionId });
                        setShowActionsMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:${colors.background.secondary}`}
                    >
                      <Send className="w-4 h-4" />
                      Pubblica
                    </button>
                  )}
                  {question.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => {
                        archiveMutation.mutate({ id: questionId });
                        setShowActionsMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:${colors.background.secondary}`}
                    >
                      <Archive className="w-4 h-4" />
                      Archivia
                    </button>
                  )}
                  <hr className={`my-1 ${colors.border.primary}`} />
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowActionsMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Elimina
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Text */}
          <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
            <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Testo della domanda</h3>
            <p className={`${colors.text.primary} whitespace-pre-wrap`}>{question.text}</p>
            {question.description && (
              <div className={`mt-4 p-4 rounded-lg ${colors.background.secondary}`}>
                <p className={`text-sm ${colors.text.muted}`}>{question.description}</p>
              </div>
            )}
            {question.imageUrl && (
              <div className="mt-4 relative">
                <Image
                  src={question.imageUrl}
                  alt="Immagine domanda"
                  width={800}
                  height={600}
                  className="max-w-full h-auto rounded-lg object-contain"
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* Answers (for choice types) */}
          {question.type !== 'OPEN_TEXT' && question.answers && question.answers.length > 0 && (
            <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
              <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Risposte</h3>
              <div className="space-y-3">
                {question.answers.map((answer, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      answer.isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : `${colors.border.primary} ${colors.background.secondary}`
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        answer.isCorrect
                          ? 'bg-green-500 text-white'
                          : `${colors.background.tertiary} ${colors.text.secondary}`
                      }`}
                    >
                      {answer.label}
                    </span>
                    <div className="flex-1">
                      <p className={`${colors.text.primary}`}>{answer.text}</p>
                      {answer.explanation && (
                        <p className={`text-sm ${colors.text.muted} mt-2`}>
                          💡 {answer.explanation}
                        </p>
                      )}
                    </div>
                    {answer.isCorrect && (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords (for open text) */}
          {question.type === 'OPEN_TEXT' && question.keywords && question.keywords.length > 0 && (
            <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
              <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Keywords di validazione</h3>
              <p className={`text-sm ${colors.text.muted} mb-4`}>
                Tipo di validazione: {openValidationTypeLabels[question.openValidationType as keyof typeof openValidationTypeLabels] || 'Manuale'}
              </p>
              <div className="flex flex-wrap gap-2">
                {question.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
                      keyword.isRequired
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : `${colors.background.tertiary} ${colors.text.secondary}`
                    }`}
                  >
                    {keyword.keyword}
                    <span className={`text-xs ${colors.text.muted}`}>
                      ({keyword.weight})
                    </span>
                    {keyword.isRequired && <Star className="w-3 h-3" />}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Explanations */}
          {(question.correctExplanation || question.wrongExplanation || question.generalExplanation) && (
            <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
              <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Spiegazioni</h3>
              <div className="space-y-4">
                {question.correctExplanation && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Risposta corretta
                      </span>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {question.correctExplanation}
                    </p>
                  </div>
                )}
                {question.wrongExplanation && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        Risposta errata
                      </span>
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {question.wrongExplanation}
                    </p>
                  </div>
                )}
                {question.generalExplanation && (
                  <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className={`w-4 h-4 ${colors.text.muted}`} />
                      <span className={`text-sm font-medium ${colors.text.secondary}`}>
                        Spiegazione generale
                      </span>
                    </div>
                    <p className={`text-sm ${colors.text.primary}`}>
                      {question.generalExplanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
            <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Dettagli</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${colors.text.muted}`}>Punti corretti</span>
                <span className={`font-medium text-green-600`}>+{question.points}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${colors.text.muted}`}>Punti errati</span>
                <span className={`font-medium text-red-600`}>{question.negativePoints}</span>
              </div>
              {question.timeLimitSeconds && (
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${colors.text.muted}`}>Tempo limite</span>
                  <span className={`font-medium ${colors.text.primary}`}>
                    {question.timeLimitSeconds}s
                  </span>
                </div>
              )}
              <hr className={colors.border.primary} />
              {question.subject && (
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${colors.text.muted}`}>Materia</span>
                  <span className={`font-medium ${colors.text.primary}`}>
                    {question.subject.name}
                  </span>
                </div>
              )}
              {question.topic && (
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${colors.text.muted}`}>Argomento</span>
                  <span className={`font-medium ${colors.text.primary}`}>
                    {question.topic.name}
                  </span>
                </div>
              )}
              {question.subTopic && (
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${colors.text.muted}`}>Sotto-argomento</span>
                  <span className={`font-medium ${colors.text.primary}`}>
                    {question.subTopic.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {(question.questionTags && question.questionTags.length > 0) && (
            <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
              <h3 className={`font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                <Tag className="w-4 h-4" />
                Tag
              </h3>
              <div className="space-y-3">
                {/* Group tags by category */}
                {(() => {
                  const categorized = new Map<string, { category: { id: string; name: string; color: string } | null; tags: { id: string; name: string; color: string | null }[] }>();
                  const uncategorized: { id: string; name: string; color: string | null }[] = [];
                  
                  question.questionTags.forEach((qt: { tag: { id: string; name: string; color: string | null; category: { id: string; name: string; color: string } | null } }) => {
                    if (qt.tag.category) {
                      const key = qt.tag.category.id;
                      if (!categorized.has(key)) {
                        categorized.set(key, { category: qt.tag.category, tags: [] });
                      }
                      categorized.get(key)!.tags.push(qt.tag);
                    } else {
                      uncategorized.push(qt.tag);
                    }
                  });

                  return (
                    <>
                      {Array.from(categorized.values()).map(({ category, tags }) => (
                        <div key={category!.id}>
                          <p 
                            className="text-xs font-medium mb-1.5"
                            style={{ color: category!.color }}
                          >
                            {category!.name}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${tag.color || category!.color}20`,
                                  color: tag.color || category!.color,
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {uncategorized.length > 0 && (
                        <div>
                          <p className={`text-xs font-medium mb-1.5 ${colors.text.muted}`}>
                            Senza categoria
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {uncategorized.map((tag) => (
                              <span
                                key={tag.id}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors.background.tertiary} ${colors.text.secondary}`}
                                style={tag.color ? {
                                  backgroundColor: `${tag.color}20`,
                                  color: tag.color,
                                } : {}}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
            <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Statistiche</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${colors.text.muted}`}>Usata in simulazioni</span>
                <span className={`font-medium ${colors.text.primary}`}>{question.timesUsed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${colors.text.muted}`}>Risposte totali</span>
                <span className={`font-medium ${colors.text.primary}`}>{question.timesAnswered ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${colors.text.muted}`}>Risposte corrette</span>
                <span className={`font-medium text-green-600`}>{question.timesCorrect ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${colors.text.muted}`}>% Correttezza</span>
                <span className={`font-medium ${colors.text.primary}`}>
                  {(question.timesAnswered ?? 0) > 0
                    ? `${Math.round(((question.timesCorrect ?? 0) / (question.timesAnswered ?? 1)) * 100)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Info */}
          <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
            <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Cronologia</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className={`w-4 h-4 mt-0.5 ${colors.text.muted}`} />
                <div>
                  <p className={colors.text.muted}>Creato</p>
                  <p className={colors.text.primary}>
                    {new Date(question.createdAt).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className={`w-4 h-4 mt-0.5 ${colors.text.muted}`} />
                <div>
                  <p className={colors.text.muted}>Ultima modifica</p>
                  <p className={colors.text.primary}>
                    {new Date(question.updatedAt).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              {question.year && (
                <div className="flex items-start gap-2">
                  <FileText className={`w-4 h-4 mt-0.5 ${colors.text.muted}`} />
                  <div>
                    <p className={colors.text.muted}>Anno esame</p>
                    <p className={colors.text.primary}>{question.year}</p>
                  </div>
                </div>
              )}
              {question.source && (
                <div className="flex items-start gap-2">
                  <BookOpen className={`w-4 h-4 mt-0.5 ${colors.text.muted}`} />
                  <div>
                    <p className={colors.text.muted}>Fonte</p>
                    <p className={colors.text.primary}>{question.source}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate({ id: questionId })}
        title="Elimina domanda"
        message="Sei sicuro di voler eliminare questa domanda? Questa azione non può essere annullata."
        confirmLabel="Elimina"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
