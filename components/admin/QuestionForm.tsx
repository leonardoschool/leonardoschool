'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ButtonLoader, Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import { useRouter } from 'next/navigation';
import { firebaseStorage } from '@/lib/firebase/storage';
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
  Eye,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Info,
  Copy,
} from 'lucide-react';
import TagSelector from '@/components/admin/TagSelector';
import LaTeXEditor from '@/components/ui/LaTeXEditor';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import { Modal } from '@/components/ui/Modal';
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
  basePath?: string; // Base path for redirects (default: /domande)
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
    timeLimitSeconds?: number | null;
    correctExplanation?: string | null;
    wrongExplanation?: string | null;
    generalExplanation?: string | null;
    shuffleAnswers: boolean;
    openValidationType?: OpenAnswerValidationType | null;
    openMinLength?: number | null;
    openMaxLength?: number | null;
    tagIds?: string[]; // Tag IDs
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

export default function QuestionForm({ questionId, basePath = '/domande', initialData }: QuestionFormProps) {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();
  const utils = trpc.useUtils();

  // Form state
  const [type, setType] = useState<QuestionType>(initialData?.type ?? 'SINGLE_CHOICE');
  // eslint-disable-next-line sonarjs/no-unused-vars -- status state reserved for future status toggle
  const [_status, _setStatus] = useState<QuestionStatus>(initialData?.status ?? 'DRAFT');
  const [text, setText] = useState(initialData?.text ?? '');
  const [textLatex, setTextLatex] = useState(initialData?.textLatex ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? '');
  const [subjectId, setSubjectId] = useState(initialData?.subjectId ?? '');
  const [topicId, setTopicId] = useState(initialData?.topicId ?? '');
  const [subTopicId, setSubTopicId] = useState(initialData?.subTopicId ?? '');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialData?.difficulty ?? 'MEDIUM');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | ''>(
    initialData?.timeLimitSeconds ?? ''
  );

  // Image upload state
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);
  
  // Formula helper state
  const [showFormulaHelper, setShowFormulaHelper] = useState(false);
  const [showFormattingInfo, setShowFormattingInfo] = useState(false);

  const [correctExplanation, setCorrectExplanation] = useState(initialData?.correctExplanation ?? '');
  const [wrongExplanation, setWrongExplanation] = useState(initialData?.wrongExplanation ?? '');
  const [generalExplanation, setGeneralExplanation] = useState(initialData?.generalExplanation ?? '');
  const [shuffleAnswers, setShuffleAnswers] = useState(initialData?.shuffleAnswers ?? false);
  const [openValidationType, setOpenValidationType] = useState<OpenAnswerValidationType | ''>(
    initialData?.openValidationType ?? ''
  );
  const [openMinLength, setOpenMinLength] = useState<number | ''>(initialData?.openMinLength ?? '');
  const [openMaxLength, setOpenMaxLength] = useState<number | ''>(initialData?.openMaxLength ?? '');
  const [year, setYear] = useState<number | ''>(initialData?.year ?? '');
  const [source, setSource] = useState(initialData?.source ?? '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialData?.tagIds ?? []);
  const selectedTagIdsRef = useRef<string[]>(initialData?.tagIds ?? []);
  
  // Keep ref in sync with state using useEffect
  useEffect(() => {
    selectedTagIdsRef.current = selectedTagIds;
  }, [selectedTagIds]);


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
  // Tag assignment mutation - replaces all tags atomically
  const replaceTagsMutation = trpc.questionTags.replaceQuestionTags.useMutation({
    onError: handleMutationError,
  });

  const createMutation = trpc.questions.createQuestion.useMutation({
    onSuccess: async (data) => {
      // Assign tags to the newly created question using ref for current value
      const currentTagIds = selectedTagIdsRef.current;
      if (data?.id && currentTagIds.length > 0) {
        try {
          await replaceTagsMutation.mutateAsync({
            questionId: data.id,
            tagIds: currentTagIds,
          });
        } catch (error) {
          console.error('Failed to assign tags:', error);
          // Don't block - question was created successfully
        }
      }
      showSuccess('Domanda creata', 'La domanda è stata salvata con successo.');
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
      router.push(`${basePath}/${data?.id}`);
    },
    onError: handleMutationError,
  });

  const updateMutation = trpc.questions.updateQuestion.useMutation({
    onSuccess: async () => {
      // Update tag assignments using ref for current value
      const currentTagIds = selectedTagIdsRef.current;
      if (questionId) {
        try {
          await replaceTagsMutation.mutateAsync({
            questionId,
            tagIds: currentTagIds,
          });
        } catch (error) {
          console.error('Failed to update tags:', error);
          // Don't block - question was updated successfully
        }
      }
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
    async (saveStatus: QuestionStatus) => {
      if (!validate()) {
        showError('Errore di validazione', 'Correggi gli errori nel form.');
        return;
      }

      let finalImageUrl = imageUrl || null;

      // If there's a file to upload, upload it first
      if (imageFile && imageMode === 'upload') {
        try {
          setUploadingImage(true);
          const result = await firebaseStorage.uploadQuestionImage(imageFile);
          finalImageUrl = result.url;
        } catch (error) {
          console.error('Error uploading image:', error);
          showError('Errore', 'Errore durante il caricamento dell\'immagine.');
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const data = {
        type,
        status: saveStatus,
        text,
        textLatex: textLatex || null,
        description: description || null,
        imageUrl: finalImageUrl,
        subjectId: subjectId || null,
        topicId: topicId || null,
        subTopicId: subTopicId || null,
        difficulty,
        points: 1, // Default, managed in simulation
        negativePoints: 0, // Default, managed in simulation
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
        tags: [], // Legacy tags removed - using new tag system
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
      textLatex,
      description,
      imageUrl,
      imageFile,
      imageMode,
      subjectId,
      topicId,
      subTopicId,
      difficulty,
      timeLimitSeconds,
      correctExplanation,
      wrongExplanation,
      generalExplanation,
      shuffleAnswers,
      openValidationType,
      openMinLength,
      openMaxLength,
      answers,
      keywords,
      year,
      source,
      questionId,
      createMutation,
      updateMutation,
    ]
  );

  const isLoading = createMutation.isPending || updateMutation.isPending || uploadingImage;

  // Get current image for preview
  const currentImageUrl = imageMode === 'url' ? imageUrl : imagePreviewUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
          {questionId ? 'Modifica Domanda' : 'Nuova Domanda'}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            disabled={!text.trim()}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Eye className="w-4 h-4" />
            Anteprima
          </button>
          <button
            onClick={() => router.back()}
            className={`p-2 rounded-lg hover:${colors.background.secondary} transition-colors`}
          >
          <X className={`w-5 h-5 ${colors.text.muted}`} />
        </button>
        </div>
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
          <div className="flex items-center justify-between mb-2">
            <label className={`text-sm font-medium ${colors.text.primary}`}>
              Testo della domanda *
            </label>
            <button
              type="button"
              onClick={() => setShowFormattingInfo(!showFormattingInfo)}
              className={`inline-flex items-center gap-1 text-sm ${colors.text.muted} hover:${colors.primary.text} transition-colors`}
            >
              <Info className="w-4 h-4" />
              Come formattare
            </button>
          </div>

          {/* Formatting Info */}
          {showFormattingInfo && (
            <div className={`mb-3 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
              <h4 className={`font-medium ${colors.text.primary} mb-2`}>Formattazione del testo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={`font-medium ${colors.text.secondary} mb-1`}>LaTeX (formule matematiche)</p>
                  <ul className={`${colors.text.muted} space-y-1`}>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">$formula$</code> - formula inline</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">$$formula$$</code> - formula centrata</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">\(formula\)</code> - formula inline</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">\[formula\]</code> - formula centrata</li>
                  </ul>
                  <p className={`${colors.text.muted} mt-2 text-xs`}>
                    Es: $x^2 + y^2 = r^2$ → x² + y² = r²
                  </p>
                  <p className={`${colors.text.muted} mt-1 text-xs`}>
                    Ambienti come <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">\begin&#123;cases&#125;...\end&#123;cases&#125;</code> vengono riconosciuti automaticamente
                  </p>
                </div>
                <div>
                  <p className={`font-medium ${colors.text.secondary} mb-1`}>HTML (formattazione testo)</p>
                  <ul className={`${colors.text.muted} space-y-1`}>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;sub&gt;testo&lt;/sub&gt;</code> - pedice (H<sub>2</sub>O)</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;sup&gt;testo&lt;/sup&gt;</code> - apice (x<sup>2</sup>)</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;b&gt;testo&lt;/b&gt;</code> - <b>grassetto</b></li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;i&gt;testo&lt;/i&gt;</code> - <i>corsivo</i></li>
                  </ul>
                  <p className={`${colors.text.muted} mt-2 text-xs`}>
                    Es: CH&lt;sub&gt;4&lt;/sub&gt; + O&lt;sub&gt;2&lt;/sub&gt; → CH₄ + O₂
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormattingInfo(false)}
                className={`mt-3 text-sm ${colors.primary.text} hover:underline`}
              >
                Chiudi
              </button>
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Inserisci il testo della domanda... (supporta LaTeX e HTML)"
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.text ? 'border-red-500' : colors.border.primary
            } ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y font-mono text-sm`}
          />
          {errors.text && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.text}
            </p>
          )}

          {/* Live Preview of text */}
          {text && (
            <div className="mt-3">
              <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima formattazione:</p>
              <div className={`p-3 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                <RichTextRenderer text={text} className={colors.text.primary} />
              </div>
            </div>
          )}

          {/* Formula Helper Toggle */}
          <button
            type="button"
            onClick={() => setShowFormulaHelper(!showFormulaHelper)}
            className={`mt-3 inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.primary.text} transition-colors`}
          >
            <Sparkles className="w-4 h-4" />
            {showFormulaHelper ? 'Nascondi assistente formule' : 'Assistente formule LaTeX'}
            {showFormulaHelper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Formula Helper - LaTeX Editor as copy helper */}
        {showFormulaHelper && (
          <div className={`p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`font-medium ${colors.text.primary}`}>Assistente Formule LaTeX</p>
              <p className={`text-xs ${colors.text.muted}`}>
                Crea la formula, poi copiala nel testo della domanda
              </p>
            </div>
            <LaTeXEditor
              value={textLatex}
              onChange={setTextLatex}
              placeholder="Costruisci la tua formula qui..."
              rows={2}
            />
            {textLatex && (
              <div className="mt-3 flex items-center gap-2">
                <code className={`flex-1 px-3 py-2 rounded ${colors.background.tertiary} ${colors.text.primary} text-sm font-mono`}>
                  ${textLatex}$
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`$${textLatex}$`);
                    showSuccess('Copiato!', 'Formula copiata negli appunti. Incollala nel testo della domanda.');
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity text-sm`}
                >
                  <Copy className="w-4 h-4" />
                  Copia
                </button>
              </div>
            )}
          </div>
        )}

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

        {/* Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className={`flex items-center p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
            <p className={`text-sm ${colors.text.muted}`}>
              <span className="font-medium">Nota:</span> I punti per risposta corretta/errata vengono configurati nella creazione della simulazione.
            </p>
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
                  className={`p-4 rounded-lg border ${
                    answer.isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : colors.border.primary
                  } ${colors.background.secondary}`}
                >
                  <div className="flex items-start gap-3">
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
                        placeholder={`Risposta ${answer.label}... (supporta LaTeX: $x^2$ e HTML: <sub>2</sub>)`}
                        className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                      />
                      <input
                        type="text"
                        value={answer.explanation ?? ''}
                        onChange={(e) => updateAnswer(index, 'explanation', e.target.value)}
                        placeholder="Spiegazione per questa risposta (opzionale, supporta LaTeX/HTML)"
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
                  {/* Preview for answer text */}
                  {(answer.text.includes('$') || answer.text.includes('<') || answer.explanation?.includes('$') || answer.explanation?.includes('<')) && (
                    <div className={`mt-2 pt-2 border-t ${colors.border.light}`}>
                      <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima:</p>
                      <div className={`text-sm ${colors.text.primary}`}>
                        <RichTextRenderer text={answer.text} />
                      </div>
                      {answer.explanation && (answer.explanation.includes('$') || answer.explanation.includes('<')) && (
                        <div className={`text-xs ${colors.text.muted} mt-1`}>
                          <span className="italic">Spiegazione: </span>
                          <RichTextRenderer text={answer.explanation} className="inline" />
                        </div>
                      )}
                    </div>
                  )}
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
          <p className={`text-xs ${colors.text.muted} mb-2`}>
            💡 Le spiegazioni supportano LaTeX (<code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">$formula$</code>) e HTML (<code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">&lt;sub&gt;2&lt;/sub&gt;</code>)
          </p>
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Spiegazione risposta corretta
            </label>
            <textarea
              value={correctExplanation}
              onChange={(e) => setCorrectExplanation(e.target.value)}
              rows={2}
              placeholder="Mostrata quando lo studente risponde correttamente... (supporta LaTeX/HTML)"
              className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
            />
            {correctExplanation && (correctExplanation.includes('$') || correctExplanation.includes('<')) && (
              <div className={`mt-2 p-2 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}>
                <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima:</p>
                <div className={`text-sm ${colors.text.primary}`}>
                  <RichTextRenderer text={correctExplanation} />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Spiegazione risposta errata
            </label>
            <textarea
              value={wrongExplanation}
              onChange={(e) => setWrongExplanation(e.target.value)}
              rows={2}
              placeholder="Mostrata quando lo studente sbaglia... (supporta LaTeX/HTML)"
              className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
            />
            {wrongExplanation && (wrongExplanation.includes('$') || wrongExplanation.includes('<')) && (
              <div className={`mt-2 p-2 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}>
                <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima:</p>
                <div className={`text-sm ${colors.text.primary}`}>
                  <RichTextRenderer text={wrongExplanation} />
                </div>
              </div>
            )}
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
            {/* Image Upload */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Immagine
              </label>
              
              {/* Mode Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('url');
                    setImageFile(null);
                    setImagePreviewUrl('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    imageMode === 'url'
                      ? `${colors.primary.border} ${colors.primary.softBg} ${colors.primary.text}`
                      : `${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary}`
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('upload');
                    setImageUrl('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    imageMode === 'upload'
                      ? `${colors.primary.border} ${colors.primary.softBg} ${colors.primary.text}`
                      : `${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary}`
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Carica file
                </button>
              </div>

              {imageMode === 'url' ? (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              ) : (
                <div className="space-y-3">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        // Create preview URL
                        const previewUrl = URL.createObjectURL(file);
                        setImagePreviewUrl(previewUrl);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-6 rounded-lg border-2 border-dashed ${colors.border.primary} hover:${colors.primary.border} transition-colors`}
                  >
                    <ImageIcon className={`w-8 h-8 ${colors.text.muted}`} />
                    <span className={colors.text.secondary}>
                      {imageFile ? imageFile.name : 'Clicca per selezionare un\'immagine'}
                    </span>
                  </button>
                </div>
              )}

              {/* Image Preview */}
              {(imageUrl || imagePreviewUrl) && (
                <div className="mt-3">
                  <p className={`text-sm ${colors.text.muted} mb-2`}>Anteprima:</p>
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageMode === 'url' ? imageUrl : imagePreviewUrl}
                      alt="Preview"
                      className="max-w-full max-h-48 rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (imageMode === 'url') {
                          setImageUrl('');
                        } else {
                          setImageFile(null);
                          setImagePreviewUrl('');
                          if (imageInputRef.current) {
                            imageInputRef.current.value = '';
                          }
                        }
                      }}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
            {/* <div>
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
            </div> */}

            {/* Year and Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Anno
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                  min="1990"
                  max={new Date().getFullYear()}
                  placeholder="Es: 2024"
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
                  placeholder="Es: Test ufficiale, Libro, etc."
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Tag
              </label>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                placeholder="Seleziona tag per categorizzare la domanda..."
              />
              <p className={`text-xs ${colors.text.muted} mt-1`}>
                Usa i tag per organizzare le domande per fonte, anno o categoria
              </p>
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
                placeholder="Mostrata sempre dopo la risposta... (supporta LaTeX/HTML)"
                className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
              />
              {generalExplanation && (generalExplanation.includes('$') || generalExplanation.includes('<')) && (
                <div className={`mt-2 p-2 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}>
                  <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima:</p>
                  <div className={`text-sm ${colors.text.primary}`}>
                    <RichTextRenderer text={generalExplanation} />
                  </div>
                </div>
              )}
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
            <ButtonLoader loading={isLoading && _status === 'DRAFT'} loadingText="Salvataggio...">
              Salva come bozza
            </ButtonLoader>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('PUBLISHED')}
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            <ButtonLoader loading={isLoading && _status === 'PUBLISHED'} loadingText="Pubblicazione...">
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Pubblica
              </span>
            </ButtonLoader>
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Anteprima Domanda"
        icon={<Eye className="w-6 h-6" />}
        size="2xl"
        variant="primary"
        footer={
          <button
            onClick={() => setShowPreview(false)}
            className={`px-6 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity`}
          >
            Chiudi
          </button>
        }
      >
        {/* Question Info */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            difficulty === 'EASY' 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : difficulty === 'MEDIUM'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {difficultyLabels[difficulty]}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {questionTypeLabels[type]}
          </span>
          {subjects?.find(s => s.id === subjectId)?.name && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.primary.softBg} ${colors.primary.text}`}>
              {subjects.find(s => s.id === subjectId)?.name}
            </span>
          )}
        </div>

        {/* Image */}
        {currentImageUrl && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImageUrl}
              alt="Immagine domanda"
              className="max-w-full max-h-64 rounded-lg mx-auto"
            />
          </div>
        )}

        {/* Question Text */}
        <div className={`text-lg ${colors.text.primary} mb-6`}>
          {text ? (
            <RichTextRenderer text={text} />
          ) : (
            <p className="text-gray-400">Nessun testo inserito</p>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className={`mb-6 p-4 rounded-lg ${colors.background.secondary} border-l-4 ${colors.primary.border}`}>
            <div className={`text-sm ${colors.text.secondary}`}>
              <RichTextRenderer text={description} />
            </div>
          </div>
        )}

        {/* Answers */}
        {type !== 'OPEN_TEXT' && answers.length > 0 && (
          <div className="space-y-3">
            <h3 className={`font-medium ${colors.text.primary} mb-3`}>Risposte:</h3>
            {answers.map((answer, index) => (
              <div
                key={index}
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
                  {answer.label || String.fromCharCode(65 + index)}
                </span>
                <div className="flex-1">
                  <div className={colors.text.primary}>
                    {answer.text ? <RichTextRenderer text={answer.text} /> : '(vuota)'}
                  </div>
                  {answer.explanation && (
                    <div className={`text-sm ${colors.text.muted} mt-1`}>
                      💡 <RichTextRenderer text={answer.explanation} />
                    </div>
                  )}
                </div>
                {answer.isCorrect && (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Open Text Info */}
        {type === 'OPEN_TEXT' && (
          <div className={`p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
            <p className={`font-medium ${colors.text.primary} mb-2`}>Risposta aperta</p>
            <p className={`text-sm ${colors.text.muted}`}>
              Tipo valutazione: {openValidationType ? openValidationTypeLabels[openValidationType as OpenAnswerValidationType] : 'Non specificato'}
            </p>
            {(openMinLength || openMaxLength) && (
              <p className={`text-sm ${colors.text.muted}`}>
                Lunghezza: {openMinLength || '0'} - {openMaxLength || '∞'} caratteri
              </p>
            )}
            {keywords.length > 0 && (
              <div className="mt-2">
                <p className={`text-sm ${colors.text.muted}`}>Keywords: {keywords.map(k => k.keyword).join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Explanations */}
        {(correctExplanation || wrongExplanation || generalExplanation) && (
          <div className="mt-6 space-y-3">
            <h3 className={`font-medium ${colors.text.primary}`}>Spiegazioni:</h3>
            {correctExplanation && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-700 dark:text-green-300">
                  <span className="font-medium">✓ Risposta corretta:</span> <RichTextRenderer text={correctExplanation} />
                </div>
              </div>
            )}
            {wrongExplanation && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-700 dark:text-red-300">
                  <span className="font-medium">✗ Risposta errata:</span> <RichTextRenderer text={wrongExplanation} />
                </div>
              </div>
            )}
            {generalExplanation && (
              <div className={`p-3 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                <div className={`text-sm ${colors.text.secondary}`}>
                  <span className="font-medium">ℹ Generale:</span> <RichTextRenderer text={generalExplanation} />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
