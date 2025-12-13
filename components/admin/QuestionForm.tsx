'use client';

import { useState, useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ButtonLoader, Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import { useRouter } from 'next/navigation';
import {
  Save,
  X,
  Plus,
  Trash2,
  Check,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import {
  questionTypeLabels,
  difficultyLabels,
  openValidationTypeLabels,
  validateQuestionAnswers,
  validateQuestionKeywords,
  type QuestionType,
  type QuestionStatus,
  type DifficultyLevel,
  type OpenAnswerValidationType,
  type QuestionAnswerInput,
  type QuestionKeywordInput,
} from '@/lib/validations/questionValidation';

interface QuestionFormProps {
  questionId?: string; // If provided, we're editing
  basePath?: string; // Base path for redirects (default: /admin/domande)
  initialData?: {
    type: QuestionType;
    status: QuestionStatus;
    text: string;
    textLatex?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    subjectId?: string | null;
    topicId?: string | null;
    subTopicId?: string | null;
    difficulty: DifficultyLevel;
    points: number;
    negativePoints: number;
    blankPoints: number;
    timeLimitSeconds?: number | null;
    correctExplanation?: string | null;
    wrongExplanation?: string | null;
    generalExplanation?: string | null;
    shuffleAnswers: boolean;
    openValidationType?: OpenAnswerValidationType | null;
    openMinLength?: number | null;
    openMaxLength?: number | null;
    tags: string[];
    year?: number | null;
    source?: string | null;
    answers: QuestionAnswerInput[];
    keywords: QuestionKeywordInput[];
  };
}

const defaultAnswer: QuestionAnswerInput = {
  text: '',
  isCorrect: false,
  order: 0,
  label: 'A',
};

const defaultKeyword: QuestionKeywordInput = {
  keyword: '',
  weight: 1.0,
  isRequired: false,
  isSuggested: false,
  caseSensitive: false,
  exactMatch: false,
  synonyms: [],
};

export default function QuestionForm({ questionId, basePath = '/admin/domande', initialData }: QuestionFormProps) {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();
  const utils = trpc.useUtils();

  // Form state
  const [type, setType] = useState<QuestionType>(initialData?.type ?? 'SINGLE_CHOICE');
  const [_status, _setStatus] = useState<QuestionStatus>(initialData?.status ?? 'DRAFT');
  const [text, setText] = useState(initialData?.text ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? '');
  const [subjectId, setSubjectId] = useState(initialData?.subjectId ?? '');
  const [topicId, setTopicId] = useState(initialData?.topicId ?? '');
  const [subTopicId, setSubTopicId] = useState(initialData?.subTopicId ?? '');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialData?.difficulty ?? 'MEDIUM');
  const [points, setPoints] = useState(initialData?.points ?? 1);
  const [negativePoints, setNegativePoints] = useState(initialData?.negativePoints ?? 0);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | ''>(
    initialData?.timeLimitSeconds ?? ''
  );
  const [correctExplanation, setCorrectExplanation] = useState(initialData?.correctExplanation ?? '');
  const [wrongExplanation, setWrongExplanation] = useState(initialData?.wrongExplanation ?? '');
  const [generalExplanation, setGeneralExplanation] = useState(initialData?.generalExplanation ?? '');
  const [shuffleAnswers, setShuffleAnswers] = useState(initialData?.shuffleAnswers ?? false);
  const [openValidationType, setOpenValidationType] = useState<OpenAnswerValidationType | ''>(
    initialData?.openValidationType ?? ''
  );
  const [openMinLength, setOpenMinLength] = useState<number | ''>(initialData?.openMinLength ?? '');
  const [openMaxLength, setOpenMaxLength] = useState<number | ''>(initialData?.openMaxLength ?? '');
  const [tagsInput, setTagsInput] = useState((initialData?.tags ?? []).join(', '));
  const [year, setYear] = useState<number | ''>(initialData?.year ?? '');
  const [source, setSource] = useState(initialData?.source ?? '');

  // Answers state
  const [answers, setAnswers] = useState<QuestionAnswerInput[]>(
    initialData?.answers?.length
      ? initialData.answers
      : [
          { ...defaultAnswer, label: 'A', order: 0 },
          { ...defaultAnswer, label: 'B', order: 1 },
          { ...defaultAnswer, label: 'C', order: 2 },
          { ...defaultAnswer, label: 'D', order: 3 },
        ]
  );

  // Keywords state
  const [keywords, setKeywords] = useState<QuestionKeywordInput[]>(initialData?.keywords ?? []);
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch data
  const { data: subjects } = trpc.materials.getAllSubjects.useQuery();
  const { data: topicsData } = trpc.materials.getTopics.useQuery(
    { subjectId: subjectId || '', includeInactive: false },
    { enabled: !!subjectId }
  );

  // Keyword suggestions
  const { data: keywordSuggestions, isFetching: fetchingSuggestions } =
    trpc.questions.suggestKeywords.useQuery(
      {
        questionText: text,
        currentKeywords: keywords.map((k) => k.keyword),
      },
      {
        enabled: showKeywordSuggestions && text.length >= 10 && type === 'OPEN_TEXT',
      }
    );

  // Mutations
  const createMutation = trpc.questions.createQuestion.useMutation({
    onSuccess: (data) => {
      showSuccess('Domanda creata', 'La domanda è stata salvata con successo.');
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
      router.push(`${basePath}/${data?.id}`);
    },
    onError: handleMutationError,
  });

  const updateMutation = trpc.questions.updateQuestion.useMutation({
    onSuccess: () => {
      showSuccess('Domanda aggiornata', 'Le modifiche sono state salvate.');
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestion.invalidate({ id: questionId });
      router.push(`${basePath}/${questionId}`);
    },
    onError: handleMutationError,
  });

  // Computed values
  const topics = useMemo(() => topicsData ?? [], [topicsData]);
  const selectedTopic = useMemo(() => topics.find((t) => t.id === topicId), [topics, topicId]);
  const subTopics = useMemo(() => selectedTopic?.subTopics ?? [], [selectedTopic?.subTopics]);

  const subjectOptions = useMemo(
    () => [
      { value: '', label: 'Seleziona materia' },
      ...(subjects?.map((s) => ({ value: s.id, label: s.name })) ?? []),
    ],
    [subjects]
  );

  const topicOptions = useMemo(
    () => [
      { value: '', label: 'Seleziona argomento' },
      ...topics.map((t) => ({ value: t.id, label: t.name })),
    ],
    [topics]
  );

  const subTopicOptions = useMemo(
    () => [
      { value: '', label: 'Seleziona sotto-argomento' },
      ...subTopics.map((st) => ({ value: st.id, label: st.name })),
    ],
    [subTopics]
  );

  // Handlers
  const addAnswer = useCallback(() => {
    const nextLabel = String.fromCharCode(65 + answers.length);
    setAnswers([
      ...answers,
      { ...defaultAnswer, label: nextLabel, order: answers.length },
    ]);
  }, [answers]);

  const removeAnswer = useCallback(
    (index: number) => {
      if (answers.length <= 2) {
        showError('Errore', 'Devi avere almeno 2 risposte.');
        return;
      }
      const newAnswers = answers.filter((_, i) => i !== index);
      // Update labels and order
      setAnswers(
        newAnswers.map((a, i) => ({
          ...a,
          label: String.fromCharCode(65 + i),
          order: i,
        }))
      );
    },
    [answers, showError]
  );

  const updateAnswer = useCallback(
    (index: number, field: keyof QuestionAnswerInput, value: unknown) => {
      setAnswers((prev) =>
        prev.map((a, i) => {
          if (i !== index) {
            // For single choice, uncheck other answers when one is selected as correct
            if (field === 'isCorrect' && value === true && type === 'SINGLE_CHOICE') {
              return { ...a, isCorrect: false };
            }
            return a;
          }
          return { ...a, [field]: value };
        })
      );
    },
    [type]
  );

  const addKeyword = useCallback(() => {
    setKeywords([...keywords, { ...defaultKeyword }]);
  }, [keywords]);

  const removeKeyword = useCallback(
    (index: number) => {
      setKeywords(keywords.filter((_, i) => i !== index));
    },
    [keywords]
  );

  const updateKeyword = useCallback(
    (index: number, field: keyof QuestionKeywordInput, value: unknown) => {
      setKeywords((prev) =>
        prev.map((k, i) => (i === index ? { ...k, [field]: value } : k))
      );
    },
    []
  );

  const addSuggestedKeyword = useCallback(
    (suggestion: { keyword: string }) => {
      if (!keywords.some((k) => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase())) {
        setKeywords([
          ...keywords,
          { ...defaultKeyword, keyword: suggestion.keyword, isSuggested: true },
        ]);
      }
    },
    [keywords]
  );

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!text.trim()) {
      newErrors.text = 'Il testo della domanda è obbligatorio.';
    }

    if (type !== 'OPEN_TEXT') {
      const answersValidation = validateQuestionAnswers(type, answers);
      if (!answersValidation.valid) {
        newErrors.answers = answersValidation.error!;
      }
    }

    if (type === 'OPEN_TEXT' && openValidationType) {
      const keywordsValidation = validateQuestionKeywords(type, openValidationType, keywords);
      if (!keywordsValidation.valid) {
        newErrors.keywords = keywordsValidation.error!;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [text, type, answers, keywords, openValidationType]);

  // Submit handler
  const handleSubmit = useCallback(
    (saveStatus: QuestionStatus) => {
      if (!validate()) {
        showError('Errore di validazione', 'Correggi gli errori nel form.');
        return;
      }

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const data = {
        type,
        status: saveStatus,
        text,
        description: description || null,
        imageUrl: imageUrl || null,
        subjectId: subjectId || null,
        topicId: topicId || null,
        subTopicId: subTopicId || null,
        difficulty,
        points,
        negativePoints,
        blankPoints: 0,
        timeLimitSeconds: timeLimitSeconds ? Number(timeLimitSeconds) : null,
        correctExplanation: correctExplanation || null,
        wrongExplanation: wrongExplanation || null,
        generalExplanation: generalExplanation || null,
        shuffleAnswers,
        openValidationType: type === 'OPEN_TEXT' && openValidationType ? openValidationType : null,
        openMinLength: type === 'OPEN_TEXT' && openMinLength ? Number(openMinLength) : null,
        openMaxLength: type === 'OPEN_TEXT' && openMaxLength ? Number(openMaxLength) : null,
        openCaseSensitive: false,
        openPartialMatch: true,
        showExplanation: true,
        tags,
        year: year ? Number(year) : null,
        source: source || null,
        answers: type !== 'OPEN_TEXT' ? answers : [],
        keywords: type === 'OPEN_TEXT' ? keywords : [],
      };

      if (questionId) {
        updateMutation.mutate({ id: questionId, ...data });
      } else {
        createMutation.mutate(data);
      }
    },
    [
      validate,
      showError,
      type,
      text,
      description,
      imageUrl,
      subjectId,
      topicId,
      subTopicId,
      difficulty,
      points,
      negativePoints,
      timeLimitSeconds,
      correctExplanation,
      wrongExplanation,
      generalExplanation,
      shuffleAnswers,
      openValidationType,
      openMinLength,
      openMaxLength,
      tagsInput,
      year,
      source,
      answers,
      keywords,
      questionId,
      createMutation,
      updateMutation,
    ]
  );

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
          {questionId ? 'Modifica Domanda' : 'Nuova Domanda'}
        </h1>
        <button
          onClick={() => router.back()}
          className={`p-2 rounded-lg hover:${colors.background.secondary} transition-colors`}
        >
          <X className={`w-5 h-5 ${colors.text.muted}`} />
        </button>
      </div>

      {/* Main Form */}
      <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm} space-y-6`}>
        {/* Type Selection */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Tipo di domanda *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'OPEN_TEXT'] as QuestionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  type === t
                    ? `${colors.primary.border} ${colors.primary.softBg}`
                    : `${colors.border.primary} hover:border-gray-300 dark:hover:border-gray-600`
                }`}
              >
                <p className={`font-medium ${type === t ? colors.primary.text : colors.text.primary}`}>
                  {questionTypeLabels[t]}
                </p>
                <p className={`text-xs mt-1 ${colors.text.muted}`}>
                  {t === 'SINGLE_CHOICE' && 'Una sola risposta corretta'}
                  {t === 'MULTIPLE_CHOICE' && 'Più risposte corrette'}
                  {t === 'OPEN_TEXT' && 'Risposta libera'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Testo della domanda *
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Inserisci il testo della domanda..."
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.text ? 'border-red-500' : colors.border.primary
            } ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
          />
          {errors.text && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.text}
            </p>
          )}
        </div>

        {/* Categorization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CustomSelect
            label="Materia"
            options={subjectOptions}
            value={subjectId}
            onChange={(val) => {
              setSubjectId(val);
              setTopicId('');
              setSubTopicId('');
            }}
          />
          <CustomSelect
            label="Argomento"
            options={topicOptions}
            value={topicId}
            onChange={(val) => {
              setTopicId(val);
              setSubTopicId('');
            }}
            disabled={!subjectId}
          />
          <CustomSelect
            label="Sotto-argomento"
            options={subTopicOptions}
            value={subTopicId}
            onChange={setSubTopicId}
            disabled={!topicId}
          />
        </div>

        {/* Difficulty and Points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CustomSelect
            label="Difficoltà"
            options={[
              { value: 'EASY', label: difficultyLabels.EASY },
              { value: 'MEDIUM', label: difficultyLabels.MEDIUM },
              { value: 'HARD', label: difficultyLabels.HARD },
            ]}
            value={difficulty}
            onChange={(val) => setDifficulty(val as DifficultyLevel)}
          />
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Punti risposta corretta
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              step="0.25"
              min="0"
              className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Punti risposta errata
            </label>
            <input
              type="number"
              value={negativePoints}
              onChange={(e) => setNegativePoints(Number(e.target.value))}
              step="0.25"
              max="0"
              className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
            />
          </div>
        </div>

        {/* Answers Section (for choice types) */}
        {type !== 'OPEN_TEXT' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm font-medium ${colors.text.primary}`}>
                Risposte *
              </label>
              <button
                type="button"
                onClick={addAnswer}
                disabled={answers.length >= 6}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-[#a8012b] text-white hover:bg-[#8a0123] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Aggiungi
              </button>
            </div>

            {errors.answers && (
              <p className="mb-3 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.answers}
              </p>
            )}

            <div className="space-y-3">
              {answers.map((answer, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    answer.isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : colors.border.primary
                  } ${colors.background.secondary}`}
                >
                  <div className="flex items-center gap-2 pt-2">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        answer.isCorrect
                          ? 'bg-green-500 text-white'
                          : `${colors.background.tertiary} ${colors.text.secondary}`
                      }`}
                    >
                      {answer.label}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={answer.text}
                      onChange={(e) => updateAnswer(index, 'text', e.target.value)}
                      placeholder={`Risposta ${answer.label}...`}
                      className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                    />
                    <input
                      type="text"
                      value={answer.explanation ?? ''}
                      onChange={(e) => updateAnswer(index, 'explanation', e.target.value)}
                      placeholder="Spiegazione per questa risposta (opzionale)"
                      className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.muted} text-sm focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => updateAnswer(index, 'isCorrect', !answer.isCorrect)}
                      className={`p-2 rounded-lg transition-colors ${
                        answer.isCorrect
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                      }`}
                      title={answer.isCorrect ? 'Rimuovi come corretta' : 'Imposta come corretta'}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAnswer(index)}
                      disabled={answers.length <= 2}
                      className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Rimuovi risposta"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Checkbox
                id="shuffleAnswers"
                checked={shuffleAnswers}
                onChange={(e) => setShuffleAnswers(e.target.checked)}
                label="Mescola l'ordine delle risposte durante il test"
              />
            </div>
          </div>
        )}

        {/* Keywords Section (for open text) */}
        {type === 'OPEN_TEXT' && (
          <div className="space-y-4">
            <CustomSelect
              label="Tipo di valutazione *"
              options={[
                { value: '', label: 'Seleziona tipo di valutazione' },
                { value: 'MANUAL', label: openValidationTypeLabels.MANUAL },
                { value: 'KEYWORDS', label: openValidationTypeLabels.KEYWORDS },
                { value: 'BOTH', label: openValidationTypeLabels.BOTH },
              ]}
              value={openValidationType}
              onChange={(val) => setOpenValidationType(val as OpenAnswerValidationType | '')}
            />

            {(openValidationType === 'KEYWORDS' || openValidationType === 'BOTH') && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={`text-sm font-medium ${colors.text.primary}`}>
                    Keywords per validazione *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowKeywordSuggestions(!showKeywordSuggestions)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border ${
                        showKeywordSuggestions 
                          ? 'border-[#a8012b] text-[#a8012b] bg-[#a8012b]/10' 
                          : `${colors.border.primary} ${colors.text.secondary} hover:border-[#a8012b]/50`
                      } transition-colors`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Suggerimenti
                    </button>
                    <button
                      type="button"
                      onClick={addKeyword}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-[#a8012b] text-white hover:bg-[#8a0123] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Aggiungi
                    </button>
                  </div>
                </div>

                {errors.keywords && (
                  <p className="mb-3 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.keywords}
                  </p>
                )}

                {/* Keyword Suggestions */}
                {showKeywordSuggestions && (
                  <div className={`mb-4 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className={`w-5 h-5 ${colors.primary.text}`} />
                      <span className={`font-medium ${colors.text.primary}`}>
                        Keywords suggerite
                      </span>
                      {fetchingSuggestions && <Spinner size="xs" />}
                    </div>
                    {text.length < 10 ? (
                      <p className={`text-sm ${colors.text.muted}`}>
                        Inserisci almeno 10 caratteri nel testo della domanda per ottenere suggerimenti.
                      </p>
                    ) : keywordSuggestions && keywordSuggestions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {keywordSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addSuggestedKeyword(suggestion)}
                            disabled={keywords.some(
                              (k) => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase()
                            )}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border ${
                              keywords.some(
                                (k) => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase()
                              )
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-[#a8012b] hover:text-[#a8012b]'
                            } ${colors.border.primary} ${colors.text.secondary} transition-colors`}
                            title={suggestion.reason}
                          >
                            <Plus className="w-3 h-3" />
                            {suggestion.keyword}
                            <span className={`text-xs ${colors.text.muted}`}>
                              ({Math.round(suggestion.confidence * 100)}%)
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm ${colors.text.muted}`}>
                        Nessun suggerimento disponibile.
                      </p>
                    )}
                  </div>
                )}

                {/* Keywords List */}
                <div className="space-y-2">
                  {keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${colors.border.primary} ${colors.background.secondary}`}
                    >
                      <input
                        type="text"
                        value={keyword.keyword}
                        onChange={(e) => updateKeyword(index, 'keyword', e.target.value)}
                        placeholder="Keyword..."
                        className={`flex-1 px-3 py-1.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                      />
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={keyword.isRequired}
                          onChange={(e) => updateKeyword(index, 'isRequired', e.target.checked)}
                          label="Obbligatoria"
                        />
                        <input
                          type="number"
                          value={keyword.weight}
                          onChange={(e) => updateKeyword(index, 'weight', Number(e.target.value))}
                          min="0"
                          max="10"
                          step="0.5"
                          className={`w-16 px-2 py-1 rounded border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm text-center`}
                          title="Peso"
                        />
                        <button
                          type="button"
                          onClick={() => removeKeyword(index)}
                          className="p-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {keywords.length === 0 && (
                    <p className={`text-sm ${colors.text.muted} text-center py-4`}>
                      Nessuna keyword inserita. Aggiungi keywords per la validazione automatica.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Open text length limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Lunghezza minima (caratteri)
                </label>
                <input
                  type="number"
                  value={openMinLength}
                  onChange={(e) => setOpenMinLength(e.target.value ? Number(e.target.value) : '')}
                  min="0"
                  placeholder="Nessun limite"
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Lunghezza massima (caratteri)
                </label>
                <input
                  type="number"
                  value={openMaxLength}
                  onChange={(e) => setOpenMaxLength(e.target.value ? Number(e.target.value) : '')}
                  min="0"
                  placeholder="Nessun limite"
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Explanations */}
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Spiegazione risposta corretta
            </label>
            <textarea
              value={correctExplanation}
              onChange={(e) => setCorrectExplanation(e.target.value)}
              rows={2}
              placeholder="Mostrata quando lo studente risponde correttamente..."
              className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Spiegazione risposta errata
            </label>
            <textarea
              value={wrongExplanation}
              onChange={(e) => setWrongExplanation(e.target.value)}
              rows={2}
              placeholder="Mostrata quando lo studente sbaglia..."
              className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
            />
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`w-full flex items-center justify-between p-4 rounded-lg border ${colors.border.primary} hover:${colors.background.secondary} transition-colors`}
        >
          <span className={`font-medium ${colors.text.primary}`}>Opzioni avanzate</span>
          {showAdvanced ? (
            <ChevronUp className={`w-5 h-5 ${colors.text.muted}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${colors.text.muted}`} />
          )}
        </button>

        {showAdvanced && (
          <div className="space-y-4 p-4 rounded-lg border border-dashed ${colors.border.primary}">
            {/* Image URL */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                URL immagine
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Descrizione / Contesto aggiuntivo
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Informazioni aggiuntive mostrate prima della domanda..."
                className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
              />
            </div>

            {/* Time Limit */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Tempo limite (secondi)
              </label>
              <input
                type="number"
                value={timeLimitSeconds}
                onChange={(e) =>
                  setTimeLimitSeconds(e.target.value ? Number(e.target.value) : '')
                }
                min="0"
                placeholder="Nessun limite"
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
              />
            </div>

            {/* Tags */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Tags (separati da virgola)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="anatomia, cellula, membrana..."
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
              />
            </div>

            {/* Year and Source */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Anno esame
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                  min="2000"
                  max="2100"
                  placeholder="es. 2024"
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Fonte
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="es. Medicina 2024"
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              </div>
            </div>

            {/* General Explanation */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Spiegazione generale
              </label>
              <textarea
                value={generalExplanation}
                onChange={(e) => setGeneralExplanation(e.target.value)}
                rows={2}
                placeholder="Mostrata sempre dopo la risposta..."
                className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm} flex items-center justify-between`}>
        <button
          type="button"
          onClick={() => router.back()}
          className={`px-6 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
        >
          Annulla
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:${colors.background.secondary} transition-colors disabled:opacity-50`}
          >
            <ButtonLoader loading={isLoading && status === 'DRAFT'} loadingText="Salvataggio...">
              Salva come bozza
            </ButtonLoader>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('PUBLISHED')}
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            <ButtonLoader loading={isLoading && status === 'PUBLISHED'} loadingText="Pubblicazione...">
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Pubblica
              </span>
            </ButtonLoader>
          </button>
        </div>
      </div>
    </div>
  );
}
