'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import { previewSimulationPdf } from '@/lib/utils/simulationPdfGenerator';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { isStaff } from '@/lib/permissions';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Target,
  Settings,
  Search,
  Plus,
  X,
  Award,
  FileText,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Save,
  Eye,
  Send,
  Calendar,
  MapPin,
  Printer,
  Shield,
  ShieldX,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import type { SimulationType, LocationType } from '@/lib/validations/simulationValidation';
import { SIMULATION_PRESETS } from '@/lib/validations/simulationValidation';

// Step definitions (no assignments step - added post-creation)
const STEPS = [
  { id: 'type', title: 'Tipo', icon: FileText },
  { id: 'config', title: 'Configurazione', icon: Settings },
  { id: 'questions', title: 'Domande', icon: Target },
  { id: 'scheduling', title: 'Pianificazione', icon: Calendar },
  { id: 'review', title: 'Riepilogo', icon: Eye },
];

// Type options
const typeOptions: { value: SimulationType; label: string; description: string; icon: React.ReactNode; badge?: string }[] = [
  {
    value: 'OFFICIAL',
    label: 'Simulazione Ufficiale',
    description: 'Test con grafica TOLC, timer per sezione, anti-cheat attivo. Conta per la classifica.',
    icon: <Award className="w-6 h-6" />,
    badge: 'Ufficiale',
  },
  {
    value: 'PRACTICE',
    label: 'Esercitazione',
    description: 'Test di pratica. Gli studenti possono ripetere e vedere le risposte corrette.',
    icon: <BookOpen className="w-6 h-6" />,
  },
  {
    value: 'CUSTOM',
    label: 'Personalizzata',
    description: 'Configurazione completamente personalizzabile per ogni parametro.',
    icon: <Settings className="w-6 h-6" />,
  },
  {
    value: 'QUICK_QUIZ',
    label: 'Quiz Veloce',
    description: 'Quiz rapido con domande casuali. Ideale per ripasso veloce.',
    icon: <Zap className="w-6 h-6" />,
  },
];

// Paper-based option shown separately
const paperBasedOption = {
  label: 'Modalità Cartacea',
  description: 'Stampa il test per somministrazione in aula. I risultati vanno inseriti manualmente.',
  icon: <Printer className="w-6 h-6" />,
};

// Visibility options (kept for future visibility dropdown feature)
const _visibilityOptions = [
  { value: 'PRIVATE', label: 'Privata', description: 'Solo studenti assegnati' },
  { value: 'GROUP', label: 'Gruppo', description: 'Tutti gli studenti dei gruppi assegnati' },
  { value: 'PUBLIC', label: 'Pubblica', description: 'Tutti gli studenti attivi' },
];

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
    subject?: { name: string; color: string | null };
    topic?: { name: string };
  };
}

