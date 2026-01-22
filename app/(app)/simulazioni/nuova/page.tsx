'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import { Modal } from '@/components/ui/Modal';
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
  Printer,
  Shield,
  ShieldX,
  Users,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import type { SimulationType, LocationType, SimulationSection } from '@/lib/validations/simulationValidation';
import { SIMULATION_PRESETS } from '@/lib/validations/simulationValidation';
import type { SmartRandomPreset, DifficultyMix } from '@/lib/validations/simulationValidation';

// Step definitions (no assignments step - added post-creation)
const STEPS = [
  { id: 'type', title: 'Tipo', icon: FileText },
  { id: 'config', title: 'Configurazione', icon: Settings },
  { id: 'questions', title: 'Domande', icon: Target },
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
  const [locationDetails, _setLocationDetails] = useState('');

  
  // Anti-cheat settings
  const [enableAntiCheat, setEnableAntiCheat] = useState(false);
  const [forceFullscreen, setForceFullscreen] = useState(false);
  const [blockTabChange, setBlockTabChange] = useState(false);
  const [blockCopyPaste, setBlockCopyPaste] = useState(false);
  const [logSuspiciousEvents, setLogSuspiciousEvents] = useState(false);
  
  // Sections (for TOLC-style)
  const [hasSections, setHasSections] = useState(false);
  const [sectionMode, setSectionMode] = useState<'auto' | 'manual'>('auto');
  const [sections, setSections] = useState<SimulationSection[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  
  // Questions
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState('');
  const [questionTagFilter, setQuestionTagFilter] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'random' | 'smart'>('manual');
  const [randomCount, setRandomCount] = useState(10);
  
  // Smart generation settings
  const [smartTotalQuestions, setSmartTotalQuestions] = useState(50);
  const [smartPreset, setSmartPreset] = useState<SmartRandomPreset>('BALANCED');
  const [smartDifficultyMix, setSmartDifficultyMix] = useState<DifficultyMix>('BALANCED');
  const [smartFocusSubjectId, setSmartFocusSubjectId] = useState<string>('');
  const [smartAvoidRecentlyUsed, setSmartAvoidRecentlyUsed] = useState(true);
  const [smartMaximizeTopicCoverage, setSmartMaximizeTopicCoverage] = useState(true);
  const [smartIsGenerating, setSmartIsGenerating] = useState(false);
  
  // Question detail modal
  const [previewQuestion, setPreviewQuestion] = useState<string | null>(null);
  
  // Print preview modal
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [_isPdfLoading, setIsPdfLoading] = useState(false);

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

  // Smart random generation mutation
  const smartRandomMutation = trpc.questions.generateSmartRandomQuestions.useMutation({
    onSuccess: (data) => {
      // Replace current questions with generated ones
      setSelectedQuestions(data.questions);
      setSmartIsGenerating(false);
      
      if (data.warning) {
        showSuccess('Generazione completata', data.warning);
      } else {
        showSuccess(
          'Generazione completata', 
          `${data.achievedTotal} domande generate con successo!`
        );
      }
    },
    onError: (error) => {
      setSmartIsGenerating(false);
      handleMutationError(error);
    },
  });

  // Handle smart generation
  const handleSmartGeneration = () => {
    setSmartIsGenerating(true);
    
    smartRandomMutation.mutate({
      totalQuestions: smartTotalQuestions,
      preset: smartPreset,
      focusSubjectId: smartPreset === 'SINGLE_SUBJECT' ? smartFocusSubjectId || undefined : undefined,
      difficultyMix: smartDifficultyMix,
      avoidRecentlyUsed: smartAvoidRecentlyUsed,
      maximizeTopicCoverage: smartMaximizeTopicCoverage,
      tagIds: questionTagFilter.length > 0 ? questionTagFilter : undefined,
      excludeQuestionIds: selectedQuestions.map(q => q.questionId),
    });
  };

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

  // Section management functions
  const addSection = () => {
    const name = newSectionName.trim() || `Sezione ${sections.length + 1}`;
    const newSection: SimulationSection = {
      id: `section-${Date.now()}`,
      name,
      durationMinutes: Math.floor(durationMinutes / (sections.length + 1)) || 10,
      questionIds: [],
      questionCount: 0,
      subjectId: null,
      order: sections.length,
    };
    setSections([...sections, newSection]);
    setNewSectionName('');
  };

  const removeSection = (sectionId: string) => {
    // Get questions from this section and move them to unassigned
    const sectionToRemove = sections.find(s => s.id === sectionId);
    if (sectionToRemove) {
      // Questions in this section become unassigned (no section)
      // We don't need to do anything to the questions since we track section assignment via questionIds in sections
    }
    setSections(sections.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i })));
  };

  const updateSection = (sectionId: string, updates: Partial<SimulationSection>) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ));
  };

  const moveSectionUp = (index: number) => {
    if (index <= 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    newSections.forEach((s, i) => s.order = i);
    setSections(newSections);
  };

  const moveSectionDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    newSections.forEach((s, i) => s.order = i);
    setSections(newSections);
  };

  const assignQuestionToSection = (questionId: string, sectionId: string | null) => {
    // Remove question from all sections first
    const updatedSections = sections.map(s => ({
      ...s,
      questionIds: s.questionIds?.filter(id => id !== questionId) || [],
    }));

    // If sectionId is provided, add to that section
    if (sectionId) {
      const targetIndex = updatedSections.findIndex(s => s.id === sectionId);
      if (targetIndex >= 0) {
        updatedSections[targetIndex].questionIds = [
          ...(updatedSections[targetIndex].questionIds || []),
          questionId,
        ];
      }
    }

    // Update question counts
    updatedSections.forEach(s => {
      s.questionCount = s.questionIds?.length || 0;
    });

    setSections(updatedSections);
  };

  const _getQuestionSection = (questionId: string): string | null => {
    for (const section of sections) {
      if (section.questionIds?.includes(questionId)) {
        return section.id;
      }
    }
    return null;
  };

  const getUnassignedQuestions = () => {
    const allAssignedIds = sections.flatMap(s => s.questionIds || []);
    return selectedQuestions.filter(sq => !allAssignedIds.includes(sq.questionId));
  };

  // Fetch questions with answers utility (using refetch)
  const questionsWithAnswersQuery = trpc.questions.getQuestionsWithAnswers.useQuery(
    { questionIds: selectedQuestions.map(sq => sq.questionId) },
    { enabled: false } // Disabled by default, we'll call refetch manually
  );


  // Handle PDF preview - fetch complete question data with answers
  const _handlePdfPreview = async () => {
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

  // Validation (5 steps: type, config, questions, review)
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Type
        return !!simulationType;
      case 1: // Config
        return !!title && durationMinutes >= 0;
      case 2: // Questions
        return selectedQuestions.length > 0;
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  // Submit
  const handleSubmit = async (_publishImmediately: boolean) => {
    setIsSaving(true);
    try {
      const isScheduled = false; // Scheduling handled during assignment now
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
        // Pass sections only if using manual mode, otherwise let backend auto-generate
        sections: hasSections && sectionMode === 'manual' && sections.length > 0 
          ? sections.map(s => ({
              id: s.id,
              name: s.name,
              durationMinutes: s.durationMinutes,
              questionIds: s.questionIds || [],
              questionCount: s.questionIds?.length || 0,
              subjectId: s.subjectId,
              order: s.order,
            }))
          : undefined,
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
            <div>
              <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                Seleziona il tipo di simulazione
              </h2>
              {userRole === 'COLLABORATOR' && (
                <p className={`mt-2 text-sm ${colors.text.muted} flex items-start gap-2`}>
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Come collaboratore puoi creare tutti i tipi di simulazione, ma non potrai modificarle o eliminarle dopo la creazione.</span>
                </p>
              )}
            </div>
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
            
            {/* Virtual Room + Anti-cheat info for official simulations */}
            {simulationType === 'OFFICIAL' && !isPaperBased && (
              <div className={`p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800`}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className={`font-medium ${colors.text.primary}`}>🎯 Stanza Virtuale Attiva</h4>
                      <p className={`text-sm ${colors.text.muted} mt-1`}>
                        Le simulazioni ufficiali utilizzano la <strong>Stanza Virtuale</strong> per sincronizzare l&apos;esecuzione del test tra tutti gli studenti.
                      </p>
                      <ul className={`text-sm ${colors.text.muted} mt-2 space-y-1 ml-4 list-disc`}>
                        <li>Gli studenti accedono a una sala d&apos;attesa</li>
                        <li>L&apos;admin/collaboratore avvia la sessione quando tutti sono pronti</li>
                        <li>Timer sincronizzato per tutti i partecipanti</li>
                        <li>Monitoraggio in tempo reale di progressi e connessioni</li>
                        <li>Sistema di messaggistica bidirezionale durante il test</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 pt-3 border-t border-purple-200 dark:border-purple-800`}>
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className={`font-medium ${colors.text.primary}`}>Protezione Anti-Cheat</h4>
                      <p className={`text-sm ${colors.text.muted} mt-1`}>
                        Modalità fullscreen forzata, blocco cambio tab, blocco copia/incolla. 
                        Gli eventi sospetti vengono registrati automaticamente.
                      </p>
                    </div>
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
                    onChange={(e) => {
                      setHasSections(e.target.checked);
                      if (!e.target.checked) {
                        setSections([]);
                        setSectionMode('auto');
                      }
                    }}
                  />
                  <div className="flex-1">
                    <label htmlFor="hasSections" className={`font-medium ${colors.text.primary} cursor-pointer`}>
                      Organizza in sezioni separate
                    </label>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>
                      Dividi la simulazione in sezioni con tempi e domande specifiche (es. Comprensione del testo, Biologia, Chimica...)
                    </p>
                    
                    {hasSections && (
                      <div className="mt-4 space-y-4">
                        {/* Section mode toggle */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSectionMode('auto');
                              setSections([]);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              sectionMode === 'auto' 
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                                : `${colors.background.card} ${colors.text.muted}`
                            }`}
                          >
                            Automatico (per materia)
                          </button>
                          <button
                            onClick={() => setSectionMode('manual')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              sectionMode === 'manual' 
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                                : `${colors.background.card} ${colors.text.muted}`
                            }`}
                          >
                            Manuale
                          </button>
                        </div>

                        {sectionMode === 'auto' && (
                          <p className={`text-xs ${colors.text.muted} italic`}>
                            Le sezioni verranno create automaticamente in base alla materia di ciascuna domanda.
                          </p>
                        )}

                        {sectionMode === 'manual' && (
                          <div className="space-y-3">
                            <p className={`text-xs ${colors.text.muted} italic`}>
                              Crea le sezioni qui e assegna le domande nel passo successivo.
                            </p>
                            
                            {/* Add new section */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                                placeholder="Nome nuova sezione..."
                                className={`flex-1 px-3 py-2 rounded-lg border ${colors.border.input} ${colors.background.input} ${colors.text.primary} text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addSection();
                                  }
                                }}
                              />
                              <button
                                onClick={addSection}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                              >
                                <Plus className="w-4 h-4" />
                                Aggiungi
                              </button>
                            </div>

                            {/* Sections list */}
                            {sections.length > 0 && (
                              <div className="space-y-2">
                                {sections.map((section, index) => (
                                  <div 
                                    key={section.id} 
                                    className={`flex items-center gap-2 p-3 rounded-lg border ${colors.border.light} ${colors.background.card}`}
                                  >
                                    {/* Order controls */}
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        onClick={() => moveSectionUp(index)}
                                        disabled={index === 0}
                                        className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 ${colors.text.secondary}`}
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => moveSectionDown(index)}
                                        disabled={index === sections.length - 1}
                                        className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 ${colors.text.secondary}`}
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                    
                                    {/* Section number */}
                                    <span className={`w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400`}>
                                      {index + 1}
                                    </span>
                                    
                                    {/* Section name (editable) */}
                                    {editingSectionId === section.id ? (
                                      <input
                                        type="text"
                                        value={section.name}
                                        onChange={(e) => updateSection(section.id, { name: e.target.value })}
                                        onBlur={() => setEditingSectionId(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') setEditingSectionId(null);
                                        }}
                                        autoFocus
                                        className={`flex-1 px-2 py-1 rounded border ${colors.border.input} ${colors.background.input} ${colors.text.primary} text-sm`}
                                      />
                                    ) : (
                                      <span 
                                        className={`flex-1 ${colors.text.primary} text-sm font-medium cursor-pointer hover:text-blue-600`}
                                        onClick={() => setEditingSectionId(section.id)}
                                        title="Clicca per modificare"
                                      >
                                        {section.name}
                                      </span>
                                    )}
                                    
                                    {/* Duration */}
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      <input
                                        type="number"
                                        value={section.durationMinutes}
                                        onChange={(e) => updateSection(section.id, { durationMinutes: parseInt(e.target.value) || 0 })}
                                        className={`w-16 px-2 py-1 rounded border ${colors.border.input} ${colors.background.input} ${colors.text.primary} text-sm text-center`}
                                        min="1"
                                      />
                                      <span className={`text-xs ${colors.text.muted}`}>min</span>
                                    </div>
                                    
                                    {/* Question count badge */}
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      (section.questionIds?.length || 0) > 0 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                      {section.questionIds?.length || 0} domande
                                    </span>
                                    
                                    {/* Remove button */}
                                    <button
                                      onClick={() => removeSection(section.id)}
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                      title="Rimuovi sezione"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                
                                {/* Total duration info */}
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${colors.background.tertiary}`}>
                                  <span className={`text-sm ${colors.text.muted}`}>Durata totale sezioni:</span>
                                  <span className={`font-medium ${
                                    sections.reduce((sum, s) => sum + s.durationMinutes, 0) === durationMinutes
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-yellow-600 dark:text-yellow-400'
                                  }`}>
                                    {sections.reduce((sum, s) => sum + s.durationMinutes, 0)} / {durationMinutes} min
                                  </span>
                                </div>
                              </div>
                            )}

                            {sections.length === 0 && (
                              <p className={`text-sm ${colors.text.muted} text-center py-4`}>
                                Nessuna sezione creata. Aggiungi una sezione per iniziare.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
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
                <button
                  onClick={() => setSelectionMode('smart')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    selectionMode === 'smart' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : `${colors.background.secondary} ${colors.text.muted}`
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Smart
                </button>
              </div>
            </div>

            {/* Smart generation panel */}
            {selectionMode === 'smart' && (
              <div className={`p-5 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800`}>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className={`font-semibold text-purple-900 dark:text-purple-200`}>
                    Generazione Intelligente
                  </h3>
                </div>
                <p className={`text-sm text-purple-700 dark:text-purple-300 mb-5`}>
                  L&apos;algoritmo creerà una simulazione bilanciata automaticamente, distribuendo le domande per materia, 
                  difficoltà e argomenti. Perfetto per creare simulazioni realistiche in pochi secondi.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {/* Number of questions */}
                  <div>
                    <label className={`block text-sm font-medium text-purple-900 dark:text-purple-200 mb-1.5`}>
                      Numero di domande
                    </label>
                    <input
                      type="number"
                      value={smartTotalQuestions}
                      onChange={(e) => setSmartTotalQuestions(Math.max(5, Math.min(100, parseInt(e.target.value) || 5)))}
                      min={5}
                      max={100}
                      className={`w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 ${colors.text.primary} text-sm`}
                    />
                  </div>

                  {/* Preset selection */}
                  <div>
                    <CustomSelect
                      label="Distribuzione materie"
                      value={smartPreset}
                      onChange={(value) => setSmartPreset(value as SmartRandomPreset)}
                      options={[
                        { value: 'PROPORTIONAL', label: 'Proporzionale (in base alle domande disponibili)' },
                        { value: 'BALANCED', label: 'Bilanciata (equa tra materie)' },
                        { value: 'SINGLE_SUBJECT', label: 'Singola materia' },
                      ]}
                      className="text-purple-900 dark:text-purple-200"
                    />
                  </div>

                  {/* Focus subject (only for SINGLE_SUBJECT) */}
                  {smartPreset === 'SINGLE_SUBJECT' && (
                    <div>
                      <CustomSelect
                        label="Materia focus"
                        value={smartFocusSubjectId}
                        onChange={setSmartFocusSubjectId}
                        options={[
                          { value: '', label: 'Seleziona materia...' },
                          ...(subjectsData?.map((s) => ({
                            value: s.id,
                            label: `${s.name} (${s._count?.questions || 0} domande)`,
                          })) || []),
                        ]}
                        className="text-purple-900 dark:text-purple-200"
                      />
                    </div>
                  )}

                  {/* Difficulty mix */}
                  <div>
                    <CustomSelect
                      label="Mix difficoltà"
                      value={smartDifficultyMix}
                      onChange={(value) => setSmartDifficultyMix(value as DifficultyMix)}
                      options={[
                        { value: 'BALANCED', label: 'Bilanciata (30% F, 50% M, 20% D)' },
                        { value: 'EASY_FOCUS', label: 'Più facili (50% F, 40% M, 10% D)' },
                        { value: 'HARD_FOCUS', label: 'Più difficili (10% F, 40% M, 50% D)' },
                        { value: 'MEDIUM_ONLY', label: 'Solo medie' },
                        { value: 'MIXED', label: 'Equa (33/34/33)' },
                      ]}
                      className="text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>

                {/* Smart options */}
                <div className="flex flex-wrap gap-4 mb-5">
                  <Checkbox
                    checked={smartAvoidRecentlyUsed}
                    onChange={(e) => setSmartAvoidRecentlyUsed(e.target.checked)}
                    label="Evita domande usate recentemente"
                    className="text-purple-900 dark:text-purple-200"
                  />
                  <Checkbox
                    checked={smartMaximizeTopicCoverage}
                    onChange={(e) => setSmartMaximizeTopicCoverage(e.target.checked)}
                    label="Massimizza copertura argomenti"
                    className="text-purple-900 dark:text-purple-200"
                  />
                </div>

                {/* Generate button */}
                <button
                  onClick={handleSmartGeneration}
                  disabled={smartIsGenerating || (smartPreset === 'SINGLE_SUBJECT' && !smartFocusSubjectId)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {smartIsGenerating ? (
                    <>
                      <Spinner size="sm" variant="white" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Genera {smartTotalQuestions} Domande Smart
                    </>
                  )}
                </button>

                {selectedQuestions.length > 0 && (
                  <p className={`text-xs text-purple-600 dark:text-purple-400 mt-2 text-center`}>
                    La generazione sostituirà le {selectedQuestions.length} domande attualmente selezionate
                  </p>
                )}
              </div>
            )}

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
                  {hasSections && sectionMode === 'manual' && sections.length > 0 && (
                    <p className={`text-xs ${colors.text.muted} mt-1`}>
                      Assegna ciascuna domanda a una sezione usando il selettore
                    </p>
                  )}
                  {hasSections && sectionMode === 'manual' && getUnassignedQuestions().length > 0 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      ⚠️ {getUnassignedQuestions().length} domande non assegnate a nessuna sezione
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {selectedQuestions.length === 0 ? (
                    <div className="p-8 text-center">
                      <Target className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className={colors.text.muted}>Nessuna domanda selezionata</p>
                      <p className={`text-sm ${colors.text.muted}`}>Aggiungi domande dalla lista a sinistra</p>
                    </div>
                  ) : hasSections && sectionMode === 'manual' && sections.length > 0 ? (
                    // Group questions by section
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {/* Unassigned questions section */}
                      {getUnassignedQuestions().length > 0 && (
                        <div className={`${colors.background.tertiary}`}>
                          <div className={`px-3 py-2 flex items-center gap-2 border-b ${colors.border.light}`}>
                            <span className={`text-sm font-medium ${colors.text.muted}`}>Non assegnate</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400`}>
                              {getUnassignedQuestions().length}
                            </span>
                          </div>
                          {getUnassignedQuestions().map((sq) => (
                            <div key={sq.questionId} className={`p-3 flex items-center gap-3 ${colors.background.card}`}>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${colors.text.primary} line-clamp-1`}>
                                  {sq.question?.text?.replace(/<[^>]*>/g, '') || 'Domanda'}
                                </p>
                              </div>
                              <div className="w-36">
                                <CustomSelect
                                  value=""
                                  onChange={(value) => assignQuestionToSection(sq.questionId, value || null)}
                                  options={[
                                    { value: '', label: 'Assegna a...' },
                                    ...sections.map((s) => ({ value: s.id, label: s.name }))
                                  ]}
                                  placeholder="Assegna a..."
                                  size="sm"
                                />
                              </div>
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
                      
                      {/* Questions grouped by section */}
                      {sections.map((section) => {
                        const sectionQuestions = selectedQuestions.filter(sq => 
                          section.questionIds?.includes(sq.questionId)
                        );
                        return (
                          <div key={section.id}>
                            <div className={`px-3 py-2 flex items-center gap-2 border-b ${colors.border.light} ${colors.background.secondary}`}>
                              <span className={`w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400`}>
                                {section.order + 1}
                              </span>
                              <span className={`text-sm font-medium ${colors.text.primary}`}>{section.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                sectionQuestions.length > 0 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {sectionQuestions.length} domande
                              </span>
                            </div>
                            {sectionQuestions.length === 0 ? (
                              <div className={`p-3 text-center ${colors.background.card}`}>
                                <p className={`text-xs ${colors.text.muted}`}>Nessuna domanda in questa sezione</p>
                              </div>
                            ) : (
                              sectionQuestions.map((sq) => (
                                <div key={sq.questionId} className={`p-3 flex items-center gap-3 ${colors.background.card}`}>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${colors.text.primary} line-clamp-1`}>
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
                                    </div>
                                  </div>
                                  <div className="w-36">
                                    <CustomSelect
                                      value={section.id}
                                      onChange={(value) => assignQuestionToSection(sq.questionId, value || null)}
                                      options={[
                                        { value: '', label: 'Rimuovi sezione' },
                                        ...sections.map((s) => ({ value: s.id, label: s.name }))
                                      ]}
                                      placeholder={section.name}
                                      size="sm"
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeQuestion(sq.questionId)}
                                    className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}
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

      case 3: // Review step
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
                      <dd className={`font-medium text-blue-600 dark:text-blue-400`}>
                        {sectionMode === 'auto' ? 'Automatiche (per materia)' : `${sections.length} manuali`}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Sections detail (only for manual mode) */}
              {hasSections && sectionMode === 'manual' && sections.length > 0 && (
                <div className={`p-6 rounded-xl ${colors.background.secondary} md:col-span-2`}>
                  <h3 className={`font-medium ${colors.text.primary} mb-4 flex items-center gap-2`}>
                    <Layers className="w-4 h-4 text-blue-600" />
                    Dettaglio Sezioni
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sections.map((section, idx) => (
                      <div 
                        key={section.id} 
                        className={`p-3 rounded-lg border ${colors.border.light} ${colors.background.card}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400`}>
                            {idx + 1}
                          </span>
                          <span className={`font-medium ${colors.text.primary} text-sm`}>{section.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={colors.text.muted}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {section.durationMinutes} min
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${
                            (section.questionIds?.length || 0) > 0 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {section.questionIds?.length || 0} domande
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getUnassignedQuestions().length > 0 && (
                    <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
                      ⚠️ Attenzione: {getUnassignedQuestions().length} domande non assegnate a nessuna sezione
                    </p>
                  )}
                </div>
              )}

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
                  Visualizza come apparirà il test stampato (con formule LaTeX renderizzate)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedQuestions.length === 0) {
                      alert('Seleziona almeno una domanda per visualizzare l\'anteprima');
                      return;
                    }
                    setShowPrintPreview(true);
                  }}
                  disabled={selectedQuestions.length === 0}
                  className={`px-4 py-2 ${colors.background.secondary} border ${colors.border.light} rounded-lg text-sm font-medium ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Eye className="w-4 h-4 inline mr-2" />
                  Visualizza anteprima stampa
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
      <Modal
        isOpen={!!previewQuestion && !!questionDetail}
        onClose={() => setPreviewQuestion(null)}
        title="Anteprima Domanda"
        icon={<Eye className="w-6 h-6" />}
        size="2xl"
        variant="primary"
      >
        {questionDetail && (
          <div className="space-y-4">
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
            <div className={`${colors.text.primary}`}>
              <RichTextRenderer text={questionDetail.text} />
            </div>

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
                    <div className={`flex-1 ${answer.isCorrect ? 'text-green-700 dark:text-green-300' : colors.text.primary}`}>
                      <RichTextRenderer text={answer.text} />
                    </div>
                    {answer.isCorrect && (
                      <Check className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Print Preview Modal */}
      <Modal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title="Anteprima Stampa"
        icon={<Printer className="w-6 h-6" />}
        size="full"
        variant="default"
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Open in new window for actual printing
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>${title || 'Simulazione'} - Stampa</title>
                      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
                      <style>
                        @page { size: A4; margin: 15mm 20mm; }
                        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
                        .header { text-align: center; border-bottom: 2px solid #a8012b; padding-bottom: 10px; margin-bottom: 20px; }
                        .school { color: #a8012b; font-weight: bold; font-size: 14pt; }
                        .title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 10px 0; }
                        .date { color: #666; font-size: 10pt; }
                        .info-box { border: 1px solid #999; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
                        .instructions { background: #f5f5f5; border: 1px solid #ccc; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
                        .question { margin-bottom: 20px; page-break-inside: avoid; }
                        .question-number { font-weight: bold; }
                        .answers { margin-left: 25px; margin-top: 8px; }
                        .answer { margin: 5px 0; }
                        .katex { font-size: 1.1em; }
                      </style>
                    </head>
                    <body>
                      <div id="content"></div>
                      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
                      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
                      <script>
                        document.getElementById('content').innerHTML = ${JSON.stringify(document.getElementById('print-preview-content')?.innerHTML || '')};
                        renderMathInElement(document.body, {
                          delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            {left: '\\\\[', right: '\\\\]', display: true},
                            {left: '\\\\(', right: '\\\\)', display: false}
                          ]
                        });
                        setTimeout(() => window.print(), 500);
                      </script>
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90`}
            >
              <Printer className="w-4 h-4" />
              Stampa / Salva PDF
            </button>
            <button
              onClick={() => setShowPrintPreview(false)}
              className={`px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary}`}
            >
              Chiudi
            </button>
          </div>
        }
      >
        <div id="print-preview-content" className="bg-white text-black p-6 rounded-lg max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-6 border-b-2 border-[#a8012b] pb-4">
            <p className="text-[#a8012b] font-bold text-lg">LEONARDO SCHOOL</p>
            <h2 className="text-2xl font-bold uppercase my-2">{title || 'Simulazione'}</h2>
            <p className="text-gray-600 text-sm">
              Anno Accademico {new Date().getFullYear()}/{new Date().getFullYear() + 1} - {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Student Info Box */}
          <div className="border border-gray-400 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm">Cognome e Nome: <span className="border-b border-gray-400 inline-block w-64">&nbsp;</span></p>
                <p className="text-sm mt-2">Matricola: <span className="border-b border-gray-400 inline-block w-40">&nbsp;</span></p>
              </div>
              <div className="text-right">
                <p className="text-sm">Data: {new Date().toLocaleDateString('it-IT')}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-sm mb-2">ISTRUZIONI</h3>
            <ul className="text-sm space-y-1">
              <li>• Tempo a disposizione: {durationMinutes} minuti</li>
              <li>• Punteggio: Risposta corretta +{correctPoints}, Risposta errata {wrongPoints}, Non risposta {blankPoints}</li>
              <li>• Numero domande: {selectedQuestions.length}</li>
              {paperInstructions && <li>• {paperInstructions}</li>}
            </ul>
          </div>

          {/* Questions */}
          <h3 className="text-center font-bold uppercase mb-6">DOMANDE A RISPOSTA MULTIPLA</h3>
          <div className="space-y-6">
            {selectedQuestions.map((sq, index) => {
              const question = questionsData?.questions.find(q => q.id === sq.questionId);
              if (!question) return null;
              
              return (
                <div key={sq.questionId} className="mb-4">
                  <div className="mb-2">
                    <span className="font-bold">{index + 1}. </span>
                    <RichTextRenderer text={question.text} className="inline font-bold" />
                  </div>
                  {question.answers && question.answers.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {[...question.answers]
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((answer, ansIndex) => (
                          <div key={answer.id} className="flex items-start gap-2">
                            <span className="font-medium w-6">{String.fromCharCode(65 + ansIndex)})</span>
                            <RichTextRenderer text={answer.text} />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
