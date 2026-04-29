'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
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
  Eye,
  EyeOff,
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
    subject?: { id?: string; name: string; color: string } | null;
    topic?: { name: string } | null;
    answers?: { id: string; text: string; isCorrect: boolean; order: number }[];
    keywords?: { keyword: string }[];
  };
}

interface ManagedSection {
  id: string;
  name: string;
  durationMinutes: number;
  questionIds: string[];
  questionCount: number;
  subjectId?: string | null;
  order: number;
}

function parseSimulationSections(rawSections: unknown): ManagedSection[] {
  if (!Array.isArray(rawSections)) return [];

  return rawSections.map((rawSection, index) => {
    const section = rawSection as Partial<ManagedSection>;
    const questionIds = Array.isArray(section.questionIds) ? section.questionIds : [];

    return {
      id: section.id || `section-${index}`,
      name: section.name || `Sezione ${index + 1}`,
      durationMinutes: section.durationMinutes || 10,
      questionIds,
      questionCount: questionIds.length,
      subjectId: section.subjectId ?? null,
      order: section.order ?? index,
    };
  }).sort((a, b) => a.order - b.order);
}

function getPreferredSectionId(question: SelectedQuestion, availableSections: ManagedSection[]): string {
  if (availableSections.length === 0) return '';

  const subjectId = question.question?.subject?.id;
  const subjectName = question.question?.subject?.name;
  const matchingBySubjectId = subjectId
    ? availableSections.find(section => section.subjectId === subjectId)
    : undefined;
  const matchingByName = subjectName
    ? availableSections.find(section => section.name.toLowerCase() === subjectName.toLowerCase())
    : undefined;

  return matchingBySubjectId?.id || matchingByName?.id || availableSections[0].id;
}

function moveQuestionToSection(
  availableSections: ManagedSection[],
  questionId: string,
  sectionId: string
): ManagedSection[] {
  return availableSections.map(section => {
    const cleanedQuestionIds = section.questionIds.filter(id => id !== questionId);
    const questionIds = section.id === sectionId
      ? [...cleanedQuestionIds, questionId]
      : cleanedQuestionIds;

    return {
      ...section,
      questionIds,
      questionCount: questionIds.length,
    };
  });
}

function removeQuestionFromSections(
  availableSections: ManagedSection[],
  questionId: string
): ManagedSection[] {
  return availableSections.map(section => {
    const questionIds = section.questionIds.filter(id => id !== questionId);
    return { ...section, questionIds, questionCount: questionIds.length };
  });
}

function normalizeSectionsForQuestions(
  rawSections: ManagedSection[],
  questions: SelectedQuestion[]
): { sections: ManagedSection[]; changed: boolean } {
  if (rawSections.length === 0) return { sections: [], changed: false };

  const validQuestionIds = new Set(questions.map(question => question.questionId));
  let changed = false;
  let normalizedSections = rawSections.map(section => {
    const questionIds = section.questionIds.filter(questionId => validQuestionIds.has(questionId));
    if (questionIds.length !== section.questionIds.length) changed = true;
    return { ...section, questionIds, questionCount: questionIds.length };
  });

  const assignedQuestionIds = new Set(normalizedSections.flatMap(section => section.questionIds));
  for (const question of questions) {
    if (assignedQuestionIds.has(question.questionId)) continue;
    const sectionId = getPreferredSectionId(question, normalizedSections);
    if (!sectionId) continue;
    normalizedSections = moveQuestionToSection(normalizedSections, question.questionId, sectionId);
    assignedQuestionIds.add(question.questionId);
    changed = true;
  }

  return { sections: normalizedSections, changed };
}

const TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: 'Singola',
  MULTIPLE_CHOICE: 'Multipla',
  OPEN_TEXT: 'Aperta',
};