export default function NewSimulationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const _utils = trpc.useUtils();

  // Check authorization
  const userRole = user?.role;
  const hasAccess = userRole && isStaff(userRole);

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [simulationType, setSimulationType] = useState<SimulationType>('PRACTICE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  
  // Timing - dates are now set during assignment, not creation
  const [durationMinutes, setDurationMinutes] = useState(60);
  
  // Configuration
  const [showResults, setShowResults] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [allowReview, setAllowReview] = useState(true);
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);
  
  // Scoring
  const [useQuestionPoints, _setUseQuestionPoints] = useState(false);
  const [correctPoints, setCorrectPoints] = useState(1.5);
  const [wrongPoints, setWrongPoints] = useState(-0.4);
  const [blankPoints, setBlankPoints] = useState(0);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [passingScore, setPassingScore] = useState<number | null>(null);
  
  // Attempts
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  
  // Paper-based mode
  const [isPaperBased, setIsPaperBased] = useState(false);
  const [paperInstructions, setPaperInstructions] = useState('');
  
  // Attendance tracking
  const [trackAttendance, setTrackAttendance] = useState(false);
  const [locationType, setLocationType] = useState<LocationType | ''>('');
  const [locationDetails, setLocationDetails] = useState('');
  
  // Calendar integration
  const [isScheduled, setIsScheduled] = useState(false);
  
  // Anti-cheat settings
  const [enableAntiCheat, setEnableAntiCheat] = useState(false);
  const [forceFullscreen, setForceFullscreen] = useState(false);
  const [blockTabChange, setBlockTabChange] = useState(false);
  const [blockCopyPaste, setBlockCopyPaste] = useState(false);
  const [logSuspiciousEvents, setLogSuspiciousEvents] = useState(false);
  
  // Sections (for TOLC-style)
  const [hasSections, setHasSections] = useState(false);
  
  // Questions
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState('');
  const [questionTagFilter, setQuestionTagFilter] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'random'>('manual');
  const [randomCount, setRandomCount] = useState(10);
  
  // Question detail modal
  const [previewQuestion, setPreviewQuestion] = useState<string | null>(null);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Fetch data
  const { data: subjectsData } = trpc.questions.getSubjects.useQuery();
  const { data: tagCategoriesData } = trpc.questionTags.getCategories.useQuery({});

  // Questions query - include tag filter
  const { data: questionsData, isLoading: questionsLoading } = trpc.questions.getQuestions.useQuery({
    page: 1,
    pageSize: 100,
    search: questionSearchTerm || undefined,
    subjectId: questionSubjectFilter || undefined,
    difficulty: questionDifficultyFilter as 'EASY' | 'MEDIUM' | 'HARD' | undefined || undefined,
    status: 'PUBLISHED',
    tagIds: questionTagFilter.length > 0 ? questionTagFilter : undefined,
  });

  // Query for question detail (with answers)
  const { data: questionDetail } = trpc.questions.getQuestion.useQuery(
    previewQuestion ? { id: previewQuestion } : { id: '' },
    { enabled: !!previewQuestion }
  );

  // Mutations
  const createWithQuestionsMutation = trpc.simulations.createWithQuestions.useMutation({
    onSuccess: (simulation) => {
      showSuccess('Creata!', 'Simulazione creata con successo');
      router.push(`/simulazioni/${simulation.id}`);
    },
    onError: handleMutationError,
  });

  // Apply preset
  const applyPreset = (type: SimulationType) => {
    setSimulationType(type);
    
    // Reset paper-based mode when changing type
    setIsPaperBased(false);
    setPaperInstructions('');
    
    if (type === 'OFFICIAL') {
      const preset = SIMULATION_PRESETS.OFFICIAL_TOLC_MED;
      setIsOfficial(true);
      setDurationMinutes(preset.durationMinutes);
      setCorrectPoints(preset.correctPoints);
      setWrongPoints(preset.wrongPoints);
      setBlankPoints(preset.blankPoints);
      setRandomizeOrder(preset.randomizeOrder);
      setRandomizeAnswers(preset.randomizeAnswers);
      setShowResults(preset.showResults);
      setShowCorrectAnswers(preset.showCorrectAnswers);
      setAllowReview(preset.allowReview);
      setIsRepeatable(preset.isRepeatable);
      // Anti-cheat settings for official
      setEnableAntiCheat(preset.enableAntiCheat);
      setForceFullscreen(preset.forceFullscreen);
      setBlockTabChange(preset.blockTabChange);
      setBlockCopyPaste(preset.blockCopyPaste);
      setLogSuspiciousEvents(preset.logSuspiciousEvents);
      setHasSections(preset.hasSections);
    } else if (type === 'PRACTICE') {
      const preset = SIMULATION_PRESETS.PRACTICE_TEST;
      setIsOfficial(false);
      setDurationMinutes(preset.durationMinutes);
      setCorrectPoints(preset.correctPoints);
      setWrongPoints(preset.wrongPoints);
      setBlankPoints(preset.blankPoints);
      setRandomizeOrder(preset.randomizeOrder);
      setRandomizeAnswers(preset.randomizeAnswers);
      setShowResults(preset.showResults);
      setShowCorrectAnswers(preset.showCorrectAnswers);
      setAllowReview(preset.allowReview);
      setIsRepeatable(preset.isRepeatable);
      setMaxAttempts(preset.maxAttempts);
      // Disable anti-cheat for practice
      setEnableAntiCheat(false);
      setForceFullscreen(false);
      setBlockTabChange(false);
      setBlockCopyPaste(false);
      setLogSuspiciousEvents(false);
      setHasSections(false);
    } else if (type === 'QUICK_QUIZ') {
      const preset = SIMULATION_PRESETS.QUICK_QUIZ;
      setIsOfficial(false);
      setDurationMinutes(preset.durationMinutes);
      setCorrectPoints(preset.correctPoints);
      setWrongPoints(preset.wrongPoints);
      setBlankPoints(preset.blankPoints);
      setRandomizeOrder(preset.randomizeOrder);
      setRandomizeAnswers(preset.randomizeAnswers);
      setShowResults(preset.showResults);
      setShowCorrectAnswers(preset.showCorrectAnswers);
      setAllowReview(preset.allowReview);
      setIsRepeatable(preset.isRepeatable);
      // Disable anti-cheat for quick quiz
      setEnableAntiCheat(false);
      setForceFullscreen(false);
      setBlockTabChange(false);
      setBlockCopyPaste(false);
      setLogSuspiciousEvents(false);
      setHasSections(false);
    } else if (type === 'CUSTOM') {
      // Custom: reset to reasonable defaults
      setIsOfficial(false);
      setDurationMinutes(60);
      setCorrectPoints(1.0);
      setWrongPoints(0);
      setBlankPoints(0);
      setRandomizeOrder(false);
      setRandomizeAnswers(false);
      setShowResults(true);
      setShowCorrectAnswers(true);
      setAllowReview(true);
      setIsRepeatable(true);
      setMaxAttempts(null);
      setEnableAntiCheat(false);
      setForceFullscreen(false);
      setBlockTabChange(false);
      setBlockCopyPaste(false);
      setLogSuspiciousEvents(false);
      setHasSections(false);
    }
  };
  
  // Toggle paper-based mode
  const togglePaperBased = () => {
    const newValue = !isPaperBased;
    setIsPaperBased(newValue);
    if (newValue) {
      // Paper-based: disable anti-cheat, enable attendance tracking
      setEnableAntiCheat(false);
      setForceFullscreen(false);
      setBlockTabChange(false);
      setBlockCopyPaste(false);
      setLogSuspiciousEvents(false);
      setTrackAttendance(true);
      setLocationType('IN_PERSON');
    }
  };

  // Add question
  const addQuestion = (question: typeof questionsData.questions[0]) => {
    if (selectedQuestions.some(q => q.questionId === question.id)) return;
    
    setSelectedQuestions([
      ...selectedQuestions,
      {
        questionId: question.id,
        order: selectedQuestions.length,
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
  };

  // Add all filtered questions at once
  const addAllFilteredQuestions = (questions: typeof questionsData.questions) => {
    setSelectedQuestions(prev => {
      const newQuestions = questions.filter(q => !prev.some(sq => sq.questionId === q.id));
      return [
        ...prev,
        ...newQuestions.map((question, idx) => ({
          questionId: question.id,
          order: prev.length + idx,
          question: {
            id: question.id,
            text: question.text,
            type: question.type,
            difficulty: question.difficulty,
            subject: question.subject,
            topic: question.topic,
          },
        })),
      ];
    });
  };

  // Remove all filtered questions at once
  const removeAllFilteredQuestions = (questionIds: string[]) => {
    setSelectedQuestions(prev => 
      prev.filter(q => !questionIds.includes(q.questionId)).map((q, i) => ({ ...q, order: i }))
    );
  };

  // Remove question
  const removeQuestion = (questionId: string) => {
    setSelectedQuestions(prev => 
      prev.filter(q => q.questionId !== questionId).map((q, i) => ({ ...q, order: i }))
    );
  };

  // Move question
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...selectedQuestions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newQuestions.length) return;
    
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    newQuestions.forEach((q, i) => q.order = i);
    setSelectedQuestions(newQuestions);
  };

  // Add random questions from filtered results
  const addRandomQuestions = (count: number) => {
    if (!questionsData?.questions) return;
    
    // Filter out already selected questions
    const availableQuestions = questionsData.questions.filter(
      q => !selectedQuestions.some(sq => sq.questionId === q.id)
    );
    
    // Shuffle and take requested count
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const toAdd = shuffled.slice(0, count);
    
    const newQuestions = toAdd.map((question, idx) => ({
      questionId: question.id,
      order: selectedQuestions.length + idx,
      question: {
        id: question.id,
        text: question.text,
        type: question.type,
        difficulty: question.difficulty,
        subject: question.subject ? { name: question.subject.name, color: question.subject.color } : undefined,
        topic: question.topic ? { name: question.topic.name } : undefined,
      },
    }));
    
    setSelectedQuestions([...selectedQuestions, ...newQuestions]);
  };

  // Toggle tag filter
  const toggleTagFilter = (tagId: string) => {
    setQuestionTagFilter(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Fetch questions with answers utility (using refetch)
  const questionsWithAnswersQuery = trpc.questions.getQuestionsWithAnswers.useQuery(
    { questionIds: selectedQuestions.map(sq => sq.questionId) },
    { enabled: false } // Disabled by default, we'll call refetch manually
  );

  // Handle PDF preview - fetch complete question data with answers
  const handlePdfPreview = async () => {
    if (selectedQuestions.length === 0) {
      alert('Seleziona almeno una domanda per visualizzare l\'anteprima');
      return;
    }

    setIsPdfLoading(true);
    try {
      const result = await questionsWithAnswersQuery.refetch();
      
      if (result.data) {
        previewSimulationPdf({
          title: title || 'Simulazione',
          description,
          durationMinutes,
          correctPoints,
          wrongPoints,
          blankPoints,
          paperInstructions,
          schoolName: 'Leonardo School',
          questions: result.data.map(q => ({
            id: q.id,
            text: q.text,
            type: q.type,
            difficulty: q.difficulty,
            subject: q.subject,
            topic: q.topic,
            answers: q.answers.map(a => ({
              text: a.text,
              isCorrect: a.isCorrect,
              order: a.order,
            })),
          })),
        });
      }
    } catch (error) {
      console.error('Error loading questions for PDF:', error);
      alert('Errore nel caricamento delle domande. Riprova.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Validation (5 steps: type, config, questions, scheduling, review)
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Type
        return !!simulationType;
      case 1: // Config
        return !!title && durationMinutes >= 0;
      case 2: // Questions
        return selectedQuestions.length > 0;
      case 3: // Scheduling (calendar, attendance, location)
        // Scheduling step is optional - dates are now set during assignment
        // If tracking attendance and in-person, need location details
        if (trackAttendance && locationType === 'IN_PERSON' && !locationDetails) return false;
        return true;
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  // Submit
  const handleSubmit = async (_publishImmediately: boolean) => {
    setIsSaving(true);
    try {
      await createWithQuestionsMutation.mutateAsync({
        title,
        description: description || undefined,
        type: simulationType,
        visibility: 'PRIVATE', // Always private until published with assignments
        isOfficial,
        // startDate and endDate are now set during assignment
        startDate: undefined,
        endDate: undefined,
        durationMinutes,
        totalQuestions: selectedQuestions.length,
        showResults,
        showCorrectAnswers,
        allowReview,
        randomizeOrder,
        randomizeAnswers,
        useQuestionPoints,
        correctPoints,
        wrongPoints,
        blankPoints,
        maxScore,
        passingScore,
        isRepeatable,
        maxAttempts,
        isPublic: false,
        // New fields
        isPaperBased,
        paperInstructions: paperInstructions || undefined,
        trackAttendance,
        locationType: locationType || undefined,
        locationDetails: locationDetails || undefined,
        isScheduled,
        hasSections,
        enableAntiCheat,
        forceFullscreen,
        blockTabChange,
        blockCopyPaste,
        logSuspiciousEvents,
        questions: selectedQuestions.map(q => ({
          questionId: q.questionId,
          order: q.order,
          customPoints: q.customPoints,
          customNegativePoints: q.customNegativePoints,
        })),
        assignments: [], // Assignments added post-creation
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
              Seleziona il tipo di simulazione
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => applyPreset(option.value)}
                  className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                    simulationType === option.value && !isPaperBased
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : `border-gray-200 dark:border-gray-700 ${colors.background.hover}`
                  }`}
                >
                  {option.badge && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                      {option.badge}
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    simulationType === option.value && !isPaperBased
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {option.icon}
                  </div>
                  <h3 className={`font-semibold ${colors.text.primary}`}>{option.label}</h3>
                  <p className={`mt-1 text-sm ${colors.text.muted}`}>{option.description}</p>
                </button>
              ))}
            </div>
            
            {/* Paper-based option */}
            <div className={`mt-6 p-4 rounded-xl border-2 ${
              isPaperBased 
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                : `border-dashed border-gray-300 dark:border-gray-600`
            }`}>
              <div className="flex items-start gap-4">
                <button
                  onClick={togglePaperBased}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                    isPaperBased
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  <Printer className="w-6 h-6" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${colors.text.primary}`}>{paperBasedOption.label}</h3>
                    <Checkbox
                      id="isPaperBased"
                      checked={isPaperBased}
                      onChange={togglePaperBased}
                    />
                  </div>
                  <p className={`mt-1 text-sm ${colors.text.muted}`}>{paperBasedOption.description}</p>
                </div>
              </div>
              {isPaperBased && (
                <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Istruzioni per la somministrazione (opzionale)
                  </label>
                  <textarea
                    value={paperInstructions}
                    onChange={(e) => setPaperInstructions(e.target.value)}
                    rows={2}
                    placeholder="Es: Distribuire i fogli a faccia in giù, dare 5 minuti extra per la compilazione anagrafica..."
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary} text-sm`}
                  />
                </div>
              )}
            </div>
            
            {/* Anti-cheat info for official simulations */}
            {simulationType === 'OFFICIAL' && !isPaperBased && (
              <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <h4 className={`font-medium ${colors.text.primary}`}>Protezione anti-cheat attiva</h4>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>
                      Modalità fullscreen forzata, blocco cambio tab, blocco copia/incolla. 
                      Gli eventi sospetti vengono registrati.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
              Configurazione simulazione
            </h2>

            {/* Basic info */}
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${colors.text.primary}`}>Informazioni base</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Titolo *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Es: Simulazione TOLC-MED Gennaio 2025"
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Descrizione
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Descrizione opzionale..."
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${colors.text.primary}`}>Durata</h3>
              
              {/* Info banner about date selection at assignment */}
              <div className={`p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className={`text-sm text-blue-700 dark:text-blue-300`}>
                    <p className="font-medium">La data si sceglie al momento dell&apos;assegnazione</p>
                    <p className="mt-1 opacity-80">
                      Quando assegnerai questa simulazione a studenti, gruppi o classi, potrai specificare la data e l&apos;orario di svolgimento.
                      {simulationType === 'OFFICIAL' 
                        ? ' Per le simulazioni ufficiali sceglierai data e ora di inizio specifici.'
                        : ' Potrai scegliere tra una data singola o una finestra temporale.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duration field only */}
              <div className="max-w-xs">
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                  Durata (minuti) {simulationType !== 'OFFICIAL' && <span className={colors.text.muted}>(0 = illimitata)</span>}
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  min={simulationType === 'OFFICIAL' ? 1 : 0}
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                />
                {durationMinutes > 0 && (
                  <p className={`text-xs ${colors.text.muted} mt-1`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {Math.floor(durationMinutes / 60) > 0 && `${Math.floor(durationMinutes / 60)} ore `}
                    {durationMinutes % 60 > 0 && `${durationMinutes % 60} minuti`}
                  </p>
                )}
              </div>
            </div>

            {/* Scoring */}
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${colors.text.primary}`}>Punteggi</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Risposta corretta
                  </label>
                  <input
                    type="number"
                    value={correctPoints}
                    onChange={(e) => setCorrectPoints(parseFloat(e.target.value) || 0)}
                    step={0.1}
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Risposta errata
                  </label>
                  <input
                    type="number"
                    value={wrongPoints}
                    onChange={(e) => setWrongPoints(parseFloat(e.target.value) || 0)}
                    step={0.1}
                    max={0}
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Non risposta
                  </label>
                  <input
                    type="number"
                    value={blankPoints}
                    onChange={(e) => setBlankPoints(parseFloat(e.target.value) || 0)}
                    step={0.1}
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Punteggio massimo (opzionale)
                  </label>
                  <input
                    type="number"
                    value={maxScore ?? ''}
                    onChange={(e) => setMaxScore(e.target.value ? parseFloat(e.target.value) : null)}
                    step={0.1}
                    placeholder="Calcolato automaticamente"
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Punteggio minimo per passare
                  </label>
                  <input
                    type="number"
                    value={passingScore ?? ''}
                    onChange={(e) => setPassingScore(e.target.value ? parseFloat(e.target.value) : null)}
                    step={0.1}
                    placeholder="Nessuna soglia"
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${colors.text.primary}`}>Opzioni</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'showResults', label: 'Mostra risultati', checked: showResults, onChange: setShowResults },
                  { id: 'showCorrectAnswers', label: 'Mostra risposte corrette', checked: showCorrectAnswers, onChange: setShowCorrectAnswers },
                  { id: 'allowReview', label: 'Permetti revisione', checked: allowReview, onChange: setAllowReview },
                  { id: 'randomizeOrder', label: 'Ordine casuale domande', checked: randomizeOrder, onChange: setRandomizeOrder },
                  { id: 'randomizeAnswers', label: 'Ordine casuale risposte', checked: randomizeAnswers, onChange: setRandomizeAnswers },
                  { id: 'isRepeatable', label: 'Ripetibile', checked: isRepeatable, onChange: setIsRepeatable },
                ].map(({ id, label, checked, onChange }) => (
                  <Checkbox
                    key={id}
                    id={id}
                    label={label}
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                  />
                ))}
              </div>
              {isRepeatable && (
                <div className="max-w-xs">
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Numero massimo tentativi
                  </label>
                  <input
                    type="number"
                    value={maxAttempts ?? ''}
                    onChange={(e) => setMaxAttempts(e.target.value ? parseInt(e.target.value) : null)}
                    min={1}
                    placeholder="Illimitati"
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
              )}
            </div>

            {/* Anti-cheat settings (only for online simulations) */}
            {!isPaperBased && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className={`text-lg font-medium ${colors.text.primary}`}>Protezione Anti-Cheat</h3>
                </div>
                <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <Checkbox
                      id="enableAntiCheat"
                      checked={enableAntiCheat}
                      onChange={(e) => setEnableAntiCheat(e.target.checked)}
                    />
                    <div className="flex-1">
                      <label htmlFor="enableAntiCheat" className={`font-medium ${colors.text.primary} cursor-pointer`}>
                        Abilita protezione anti-cheat
                      </label>
                      <p className={`text-sm ${colors.text.muted} mt-1`}>
                        Attiva le misure di sicurezza per prevenire comportamenti scorretti durante la simulazione
                      </p>
                    </div>
                  </div>
                  
                  {enableAntiCheat && (
                    <div className="ml-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      <Checkbox
                        id="forceFullscreen"
                        label="Forza modalità fullscreen"
                        checked={forceFullscreen}
                        onChange={(e) => setForceFullscreen(e.target.checked)}
                      />
                      <Checkbox
                        id="blockTabChange"
                        label="Blocca cambio scheda"
                        checked={blockTabChange}
                        onChange={(e) => setBlockTabChange(e.target.checked)}
                      />
                      <Checkbox
                        id="blockCopyPaste"
                        label="Blocca copia/incolla"
                        checked={blockCopyPaste}
                        onChange={(e) => setBlockCopyPaste(e.target.checked)}
                      />
                      <Checkbox
                        id="logSuspiciousEvents"
                        label="Registra eventi sospetti"
                        checked={logSuspiciousEvents}
                        onChange={(e) => setLogSuspiciousEvents(e.target.checked)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sections toggle */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className={`text-lg font-medium ${colors.text.primary}`}>Sezioni (TOLC-style)</h3>
              </div>
              <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="hasSections"
                    checked={hasSections}
                    onChange={(e) => setHasSections(e.target.checked)}
                  />
                  <div className="flex-1">
                    <label htmlFor="hasSections" className={`font-medium ${colors.text.primary} cursor-pointer`}>
                      Organizza in sezioni separate
                    </label>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>
                      Dividi la simulazione in sezioni con tempi e domande specifiche (es. Comprensione del testo, Biologia, Chimica...)
                    </p>
                    {hasSections && (
                      <p className={`text-xs ${colors.text.muted} mt-2 italic`}>
                        Le sezioni verranno configurate nel passo successivo insieme alle domande.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                Seleziona le domande ({selectedQuestions.length} selezionate)
              </h2>
              
              {/* Selection mode toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectionMode('manual')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectionMode === 'manual' 
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                      : `${colors.background.secondary} ${colors.text.muted}`
                  }`}
                >
                  Manuale
                </button>
                <button
                  onClick={() => setSelectionMode('random')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectionMode === 'random' 
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                      : `${colors.background.secondary} ${colors.text.muted}`
                  }`}
                >
                  Casuale
                </button>
              </div>
            </div>

            {/* Random selection panel */}
            {selectionMode === 'random' && (
              <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className={`text-sm font-medium ${colors.text.secondary}`}>
                      Aggiungi
                    </label>
                    <input
                      type="number"
                      value={randomCount}
                      onChange={(e) => setRandomCount(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      max={50}
                      className={`w-20 px-3 py-1.5 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary} text-sm text-center`}
                    />
                    <label className={`text-sm font-medium ${colors.text.secondary}`}>
                      domande casuali dai filtri attivi
                    </label>
                  </div>
                  <button
                    onClick={() => addRandomQuestions(randomCount)}
                    disabled={!questionsData?.questions.length}
                    className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Aggiungi
                  </button>
                </div>
                <p className={`text-xs ${colors.text.muted} mt-2`}>
                  Le domande saranno selezionate casualmente tra quelle che corrispondono ai filtri (materia, difficoltà, tag).
                </p>
              </div>
            )}

            {/* Tag filters */}
            {tagCategoriesData && tagCategoriesData.length > 0 && (
              <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                <h4 className={`text-sm font-medium ${colors.text.primary} mb-3`}>Filtra per Tag</h4>
                <div className="space-y-3">
                  {tagCategoriesData.map((category) => (
                    <div key={category.id}>
                      <p className={`text-xs ${colors.text.muted} mb-1.5`}>{category.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {category.tags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTagFilter(tag.id)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              questionTagFilter.includes(tag.id)
                                ? 'ring-2 ring-offset-1 ring-red-500'
                                : ''
                            }`}
                            style={{ 
                              backgroundColor: (tag.color || '#6B7280') + '20', 
                              color: tag.color || '#6B7280' 
                            }}
                          >
                            {tag.name}
                            {tag._count?.questions !== undefined && (
                              <span className="ml-1 opacity-60">({tag._count.questions})</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {questionTagFilter.length > 0 && (
                  <button
                    onClick={() => setQuestionTagFilter([])}
                    className={`mt-3 text-xs ${colors.text.muted} hover:text-red-500 underline`}
                  >
                    Rimuovi tutti i filtri tag
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available questions */}
              <div className={`rounded-xl border ${colors.border.light} overflow-hidden flex flex-col max-h-[500px]`}>
                <div className={`p-4 ${colors.background.secondary} border-b ${colors.border.light} flex-shrink-0`}>
                  <h3 className={`font-medium ${colors.text.primary} mb-3`}>
                    Domande disponibili {questionsData?.pagination?.total !== undefined && `(${questionsData.pagination.total})`}
                  </h3>
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
                    {/* Select/Deselect all filtered questions */}
                    {questionsData && questionsData.questions.length > 0 && (
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => addAllFilteredQuestions(questionsData.questions)}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border ${colors.border.light} ${colors.text.secondary} hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:border-green-700 dark:hover:text-green-400 transition-colors`}
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          Seleziona tutte ({questionsData.questions.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAllFilteredQuestions(questionsData.questions.map(q => q.id))}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border ${colors.border.light} ${colors.text.secondary} hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors`}
                        >
                          <X className="w-3 h-3 inline mr-1" />
                          Deseleziona tutte
                        </button>
                      </div>
                    )}
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
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {questionsData?.questions.map((question) => {
                        const isSelected = selectedQuestions.some(q => q.questionId === question.id);
                        const difficultyLabel = question.difficulty === 'EASY' ? 'Facile' : question.difficulty === 'MEDIUM' ? 'Media' : question.difficulty === 'HARD' ? 'Difficile' : question.difficulty;
                        const difficultyColor = question.difficulty === 'EASY' ? 'text-green-600 dark:text-green-400' : question.difficulty === 'MEDIUM' ? 'text-yellow-600 dark:text-yellow-400' : question.difficulty === 'HARD' ? 'text-red-600 dark:text-red-400' : colors.text.muted;
                        return (
                          <div
                            key={question.id}
                            className={`p-3 flex items-start gap-3 ${isSelected ? 'bg-green-50 dark:bg-green-900/20' : colors.background.hover}`}
                          >
                            <button
                              onClick={() => isSelected ? removeQuestion(question.id) : addQuestion(question)}
                              className={`mt-1 p-1 rounded ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                              {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${colors.text.primary} line-clamp-2`}>
                                {question.text.replace(/<[^>]*>/g, '')}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {question.subject && (
                                  <span 
                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                    style={{ 
                                      backgroundColor: (question.subject.color || '#6b7280') + 'd9', 
                                      color: 'white'
                                    }}
                                  >
                                    {question.subject.name}
                                  </span>
                                )}
                                <span className={`text-xs font-medium ${difficultyColor}`}>{difficultyLabel}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setPreviewQuestion(question.id)}
                              className={`p-1.5 rounded-lg ${colors.text.muted} hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-500`}
                              title="Visualizza dettagli"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected questions */}
              <div className={`rounded-xl border ${colors.border.light} overflow-hidden flex flex-col max-h-[500px]`}>
                <div className={`p-4 ${colors.background.secondary} border-b ${colors.border.light} flex-shrink-0`}>
                  <h3 className={`font-medium ${colors.text.primary}`}>
                    Domande selezionate ({selectedQuestions.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {selectedQuestions.length === 0 ? (
                    <div className="p-8 text-center">
                      <Target className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className={colors.text.muted}>Nessuna domanda selezionata</p>
                      <p className={`text-sm ${colors.text.muted}`}>Aggiungi domande dalla lista a sinistra</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedQuestions.map((sq, index) => (
                        <div key={sq.questionId} className={`p-3 flex items-start gap-3 ${colors.background.card}`}>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveQuestion(index, 'up')}
                              disabled={index === 0}
                              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 ${colors.text.secondary}`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveQuestion(index, 'down')}
                              disabled={index === selectedQuestions.length - 1}
                              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 ${colors.text.secondary}`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          <span className={`mt-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ${colors.text.primary}`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${colors.text.primary} line-clamp-2`}>
                              {sq.question?.text?.replace(/<[^>]*>/g, '') || 'Domanda'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {sq.question?.subject && (
                                <span 
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{ 
                                    backgroundColor: (sq.question.subject.color || '#6b7280') + 'd9', 
                                    color: 'white'
                                  }}
                                >
                                  {sq.question.subject.name}
                                </span>
                              )}
                              {sq.question?.difficulty && (
                                <span className={`text-xs font-medium ${
                                  sq.question.difficulty === 'EASY' ? 'text-green-600 dark:text-green-400' : 
                                  sq.question.difficulty === 'MEDIUM' ? 'text-yellow-600 dark:text-yellow-400' : 
                                  sq.question.difficulty === 'HARD' ? 'text-red-600 dark:text-red-400' : colors.text.muted
                                }`}>
                                  {sq.question.difficulty === 'EASY' ? 'Facile' : sq.question.difficulty === 'MEDIUM' ? 'Media' : sq.question.difficulty === 'HARD' ? 'Difficile' : sq.question.difficulty}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setPreviewQuestion(sq.questionId)}
                            className={`p-1.5 rounded-lg ${colors.text.muted} hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-500`}
                            title="Visualizza dettagli"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeQuestion(sq.questionId)}
                            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Scheduling step
        return (
          <div className="space-y-8">
            <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
              Programmazione e Logistica
            </h2>

            {/* Scheduled event toggle */}
            <div className={`p-4 rounded-xl ${isScheduled ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' : `${colors.background.secondary} border ${colors.border.light}`}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isScheduled ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isScheduled"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                    />
                    <label htmlFor="isScheduled" className={`font-medium ${colors.text.primary} cursor-pointer`}>
                      Evento programmato
                    </label>
                  </div>
                  <p className={`text-sm ${colors.text.muted} mt-1`}>
                    Crea un evento nel calendario associato a questa simulazione
                  </p>
                </div>
              </div>
            </div>

            {/* Duration info */}
            <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <h4 className={`font-medium ${colors.text.primary}`}>Durata simulazione</h4>
                  <p className={`text-sm ${colors.text.muted} mt-1`}>
                    {durationMinutes > 0 ? (
                      <>
                        <strong>{Math.floor(durationMinutes / 60) > 0 && `${Math.floor(durationMinutes / 60)} ore `}{durationMinutes % 60 > 0 && `${durationMinutes % 60} minuti`}</strong>
                      </>
                    ) : (
                      <strong>Tempo illimitato</strong>
                    )}
                  </p>
                  <p className={`text-xs ${colors.text.muted} mt-2`}>
                    La data e l&apos;orario di svolgimento verranno definiti al momento dell&apos;assegnazione.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4: // Review step
        return (
          <div className="space-y-6">
            <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
              Riepilogo simulazione
            </h2>
            <p className={`text-sm ${colors.text.muted}`}>
              Dopo la creazione potrai assegnare la simulazione a studenti, gruppi o classi dalla pagina di dettaglio.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic info */}
              <div className={`p-6 rounded-xl ${colors.background.secondary}`}>
                <h3 className={`font-medium ${colors.text.primary} mb-4`}>Informazioni</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Titolo</dt>
                    <dd className={`font-medium ${colors.text.primary}`}>{title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Tipo</dt>
                    <dd className={`font-medium ${colors.text.primary}`}>
                      {typeOptions.find(t => t.value === simulationType)?.label}
                      {isPaperBased && ' (Cartacea)'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Domande</dt>
                    <dd className={`font-medium ${colors.text.primary}`}>{selectedQuestions.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Durata</dt>
                    <dd className={`font-medium ${colors.text.primary}`}>
                      {durationMinutes > 0 ? `${durationMinutes} minuti` : 'Illimitata'}
                    </dd>
                  </div>
                  {hasSections && (
                    <div className="flex justify-between">
                      <dt className={colors.text.muted}>Sezioni</dt>
                      <dd className={`font-medium text-blue-600 dark:text-blue-400`}>Attive</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Scoring */}
              <div className={`p-6 rounded-xl ${colors.background.secondary}`}>
                <h3 className={`font-medium ${colors.text.primary} mb-4`}>Punteggi</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Risposta corretta</dt>
                    <dd className={`font-medium text-green-600`}>+{correctPoints}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Risposta errata</dt>
                    <dd className={`font-medium text-red-600`}>{wrongPoints}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Non risposta</dt>
                    <dd className={`font-medium ${colors.text.primary}`}>{blankPoints}</dd>
                  </div>
                  {passingScore && (
                    <div className="flex justify-between">
                      <dt className={colors.text.muted}>Soglia superamento</dt>
                      <dd className={`font-medium ${colors.text.primary}`}>{passingScore}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Security & Mode */}
              <div className={`p-6 rounded-xl ${colors.background.secondary}`}>
                <h3 className={`font-medium ${colors.text.primary} mb-4`}>Modalità e Sicurezza</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Modalità Cartacea</dt>
                    <dd className={`font-medium ${colors.text.primary}`}>
                      {isPaperBased ? (
                        <span className="flex items-center gap-1">
                          <Printer className="w-4 h-4" /> Si
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          No
                        </span>
                      )}
                    </dd>
                  </div>
                  {!isPaperBased && (
                    <div className="flex justify-between">
                      <dt className={colors.text.muted}>Anti-cheat</dt>
                      <dd className={`font-medium ${enableAntiCheat ? 'text-green-600 dark:text-green-400' : colors.text.muted}`}>
                        {enableAntiCheat ? (
                          <span className="flex items-center gap-1">
                            <Shield className="w-4 h-4" /> Attivo
                          </span>
                        ) : 'Disattivato'}
                      </dd>
                    </div>
                  )}
                  {isScheduled && (
                    <div className="flex justify-between">
                      <dt className={colors.text.muted}>Evento calendario</dt>
                      <dd className={`font-medium text-blue-600 dark:text-blue-400`}>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Programmato
                        </span>
                      </dd>
                    </div>
                  )}
                  {trackAttendance && (
                    <div className="flex justify-between">
                      <dt className={colors.text.muted}>Presenze</dt>
                      <dd className={`font-medium text-green-600 dark:text-green-400`}>Tracciate</dd>
                    </div>
                  )}
                  {locationType && (
                    <div className="flex justify-between">
                      <dt className={colors.text.muted}>Luogo</dt>
                      <dd className={`font-medium ${colors.text.primary}`}>
                        {locationType === 'IN_PERSON' ? '🏢 In presenza' : locationType === 'ONLINE' ? '💻 Online' : '🔄 Ibrida'}
                        {locationDetails && ` - ${locationDetails}`}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Paper-based preview button */}
            {isPaperBased && (
              <div className={`mt-6 p-6 rounded-xl border-2 border-dashed ${colors.border.light} text-center`}>
                <Printer className={`w-12 h-12 mx-auto ${colors.text.muted} mb-3`} />
                <h3 className={`font-medium ${colors.text.primary} mb-2`}>Anteprima Stampa</h3>
                <p className={`text-sm ${colors.text.muted} mb-4`}>
                  Visualizza come apparirà il test stampato prima di crearlo
                </p>
                <button
                  type="button"
                  onClick={handlePdfPreview}
                  disabled={selectedQuestions.length === 0 || isPdfLoading}
                  className={`px-4 py-2 ${colors.background.secondary} border ${colors.border.light} rounded-lg text-sm font-medium ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPdfLoading ? (
                    <>
                      <Spinner size="xs" variant="muted" className="inline mr-2" />
                      Caricamento...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 inline mr-2" />
                      Visualizza anteprima PDF
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Authorization check
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldX className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>Accesso negato</h2>
          <p className={colors.text.muted}>Non hai i permessi per creare simulazioni.</p>
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/simulazioni"
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle simulazioni
        </Link>
        <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Nuova Simulazione</h1>
      </div>

      {/* Steps indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => isCompleted && setCurrentStep(index)}
                  disabled={!isCompleted}
                  className={`flex flex-col items-center gap-2 ${isCompleted ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${isCurrent ? colors.text.primary : colors.text.muted}`}>
                    {step.title}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className={`max-w-5xl mx-auto rounded-xl p-6 md:p-8 ${colors.background.card} border ${colors.border.light}`}>
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="max-w-5xl mx-auto mt-6 flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </button>

        <div className="flex items-center gap-3">
          {currentStep === STEPS.length - 1 ? (
            <>
              <button
                onClick={() => handleSubmit(false)}
                disabled={!isStepValid(currentStep) || isSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
              >
                <Save className="w-4 h-4" />
                Salva come bozza
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={!isStepValid(currentStep) || isSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? <Spinner size="sm" variant="white" /> : <Send className="w-4 h-4" />}
                Crea Simulazione
              </button>
            </>
          ) : (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!isStepValid(currentStep)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Avanti
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question Preview Modal */}
      {previewQuestion && questionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPreviewQuestion(null)}>
          <div 
            className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl ${colors.background.card} shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${colors.border.light} flex items-center justify-between`}>
              <h3 className={`font-semibold ${colors.text.primary}`}>Anteprima Domanda</h3>
              <button
                onClick={() => setPreviewQuestion(null)}
                className={`p-1 rounded-lg ${colors.text.muted} hover:bg-gray-100 dark:hover:bg-gray-800`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Question metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                {questionDetail.subject && (
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: questionDetail.subject.color || '#6b7280' }}
                  >
                    {questionDetail.subject.name}
                  </span>
                )}
                {questionDetail.topic && (
                  <span className={`px-2 py-1 rounded text-xs ${colors.background.secondary} ${colors.text.secondary}`}>
                    {questionDetail.topic.name}
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  questionDetail.difficulty === 'EASY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  questionDetail.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {questionDetail.difficulty === 'EASY' ? 'Facile' : questionDetail.difficulty === 'MEDIUM' ? 'Media' : 'Difficile'}
                </span>
              </div>

              {/* Question text */}
              <div 
                className={`prose dark:prose-invert max-w-none ${colors.text.primary}`}
                dangerouslySetInnerHTML={{ __html: questionDetail.text }}
              />

              {/* Answers */}
              <div className="space-y-2 mt-4">
                <h4 className={`font-medium ${colors.text.primary}`}>Risposte:</h4>
                {questionDetail.answers?.map((answer, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      answer.isCorrect 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : `${colors.border.light} ${colors.background.secondary}`
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`font-medium ${answer.isCorrect ? 'text-green-600 dark:text-green-400' : colors.text.secondary}`}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <div 
                        className={answer.isCorrect ? 'text-green-700 dark:text-green-300' : colors.text.primary}
                        dangerouslySetInnerHTML={{ __html: answer.text }}
                      />
                      {answer.isCorrect && (
                        <Check className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
