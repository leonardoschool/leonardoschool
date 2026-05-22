'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { firebaseStorage } from '@/lib/firebase/storage';
import {
  validateQuestionAnswers,
  validateQuestionKeywords,
  type QuestionType,
  type QuestionLanguage,
  type QuestionStatus,
  type DifficultyLevel,
  type OpenAnswerValidationType,
  type QuestionAnswerInput,
  type QuestionKeywordInput,
} from '@/lib/validations/questionValidation';

export interface QuestionFormInitialData {
  type: QuestionType;
  status: QuestionStatus;
  text: string;
  textLatex?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  language?: QuestionLanguage | null;
  subjectId?: string | null;
  topicId?: string | null;
  difficulty: DifficultyLevel;
  timeLimitSeconds?: number | null;
  correctExplanation?: string | null;
  wrongExplanation?: string | null;
  generalExplanation?: string | null;
  shuffleAnswers: boolean;
  openValidationType?: OpenAnswerValidationType | null;
  openMinLength?: number | null;
  openMaxLength?: number | null;
  tagIds?: string[];
  year?: number | null;
  source?: string | null;
  answers: QuestionAnswerInput[];
  keywords: QuestionKeywordInput[];
}

interface UseQuestionFormOptions {
  questionId?: string;
  basePath?: string;
  initialData?: QuestionFormInitialData;
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

export function useQuestionForm({ questionId, basePath = '/domande', initialData }: UseQuestionFormOptions) {
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
  const [language, setLanguage] = useState<QuestionLanguage>(initialData?.language ?? 'IT');
  const [subjectId, setSubjectId] = useState(initialData?.subjectId ?? '');
  const [topicId, setTopicId] = useState(initialData?.topicId ?? '');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialData?.difficulty ?? 'MEDIUM');
  const [timeLimitSeconds] = useState<number | ''>(initialData?.timeLimitSeconds ?? '');