function renderAnswerPreview(
  type: string,
  answers?: { id: string; text: string; isCorrect: boolean; order: number }[],
  keywords?: { keyword: string }[]
) {
  const isChoiceType = type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE';
  if (isChoiceType) {
    const correctAnswers = answers?.filter((a) => a.isCorrect) ?? [];
    if (correctAnswers.length === 0) return null;
    return (
      <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
          {type === 'MULTIPLE_CHOICE' ? 'Risposte corrette:' : 'Risposta corretta:'}
        </p>
        <div className="space-y-0.5">
          {correctAnswers.map((a) => (
            <p key={a.id} className="text-xs text-green-700 dark:text-green-300">{a.text}</p>
          ))}
        </div>
      </div>
    );
  }
  if (!keywords || keywords.length === 0) return null;
  return (
    <div className={`mt-2 p-2 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}>
      <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>Keywords:</p>
      <div className="flex flex-wrap gap-1">
        {keywords.map((kw, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${colors.background.tertiary} ${colors.text.tertiary}`}>
            {kw.keyword}
          </span>
        ))}
      </div>
    </div>
  );
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
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());

  const togglePreview = (questionId: string) => {
    setExpandedPreviews((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('');
  const [sections, setSections] = useState<ManagedSection[]>([]);
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
      const initialQuestions = simulation.questions.map((sq, index) => ({
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
            answers: sq.question.answers as unknown as { id: string; text: string; isCorrect: boolean; order: number }[],
            keywords: sq.question.keywords,
          },
        }));
      const parsedSections = parseSimulationSections(simulation.sections);
      const normalizedSections = normalizeSectionsForQuestions(parsedSections, initialQuestions);

      setSelectedQuestions(initialQuestions);
      setSections(normalizedSections.sections);
      if (simulation.hasSections && normalizedSections.changed) {
        setHasChanges(true);
      }
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
    type: (questionTypeFilter as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT' | undefined) || undefined,
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

    const newQuestion: SelectedQuestion = {
      questionId: question.id,
      order: selectedQuestions.length,
      question: {
        id: question.id,
        text: question.text,
        type: question.type,
        difficulty: question.difficulty,
        subject: question.subject,
        topic: question.topic,
        answers: question.answers as unknown as { id: string; text: string; isCorrect: boolean; order: number }[],
        keywords: question.keywords,
      },
    };

    setSelectedQuestions((prev) => [
      ...prev,
      newQuestion,
    ]);
    const preferredSectionId = getPreferredSectionId(newQuestion, sections);
    if (preferredSectionId) {
      setSections((prev) => moveQuestionToSection(prev, question.id, preferredSectionId));
    }
    setHasChanges(true);
  };

  // Remove question
  const removeQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.filter((q) => q.questionId !== questionId).map((q, i) => ({ ...q, order: i }))
    );
    setSections((prev) => removeQuestionFromSections(prev, questionId));
    setHasChanges(true);
  };

  const getQuestionSectionId = (questionId: string): string => {
    return sections.find(section => section.questionIds.includes(questionId))?.id || '';
  };

  const assignQuestionToSection = (questionId: string, sectionId: string) => {
    if (!sectionId) return;
    setSections((prev) => moveQuestionToSection(prev, questionId, sectionId));
    setHasChanges(true);
  };

  const buildSectionsPayload = (): ManagedSection[] | undefined => {
    if (!simulation?.hasSections || sections.length === 0) return undefined;

    const selectedQuestionIds = new Set(selectedQuestions.map(question => question.questionId));
    let payloadSections = sections.map((section, index) => {
      const questionIds = section.questionIds.filter(questionId => selectedQuestionIds.has(questionId));
      return {
        ...section,
        order: section.order ?? index,
        questionIds,
        questionCount: questionIds.length,
      };
    });

    const assignedQuestionIds = new Set(payloadSections.flatMap(section => section.questionIds));
    for (const question of selectedQuestions) {
      if (assignedQuestionIds.has(question.questionId)) continue;
      const sectionId = getPreferredSectionId(question, payloadSections);
      if (!sectionId) continue;
      payloadSections = moveQuestionToSection(payloadSections, question.questionId, sectionId);
      assignedQuestionIds.add(question.questionId);
    }

    return payloadSections;
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
      sections: buildSectionsPayload(),
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
              <CustomSelect
                value={questionSubjectFilter}
                onChange={setQuestionSubjectFilter}
                options={[
                  { value: '', label: 'Tutte le materie' },
                  ...(subjectsData?.map((s) => ({ value: s.id, label: s.name })) || []),
                ]}
                placeholder="Tutte le materie"
              />
              <div className="flex gap-2">
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
                <div className="flex-1">
                  <CustomSelect
                    value={questionTypeFilter}
                    onChange={setQuestionTypeFilter}
                    options={[
                      { value: '', label: 'Tutti i tipi' },
                      { value: 'SINGLE_CHOICE', label: 'Singola scelta' },
                      { value: 'MULTIPLE_CHOICE', label: 'Multipla scelta' },
                      { value: 'OPEN_TEXT', label: 'Risposta aperta' },
                    ]}
                    placeholder="Tutti i tipi"
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
                        <RichTextRenderer
                          text={question.text}
                          className={`text-sm ${colors.text.primary} line-clamp-2`}
                        />
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
                          <span className={`text-xs px-1.5 py-0.5 rounded ${colors.background.secondary} ${colors.text.muted} border ${colors.border.light}`}>
                            {TYPE_LABELS[question.type] ?? question.type}
                          </span>
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
                        {expandedPreviews.has(question.id) && renderAnswerPreview(question.type, question.answers as unknown as { id: string; text: string; isCorrect: boolean; order: number }[], question.keywords)}
                      </div>
                      {(() => {
                        const isChoice = question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE';
                        const hasPreview = isChoice
                          ? (question.answers?.some((a) => a.isCorrect) ?? false)
                          : (question.keywords?.length ?? 0) > 0;
                        if (!hasPreview) return null;
                        const isExpanded = expandedPreviews.has(question.id);
                        return (
                          <button
                            onClick={() => togglePreview(question.id)}
                            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 mt-0.5 ${
                              isExpanded
                                ? `${colors.primary.bg} text-white`
                                : `${colors.background.secondary} ${colors.text.muted}`
                            }`}
                            title={isExpanded ? 'Nascondi risposta' : 'Mostra risposta'}
                          >
                            {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        );
                      })()}
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
            {simulation.hasSections && sections.length > 0 && (
              <p className={`text-sm ${colors.text.muted} mt-1`}>
                Le domande sono raggruppate per sezione. Usa il selettore per spostarle.
              </p>
            )}
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
            ) : simulation.hasSections && sections.length > 0 ? (
              /* ── Grouped by section ── */
              <div>
                {sections.map((section) => {
                  const sectionQuestions = section.questionIds
                    .map((qId) => selectedQuestions.find((sq) => sq.questionId === qId))
                    .filter((sq): sq is SelectedQuestion => sq !== undefined);
                  return (
                    <div key={section.id}>
                      {/* Section header */}
                      <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 ${colors.background.secondary} border-b ${colors.border.light}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-pink-500 dark:bg-pink-400 shrink-0" />
                          <span className={`font-semibold text-sm ${colors.text.primary}`}>{section.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 ${colors.text.muted} font-medium`}>
                            {sectionQuestions.length}
                          </span>
                        </div>
                        <span className={`text-xs ${colors.text.muted}`}>{section.durationMinutes} min</span>
                      </div>
                      {/* Section questions */}
                      {sectionQuestions.length === 0 ? (
                        <div className={`px-4 py-3 border-b ${colors.border.light}`}>
                          <p className={`text-sm ${colors.text.muted} italic`}>Nessuna domanda in questa sezione</p>
                        </div>
                      ) : (
                        <div className={`divide-y ${colors.border.light}`}>
                          {sectionQuestions.map((sq) => {
                            const globalIdx = selectedQuestions.findIndex((s) => s.questionId === sq.questionId);
                            const qType = sq.question?.type;
                            const isChoice = qType === 'SINGLE_CHOICE' || qType === 'MULTIPLE_CHOICE';
                            const hasPreview = qType
                              ? (isChoice ? (sq.question?.answers?.some((a) => a.isCorrect) ?? false) : (sq.question?.keywords?.length ?? 0) > 0)
                              : false;
                            const isExpanded = expandedPreviews.has(sq.questionId);
                            return (
                              <div key={sq.questionId} className={`p-3 flex items-start gap-2 ${colors.background.card}`}>
                                <span className={`mt-1.5 w-6 h-6 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ${colors.text.muted}`}>
                                  {globalIdx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  {sq.question?.text ? (
                                    <RichTextRenderer text={sq.question.text} className={`text-sm ${colors.text.primary} line-clamp-2`} />
                                  ) : (
                                    <p className={`text-sm ${colors.text.primary} line-clamp-2`}>Domanda</p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {sq.question?.subject && (
                                      <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: sq.question.subject.color + '20', color: sq.question.subject.color }}>
                                        {sq.question.subject.name}
                                      </span>
                                    )}
                                    {sq.question?.type && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${colors.background.secondary} ${colors.text.muted} border ${colors.border.light}`}>
                                        {TYPE_LABELS[sq.question.type] ?? sq.question.type}
                                      </span>
                                    )}
                                    {sq.question?.difficulty && (
                                      <span className={`text-xs ${colors.text.muted}`}>
                                        {sq.question.difficulty === 'EASY' ? 'Facile' : sq.question.difficulty === 'MEDIUM' ? 'Media' : 'Difficile'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    <CustomSelect
                                      value={getQuestionSectionId(sq.questionId)}
                                      onChange={(sectionId) => assignQuestionToSection(sq.questionId, sectionId)}
                                      options={sections.map((s) => ({ value: s.id, label: s.name }))}
                                      placeholder="Seleziona sezione"
                                      disabled={!canEdit}
                                      size="sm"
                                    />
                                  </div>
                                  {isExpanded && qType && renderAnswerPreview(qType, sq.question?.answers, sq.question?.keywords)}
                                </div>
                                {hasPreview && (
                                  <button
                                    onClick={() => togglePreview(sq.questionId)}
                                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 mt-0.5 ${
                                      isExpanded
                                        ? `${colors.primary.bg} text-white`
                                        : `${colors.background.secondary} ${colors.text.muted}`
                                    }`}
                                    title={isExpanded ? 'Nascondi risposta' : 'Mostra risposta'}
                                  >
                                    {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                )}
                                {canEdit && (
                                  <button onClick={() => removeQuestion(sq.questionId)} className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Unassigned questions */}
                {(() => {
                  const unassigned = selectedQuestions.filter(
                    (sq) => !sections.some((s) => s.questionIds.includes(sq.questionId))
                  );
                  if (unassigned.length === 0) return null;
                  return (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="font-semibold text-sm text-amber-700 dark:text-amber-300">Senza sezione</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 font-medium">{unassigned.length}</span>
                        </div>
                      </div>
                      <div className={`divide-y ${colors.border.light}`}>
                        {unassigned.map((sq) => {
                          const globalIdx = selectedQuestions.findIndex((s) => s.questionId === sq.questionId);
                          const qType = sq.question?.type;
                          const isChoice = qType === 'SINGLE_CHOICE' || qType === 'MULTIPLE_CHOICE';
                          const hasPreview = qType
                            ? (isChoice ? (sq.question?.answers?.some((a) => a.isCorrect) ?? false) : (sq.question?.keywords?.length ?? 0) > 0)
                            : false;
                          const isExpanded = expandedPreviews.has(sq.questionId);
                          return (
                            <div key={sq.questionId} className={`p-3 flex items-start gap-2 ${colors.background.card}`}>
                              <span className={`mt-1.5 w-6 h-6 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ${colors.text.muted}`}>
                                {globalIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                {sq.question?.text ? (
                                  <RichTextRenderer text={sq.question.text} className={`text-sm ${colors.text.primary} line-clamp-2`} />
                                ) : (
                                  <p className={`text-sm ${colors.text.primary} line-clamp-2`}>Domanda</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {sq.question?.subject && (
                                    <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: sq.question.subject.color + '20', color: sq.question.subject.color }}>
                                      {sq.question.subject.name}
                                    </span>
                                  )}
                                  {sq.question?.type && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${colors.background.secondary} ${colors.text.muted} border ${colors.border.light}`}>
                                      {TYPE_LABELS[sq.question.type] ?? sq.question.type}
                                    </span>
                                  )}
                                  {sq.question?.difficulty && (
                                    <span className={`text-xs ${colors.text.muted}`}>
                                      {sq.question.difficulty === 'EASY' ? 'Facile' : sq.question.difficulty === 'MEDIUM' ? 'Media' : 'Difficile'}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <CustomSelect
                                    value={getQuestionSectionId(sq.questionId)}
                                    onChange={(sectionId) => assignQuestionToSection(sq.questionId, sectionId)}
                                    options={sections.map((s) => ({ value: s.id, label: s.name }))}
                                    placeholder="Seleziona sezione"
                                    disabled={!canEdit}
                                    size="sm"
                                  />
                                </div>
                                {isExpanded && qType && renderAnswerPreview(qType, sq.question?.answers, sq.question?.keywords)}
                              </div>
                              {hasPreview && (
                                <button
                                  onClick={() => togglePreview(sq.questionId)}
                                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 mt-0.5 ${
                                    isExpanded
                                      ? `${colors.primary.bg} text-white`
                                      : `${colors.background.secondary} ${colors.text.muted}`
                                  }`}
                                  title={isExpanded ? 'Nascondi risposta' : 'Mostra risposta'}
                                >
                                  {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              )}
                              {canEdit && (
                                <button onClick={() => removeQuestion(sq.questionId)} className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* ── Flat list (no sections) ── */
              <div className={`divide-y ${colors.border.light}`}>
                {selectedQuestions.map((sq, index) => {
                  const qType = sq.question?.type;
                  const isChoice = qType === 'SINGLE_CHOICE' || qType === 'MULTIPLE_CHOICE';
                  const hasPreview = qType
                    ? (isChoice ? (sq.question?.answers?.some((a) => a.isCorrect) ?? false) : (sq.question?.keywords?.length ?? 0) > 0)
                    : false;
                  const isExpanded = expandedPreviews.has(sq.questionId);
                  return (
                    <div key={sq.questionId} className={`p-3 flex items-start gap-3 ${colors.background.card}`}>
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
                      <span className={`mt-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ${colors.text.primary}`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {sq.question?.text ? (
                          <RichTextRenderer text={sq.question.text} className={`text-sm ${colors.text.primary} line-clamp-2`} />
                        ) : (
                          <p className={`text-sm ${colors.text.primary} line-clamp-2`}>Domanda</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {sq.question?.subject && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: sq.question.subject.color + '20', color: sq.question.subject.color }}>
                              {sq.question.subject.name}
                            </span>
                          )}
                          {sq.question?.type && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${colors.background.secondary} ${colors.text.muted} border ${colors.border.light}`}>
                              {TYPE_LABELS[sq.question.type] ?? sq.question.type}
                            </span>
                          )}
                          {sq.question?.difficulty && (
                            <span className={`text-xs ${colors.text.muted}`}>
                              {sq.question.difficulty === 'EASY' ? 'Facile' : sq.question.difficulty === 'MEDIUM' ? 'Media' : 'Difficile'}
                            </span>
                          )}
                          {sq.question?.topic && (
                            <span className={`text-xs ${colors.text.muted}`}>• {sq.question.topic.name}</span>
                          )}
                        </div>
                        {isExpanded && qType && renderAnswerPreview(qType, sq.question?.answers, sq.question?.keywords)}
                      </div>
                      {hasPreview && (
                        <button
                          onClick={() => togglePreview(sq.questionId)}
                          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 mt-1 ${
                            isExpanded
                              ? `${colors.primary.bg} text-white`
                              : `${colors.background.secondary} ${colors.text.muted}`
                          }`}
                          title={isExpanded ? 'Nascondi risposta' : 'Mostra risposta'}
                        >
                          {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => removeQuestion(sq.questionId)} className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
