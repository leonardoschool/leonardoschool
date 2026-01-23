'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { stripHtml } from '@/lib/utils/sanitizeHtml';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import { useAuth } from '@/lib/hooks/useAuth';
import { isStaff } from '@/lib/permissions';
import {
  ArrowLeft,
  Search,
  Plus,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Target,
  Save,
  AlertTriangle,
  ShieldX,
} from 'lucide-react';

interface SelectedQuestion {
  questionId: string;
  order: number;
  customPoints?: number | null;
  customNegativePoints?: number | null;
  question?: {
    id: string;
    text: string;
    type: string;
    difficulty: string;
    subject?: { name: string; color: string } | null;
    topic?: { name: string } | null;
  };
}

export default function ManageQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Check authorization
  const userRole = user?.role;
  const hasAccess = userRole && isStaff(userRole);

  // State
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch simulation
  const { data: simulation, isLoading: simulationLoading } = trpc.simulations.getSimulation.useQuery(
    { id },
    { enabled: hasAccess }
  );

  // Initialize selected questions when simulation loads
  useEffect(() => {
    if (simulation && !initialized) {
      setSelectedQuestions(
        simulation.questions.map((sq, index) => ({
          questionId: sq.question.id,
          order: sq.order ?? index,
          customPoints: sq.customPoints,
          customNegativePoints: sq.customNegativePoints,
          question: {
            id: sq.question.id,
            text: sq.question.text,
            type: sq.question.type,
            difficulty: sq.question.difficulty,
            subject: sq.question.subject,
            topic: sq.question.topic,
          },
        }))
      );
      setInitialized(true);
    }
  }, [simulation, initialized]);

  // Fetch subjects for filter
  const { data: subjectsData } = trpc.questions.getSubjects.useQuery();

  // Fetch available questions
  const { data: questionsData, isLoading: questionsLoading } = trpc.questions.getQuestions.useQuery({
    page: 1,
    pageSize: 50,
    search: questionSearchTerm || undefined,
    subjectId: questionSubjectFilter || undefined,
    difficulty:
      (questionDifficultyFilter as 'EASY' | 'MEDIUM' | 'HARD' | undefined) || undefined,
    status: 'PUBLISHED',
  });

  // Update questions mutation
  const updateQuestionsMutation = trpc.simulations.updateQuestions.useMutation({
    onSuccess: () => {
      showSuccess('Domande aggiornate', 'Le domande della simulazione sono state salvate.');
      setHasChanges(false);
      utils.simulations.getSimulation.invalidate({ id });
    },
    onError: handleMutationError,
  });

  // Add question
  const addQuestion = (question: NonNullable<typeof questionsData>['questions'][0]) => {
    if (selectedQuestions.some((q) => q.questionId === question.id)) return;

    setSelectedQuestions((prev) => [
      ...prev,
      {
        questionId: question.id,
        order: prev.length,
        question: {
          id: question.id,
          text: question.text,
          type: question.type,
          difficulty: question.difficulty,
          subject: question.subject,
          topic: question.topic,
        },
      },
    ]);
    setHasChanges(true);
  };

  // Remove question
  const removeQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.filter((q) => q.questionId !== questionId).map((q, i) => ({ ...q, order: i }))
    );
    setHasChanges(true);
  };

  // Move question
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...selectedQuestions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    newQuestions.forEach((q, i) => (q.order = i));
    setSelectedQuestions(newQuestions);
    setHasChanges(true);
  };

  // Save changes
  const handleSave = () => {
    updateQuestionsMutation.mutate({
      simulationId: id,
      mode: 'replace',
      questions: selectedQuestions.map((q) => ({
        questionId: q.questionId,
        order: q.order,
        customPoints: q.customPoints,
        customNegativePoints: q.customNegativePoints,
      })),
    });
  };

  // Check if simulation can be edited
  const canEdit = simulation && simulation.status !== 'ARCHIVED';

  // Authorization check
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldX className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>Accesso negato</h2>
          <p className={colors.text.muted}>Non hai i permessi per gestire le domande.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className={`mt-4 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white`}
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    );
  }

  if (simulationLoading) {
    return <PageLoader />;
  }

  if (!simulation) {
    return (
      <div className="p-6">
        <div className={`text-center py-12 ${colors.text.muted}`}>Simulazione non trovata</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/simulazioni/${id}`}
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla simulazione
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Gestione Domande</h1>
              <p className={colors.text.muted}>{simulation.title}</p>
            </div>
          </div>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateQuestionsMutation.isPending}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                hasChanges
                  ? `${colors.primary.gradient} text-white hover:opacity-90`
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {updateQuestionsMutation.isPending ? (
                <Spinner size="sm" variant="white" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salva modifiche
            </button>
          )}
        </div>
      </div>

      {/* Warning if not editable */}
      {!canEdit && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-700 dark:text-amber-300">
            Questa simulazione è archiviata e non può essere modificata.
          </p>
        </div>
      )}

      {/* Questions grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-280px)]">
        {/* Available questions */}
        <div className={`rounded-xl border ${colors.border.light} overflow-hidden flex flex-col`}>
          <div className={`p-4 ${colors.background.secondary} border-b ${colors.border.light} flex-shrink-0`}>
            <h3 className={`font-medium ${colors.text.primary} mb-3`}>Domande disponibili</h3>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={questionSearchTerm}
                  onChange={(e) => setQuestionSearchTerm(e.target.value)}
                  placeholder="Cerca domande..."
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary} text-sm`}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomSelect
                    value={questionSubjectFilter}
                    onChange={setQuestionSubjectFilter}
                    options={[
                      { value: '', label: 'Tutte le materie' },
                      ...(subjectsData?.map((s) => ({ value: s.id, label: s.name })) || []),
                    ]}
                    placeholder="Tutte le materie"
                  />
                </div>
                <div className="flex-1">
                  <CustomSelect
                    value={questionDifficultyFilter}
                    onChange={setQuestionDifficultyFilter}
                    options={[
                      { value: '', label: 'Tutte le difficoltà' },
                      { value: 'EASY', label: 'Facile' },
                      { value: 'MEDIUM', label: 'Media' },
                      { value: 'HARD', label: 'Difficile' },
                    ]}
                    placeholder="Tutte le difficoltà"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {questionsLoading ? (
              <div className="p-8 text-center">
                <Spinner size="md" />
              </div>
            ) : questionsData?.questions.length === 0 ? (
              <div className="p-8 text-center">
                <p className={colors.text.muted}>Nessuna domanda trovata</p>
              </div>
            ) : (
              <div className={`divide-y ${colors.border.light}`}>
                {questionsData?.questions.map((question) => {
                  const isSelected = selectedQuestions.some((q) => q.questionId === question.id);
                  return (
                    <div
                      key={question.id}
                      className={`p-3 flex items-start gap-3 ${isSelected ? 'bg-green-50 dark:bg-green-900/20' : colors.background.hover}`}
                    >
                      <button
                        onClick={() =>
                          isSelected ? removeQuestion(question.id) : addQuestion(question)
                        }
                        disabled={!canEdit}
                        className={`mt-1 p-1 rounded transition-colors ${
                          isSelected
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                        } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${colors.text.primary} line-clamp-2`}>
                          {stripHtml(question.text)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {question.subject && (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: question.subject.color + '20',
                                color: question.subject.color,
                              }}
                            >
                              {question.subject.name}
                            </span>
                          )}
                          <span className={`text-xs ${colors.text.muted}`}>
                            {question.difficulty === 'EASY'
                              ? 'Facile'
                              : question.difficulty === 'MEDIUM'
                                ? 'Media'
                                : 'Difficile'}
                          </span>
                          {question.topic && (
                            <span className={`text-xs ${colors.text.muted}`}>
                              • {question.topic.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected questions */}
        <div className={`rounded-xl border ${colors.border.light} overflow-hidden flex flex-col`}>
          <div className={`p-4 ${colors.background.secondary} border-b ${colors.border.light} flex-shrink-0`}>
            <h3 className={`font-medium ${colors.text.primary}`}>
              Domande nella simulazione ({selectedQuestions.length})
            </h3>
            {hasChanges && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Hai modifiche non salvate
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedQuestions.length === 0 ? (
              <div className="p-8 text-center">
                <Target className={`w-12 h-12 mx-auto mb-2 ${colors.text.muted} opacity-50`} />
                <p className={colors.text.muted}>Nessuna domanda nella simulazione</p>
                <p className={`text-sm ${colors.text.muted}`}>
                  Aggiungi domande dalla lista a sinistra
                </p>
              </div>
            ) : (
              <div className={`divide-y ${colors.border.light}`}>
                {selectedQuestions.map((sq, index) => (
                  <div
                    key={sq.questionId}
                    className={`p-3 flex items-start gap-3 ${colors.background.card}`}
                  >
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveQuestion(index, 'down')}
                          disabled={index === selectedQuestions.length - 1}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <span
                      className={`mt-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ${colors.text.primary}`}
                    >
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${colors.text.primary} line-clamp-2`}>
                        {stripHtml(sq.question?.text) || 'Domanda'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {sq.question?.subject && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: sq.question.subject.color + '20',
                              color: sq.question.subject.color,
                            }}
                          >
                            {sq.question.subject.name}
                          </span>
                        )}
                        {sq.question?.difficulty && (
                          <span className={`text-xs ${colors.text.muted}`}>
                            {sq.question.difficulty === 'EASY'
                              ? 'Facile'
                              : sq.question.difficulty === 'MEDIUM'
                                ? 'Media'
                                : 'Difficile'}
                          </span>
                        )}
                        {sq.question?.topic && (
                          <span className={`text-xs ${colors.text.muted}`}>
                            • {sq.question.topic.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => removeQuestion(sq.questionId)}
                        className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