  // Image upload state
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Internal ref — keeps tag IDs stable across async mutation callbacks
  const selectedTagIdsRef = useRef<string[]>(initialData?.tagIds ?? []);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showFormulaHelper, setShowFormulaHelper] = useState(false);
  const [showFormattingInfo, setShowFormattingInfo] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Explanation state
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

  // Answers & keywords
  const [answers, setAnswers] = useState<QuestionAnswerInput[]>(
    initialData?.answers?.length
      ? initialData.answers
      : [
          { ...defaultAnswer, label: 'A', order: 0 },
          { ...defaultAnswer, label: 'B', order: 1 },
          { ...defaultAnswer, label: 'C', order: 2 },
          { ...defaultAnswer, label: 'D', order: 3 },
          { ...defaultAnswer, label: 'E', order: 4 },
        ]
  );
  const [keywords, setKeywords] = useState<QuestionKeywordInput[]>(initialData?.keywords ?? []);
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    selectedTagIdsRef.current = selectedTagIds;
  }, [selectedTagIds]);

  // Queries
  const { data: subjects } = trpc.materials.getAllSubjects.useQuery();
  const { data: topicsData } = trpc.materials.getTopics.useQuery(
    { subjectId: subjectId || '', includeInactive: false },
    { enabled: !!subjectId }
  );
  const { data: keywordSuggestions, isFetching: fetchingSuggestions } =
    trpc.questions.suggestKeywords.useQuery(
      { questionText: text, currentKeywords: keywords.map((k) => k.keyword) },
      { enabled: showKeywordSuggestions && text.length >= 10 && type === 'OPEN_TEXT' }
    );

  // Mutations
  const replaceTagsMutation = trpc.questionTags.replaceQuestionTags.useMutation({
    onError: handleMutationError,
  });

  const createMutation = trpc.questions.createQuestion.useMutation({
    onSuccess: async (data) => {
      const currentTagIds = selectedTagIdsRef.current;
      if (data?.id && currentTagIds.length > 0) {
        try {
          await replaceTagsMutation.mutateAsync({ questionId: data.id, tagIds: currentTagIds });
        } catch (error) {
          console.error('Failed to assign tags:', error);
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
      const currentTagIds = selectedTagIdsRef.current;
      if (questionId) {
        try {
          await replaceTagsMutation.mutateAsync({ questionId, tagIds: currentTagIds });
        } catch (error) {
          console.error('Failed to update tags:', error);
        }
      }
      showSuccess('Domanda aggiornata', 'Le modifiche sono state salvate.');
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestion.invalidate({ id: questionId });
      router.push(`${basePath}/${questionId}`);
    },
    onError: handleMutationError,
  });

  // Computed
  const topics = useMemo(() => topicsData ?? [], [topicsData]);
  const subjectOptions = useMemo(
    () => [
      { value: '', label: 'Seleziona materia' },
      ...(subjects?.map((s) => ({ value: s.id, label: s.name })) ?? [])
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    ],
    [subjects]
  );
  const topicOptions = useMemo(
    () => [
      { value: '', label: 'Seleziona argomento' },
      ...topics
        .map((t) => ({ value: t.id, label: t.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    ],
    [topics]
  );
  const isLoading = createMutation.isPending || updateMutation.isPending || uploadingImage;
  const currentImageUrl = imageMode === 'url' ? imageUrl : imagePreviewUrl;

  // Handlers
  const insertSymbolIntoTextarea = useCallback(
    (
      ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
      value: string,
      setValue: (v: string) => void,
      symbol: string
    ) => {
      const el = ref.current;
      if (!el) { setValue(value + symbol); return; }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? start;
      const newValue = value.substring(0, start) + symbol + value.substring(end);
      setValue(newValue);
      const newPos = start + symbol.length;
      setTimeout(() => { el.focus(); el.setSelectionRange(newPos, newPos); }, 0);
    },
    []
  );

  const addAnswer = useCallback(() => {
    const nextLabel = String.fromCharCode(65 + answers.length);
    setAnswers([...answers, { ...defaultAnswer, label: nextLabel, order: answers.length }]);
  }, [answers]);

  const removeAnswer = useCallback(
    (index: number) => {
      if (answers.length <= 2) { showError('Errore', 'Devi avere almeno 2 risposte.'); return; }
      const newAnswers = answers.filter((_, i) => i !== index);
      setAnswers(newAnswers.map((a, i) => ({ ...a, label: String.fromCharCode(65 + i), order: i })));
    },
    [answers, showError]
  );

  const updateAnswer = useCallback(
    (index: number, field: keyof QuestionAnswerInput, value: unknown) => {
      setAnswers((prev) =>
        prev.map((a, i) => {
          if (i !== index) {
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
    (index: number) => { setKeywords(keywords.filter((_, i) => i !== index)); },
    [keywords]
  );

  const updateKeyword = useCallback(
    (index: number, field: keyof QuestionKeywordInput, value: unknown) => {
      setKeywords((prev) => prev.map((k, i) => (i === index ? { ...k, [field]: value } : k)));
    },
    []
  );

  const addSuggestedKeyword = useCallback(
    (suggestion: { keyword: string }) => {
      if (!keywords.some((k) => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase())) {
        setKeywords([...keywords, { ...defaultKeyword, keyword: suggestion.keyword, isSuggested: true }]);
      }
    },
    [keywords]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!text.trim()) newErrors.text = 'Il testo della domanda è obbligatorio.';
    if (type !== 'OPEN_TEXT') {
      const result = validateQuestionAnswers(type, answers);
      if (!result.valid) newErrors.answers = result.error!;
    }
    if (type === 'OPEN_TEXT' && openValidationType) {
      const result = validateQuestionKeywords(type, openValidationType, keywords);
      if (!result.valid) newErrors.keywords = result.error!;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [text, type, answers, keywords, openValidationType]);

  const handleSubmit = useCallback(
    async (saveStatus: QuestionStatus) => {
      if (!validate()) { showError('Errore di validazione', 'Correggi gli errori nel form.'); return; }

      let finalImageUrl = imageUrl || null;
      if (imageFile && imageMode === 'upload') {
        try {
          setUploadingImage(true);
          const result = await firebaseStorage.uploadQuestionImage(imageFile);
          finalImageUrl = result.url;
        } catch (error) {
          console.error('Error uploading image:', error);
          showError('Errore', "Errore durante il caricamento dell'immagine.");
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
        difficulty,
        points: 1,
        negativePoints: 0,
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
        tags: [],
        year: year ? Number(year) : null,
        source: source || null,
        language,
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
      validate, showError, type, text, textLatex, description, imageUrl, imageFile, imageMode,
      subjectId, topicId, difficulty, timeLimitSeconds, correctExplanation, wrongExplanation,
      generalExplanation, shuffleAnswers, openValidationType, openMinLength, openMaxLength,
      answers, keywords, year, source, language, questionId, createMutation, updateMutation,
    ]
  );

  return {
    // State
    type, setType,
    _status,
    text, setText,
    textLatex, setTextLatex,
    description, setDescription,
    imageUrl, setImageUrl,
    language, setLanguage,
    subjectId, setSubjectId,
    topicId, setTopicId,
    difficulty, setDifficulty,
    imageMode, setImageMode,
    imageFile, setImageFile,
    imagePreviewUrl, setImagePreviewUrl,
    showPreview, setShowPreview,
    showFormulaHelper, setShowFormulaHelper,
    showFormattingInfo, setShowFormattingInfo,
    showAdvanced, setShowAdvanced,
    errors,
    correctExplanation, setCorrectExplanation,
    wrongExplanation, setWrongExplanation,
    generalExplanation, setGeneralExplanation,
    shuffleAnswers, setShuffleAnswers,
    openValidationType, setOpenValidationType,
    openMinLength, setOpenMinLength,
    openMaxLength, setOpenMaxLength,
    year, setYear,
    source, setSource,
    selectedTagIds, setSelectedTagIds,
    answers, keywords,
    showKeywordSuggestions, setShowKeywordSuggestions,
    // Queries
    subjects, keywordSuggestions, fetchingSuggestions,
    // Computed
    subjectOptions, topicOptions, isLoading, currentImageUrl,
    // Handlers
    insertSymbolIntoTextarea, addAnswer, removeAnswer, updateAnswer,
    addKeyword, removeKeyword, updateKeyword, addSuggestedKeyword, handleSubmit,
    // Router
    goBack: () => router.back(),
  };
}
