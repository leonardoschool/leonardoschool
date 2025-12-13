'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Target,
  Settings,
  Users,
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
} from 'lucide-react';
import type { SimulationType, SimulationVisibility } from '@/lib/validations/simulationValidation';
import { SIMULATION_PRESETS } from '@/lib/validations/simulationValidation';

// Step definitions
const STEPS = [
  { id: 'type', title: 'Tipo', icon: FileText },
  { id: 'config', title: 'Configurazione', icon: Settings },
  { id: 'questions', title: 'Domande', icon: Target },
  { id: 'assignments', title: 'Destinatari', icon: Users },
  { id: 'review', title: 'Riepilogo', icon: Eye },
];

// Type options
const typeOptions: { value: SimulationType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'OFFICIAL',
    label: 'Simulazione Ufficiale',
    description: 'Test che conta per la classifica. Punteggio, tempo e numero tentativi controllati.',
    icon: <Award className="w-6 h-6" />,
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

// Visibility options (kept for future visibility dropdown feature)
const _visibilityOptions = [
  { value: 'PRIVATE', label: 'Privata', description: 'Solo studenti assegnati' },
  { value: 'CLASS', label: 'Classe', description: 'Tutti gli studenti della classe selezionata' },
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
    subject?: { name: string; color: string };
    topic?: { name: string };
  };
}

interface AssignmentTarget {
  studentId?: string | null;
  groupId?: string | null;
  classId?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}

export default function NewSimulationPage() {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const _utils = trpc.useUtils();

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [simulationType, setSimulationType] = useState<SimulationType>('PRACTICE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [visibility, _setVisibility] = useState<SimulationVisibility>('PRIVATE');
  
  // Timing
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
  
  // Questions
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState('');
  
  // Assignments
  const [assignments, setAssignments] = useState<AssignmentTarget[]>([]);
  const [isPublic, setIsPublic] = useState(false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data
  const { data: subjectsData } = trpc.questions.getSubjects.useQuery();
  const { data: groupsData } = trpc.groups.getGroups.useQuery({ page: 1, pageSize: 100 });
  const { data: studentsData } = trpc.students.getStudents.useQuery({ page: 1, pageSize: 500, isActive: true });

  // Questions query
  const { data: questionsData, isLoading: questionsLoading } = trpc.questions.getQuestions.useQuery({
    page: 1,
    pageSize: 50,
    search: questionSearchTerm || undefined,
    subjectId: questionSubjectFilter || undefined,
    difficulty: questionDifficultyFilter as 'EASY' | 'MEDIUM' | 'HARD' | undefined || undefined,
    status: 'PUBLISHED',
  });

  // Mutations
  const createWithQuestionsMutation = trpc.simulations.createWithQuestions.useMutation({
    onSuccess: (simulation) => {
      showSuccess('Creata!', 'Simulazione creata con successo');
      router.push(`/admin/simulazioni/${simulation.id}`);
    },
    onError: handleMutationError,
  });

  // Apply preset
  const applyPreset = (type: SimulationType) => {
    setSimulationType(type);
    
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

  // Add assignment
  const addAssignment = (type: 'student' | 'group' | 'class', id: string) => {
    const existing = assignments.find(a => 
      (type === 'student' && a.studentId === id) ||
      (type === 'group' && a.groupId === id) ||
      (type === 'class' && a.classId === id)
    );
    if (existing) return;

    setAssignments([
      ...assignments,
      {
        studentId: type === 'student' ? id : null,
        groupId: type === 'group' ? id : null,
        classId: type === 'class' ? id : null,
      },
    ]);
  };

  // Remove assignment
  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  // Validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Type
        return !!simulationType;
      case 1: // Config
        return !!title && durationMinutes >= 0;
      case 2: // Questions
        return selectedQuestions.length > 0;
      case 3: // Assignments
        return isPublic || assignments.length > 0;
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
      // Convert datetime-local format to ISO string or undefined
      const formatDate = (dateStr: string): string | undefined => {
        if (!dateStr) return undefined;
        try {
          const date = new Date(dateStr);
          return date.toISOString();
        } catch {
          return undefined;
        }
      };

      await createWithQuestionsMutation.mutateAsync({
        title,
        description: description || undefined,
        type: simulationType,
        visibility,
        isOfficial,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
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
        isPublic,
        questions: selectedQuestions.map(q => ({
          questionId: q.questionId,
          order: q.order,
          customPoints: q.customPoints,
          customNegativePoints: q.customNegativePoints,
        })),
        assignments: assignments.filter(a => a.studentId || a.groupId || a.classId).map(a => ({
          studentId: a.studentId || undefined,
          groupId: a.groupId || undefined,
          classId: a.classId || undefined,
          dueDate: a.dueDate ? new Date(a.dueDate).toISOString() : undefined,
          notes: a.notes || undefined,
        })),
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
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    simulationType === option.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : `border-gray-200 dark:border-gray-700 ${colors.background.hover}`
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    simulationType === option.value
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
              <h3 className={`text-lg font-medium ${colors.text.primary}`}>Tempistiche</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Data inizio
                  </label>
                  <DateTimePicker
                    id="startDate"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Seleziona data e ora"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Data fine
                  </label>
                  <DateTimePicker
                    id="endDate"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Seleziona data e ora"
                    minDate={startDate ? startDate.split('T')[0] : undefined}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Durata (minuti)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                    min={0}
                    placeholder="0 = illimitato"
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                  <p className={`text-xs ${colors.text.muted} mt-1`}>0 = tempo illimitato</p>
                </div>
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                Seleziona le domande ({selectedQuestions.length} selezionate)
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available questions */}
              <div className={`rounded-xl border ${colors.border.light} overflow-hidden`}>
                <div className={`p-4 ${colors.background.secondary} border-b ${colors.border.light}`}>
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
                <div className="max-h-96 overflow-y-auto">
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
                                    style={{ backgroundColor: question.subject.color + '20', color: question.subject.color }}
                                  >
                                    {question.subject.name}
                                  </span>
                                )}
                                <span className={`text-xs ${colors.text.muted}`}>{question.difficulty}</span>
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
              <div className={`rounded-xl border ${colors.border.light} overflow-hidden`}>
                <div className={`p-4 ${colors.background.secondary} border-b ${colors.border.light}`}>
                  <h3 className={`font-medium ${colors.text.primary}`}>
                    Domande selezionate ({selectedQuestions.length})
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
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
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveQuestion(index, 'down')}
                              disabled={index === selectedQuestions.length - 1}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
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
                                  style={{ backgroundColor: sq.question.subject.color + '20', color: sq.question.subject.color }}
                                >
                                  {sq.question.subject.name}
                                </span>
                              )}
                            </div>
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
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
              Assegna la simulazione
            </h2>

            {/* Visibility */}
            <div className={`p-6 rounded-xl ${colors.background.secondary}`}>
              <h3 className={`font-medium ${colors.text.primary} mb-4`}>Visibilità</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Checkbox
                  id="isPublic"
                  label="Pubblica per tutti"
                  description="Tutti gli studenti attivi possono accedere"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              </div>
            </div>

            {/* Individual assignments */}
            {!isPublic && (
              <div className={`p-6 rounded-xl ${colors.background.secondary}`}>
                <h3 className={`font-medium ${colors.text.primary} mb-4`}>
                  Assegnazioni individuali ({assignments.length})
                </h3>

                {/* Add assignment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                      Aggiungi studente
                    </label>
                    <CustomSelect
                      value=""
                      onChange={(value) => {
                        if (value) addAssignment('student', value);
                      }}
                      options={[
                        { value: '', label: 'Seleziona...' },
                        ...(studentsData?.students?.map((s) => ({ 
                          value: s.studentId || '', 
                          label: s.name || 'Studente' 
                        })) || []),
                      ]}
                      placeholder="Seleziona..."
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                      Aggiungi gruppo
                    </label>
                    <CustomSelect
                      value=""
                      onChange={(value) => {
                        if (value) addAssignment('group', value);
                      }}
                      options={[
                        { value: '', label: 'Seleziona...' },
                        ...(groupsData?.groups?.map((g) => ({ value: g.id, label: g.name })) || []),
                      ]}
                      placeholder="Seleziona..."
                    />
                  </div>
                </div>

                {/* Assignment list */}
                {assignments.length > 0 && (
                  <div className={`rounded-lg border ${colors.border.light} divide-y ${colors.border.light}`}>
                    {assignments.map((assignment, index) => {
                      let label = '';
                      let icon = <Users className="w-4 h-4" />;
                      if (assignment.studentId) {
                        const student = studentsData?.students?.find(s => s.studentId === assignment.studentId);
                        label = student?.name || 'Studente';
                        icon = <Users className="w-4 h-4" />;
                      } else if (assignment.groupId) {
                        const group = groupsData?.groups?.find(g => g.id === assignment.groupId);
                        label = `Gruppo: ${group?.name || ''}`;
                      }

                      return (
                        <div key={index} className={`p-3 flex items-center justify-between ${colors.background.card}`}>
                          <div className="flex items-center gap-3">
                            {icon}
                            <span className={colors.text.primary}>{label}</span>
                          </div>
                          <button
                            onClick={() => removeAssignment(index)}
                            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
              Riepilogo simulazione
            </h2>

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

              {/* Assignments */}
              <div className={`p-6 rounded-xl ${colors.background.secondary} md:col-span-2`}>
                <h3 className={`font-medium ${colors.text.primary} mb-4`}>Destinatari</h3>
                {isPublic ? (
                  <p className={colors.text.secondary}>Pubblica per tutti gli studenti attivi</p>
                ) : assignments.length > 0 ? (
                  <p className={colors.text.secondary}>
                    {assignments.length} assegnazioni individuali
                  </p>
                ) : (
                  <p className={`${colors.text.muted} italic`}>Nessun destinatario selezionato</p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/simulazioni"
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
    </div>
  );
}
