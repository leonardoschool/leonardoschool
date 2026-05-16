'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { stripHtml } from '@/lib/utils/sanitizeHtml';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import MultiSelect from '@/components/ui/MultiSelect';
import Checkbox from '@/components/ui/Checkbox';
import NumericInput from '@/components/ui/NumericInput';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import { Modal } from '@/components/ui/Modal';
import { previewSimulationPdf } from '@/lib/utils/simulationPdfGenerator';
import { SimulationPreviewModal, FillSectionModal, type PickedQuestion } from '@/components/simulazioni';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Monitor,
  Wand2,
  Trash2,
} from 'lucide-react';
import type { SimulationType, LocationType, SimulationSection } from '@/lib/validations/simulationValidation';
import { SIMULATION_PRESETS } from '@/lib/validations/simulationValidation';

// Step definitions (no assignments step - added post-creation)
const SIMULATION_STEPS = [
  { id: 'type', title: 'Tipo', icon: FileText },
  { id: 'config', title: 'Configurazione', icon: Settings },
  { id: 'questions', title: 'Domande', icon: Target },
  { id: 'review', title: 'Riepilogo', icon: Eye },
];

const TEMPLATE_STEPS = [
  { id: 'template', title: 'Template', icon: FileText },
  { id: 'config', title: 'Impostazioni', icon: Settings },
  { id: 'sections', title: 'Sezioni', icon: Target },
  { id: 'review', title: 'Riepilogo', icon: Eye },
];

type CreationMode = 'simulation' | 'template';
type QuestionTypeFilter = '' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT';
type TemplateQuestionTypeValue = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT';
type TemplateDifficultyValue = 'EASY' | 'MEDIUM' | 'HARD';
type TemplateLanguageValue = 'IT' | 'EN';
type TemplateLanguageFilter = '' | TemplateLanguageValue;

interface TemplateQuestionCounts {
  total: number;
  IT: number;
  EN: number;
}

interface TemplateTopicItem {
  id: string;
  name: string;
  hasItalianQuestions: boolean;
  hasEnglishQuestions: boolean;
  questionCounts: TemplateQuestionCounts;
  _count: { questions: number };
}

interface TemplateSubjectItem {
  id: string;
  name: string;
  color: string | null;
  hasItalianQuestions: boolean;
  hasEnglishQuestions: boolean;
  questionCounts: TemplateQuestionCounts;
  _count: { questions: number };
  topics: TemplateTopicItem[];
}

const TEMPLATE_QUESTION_TYPE_OPTIONS = [
  { value: 'SINGLE_CHOICE', label: 'Risposta singola' },
  { value: 'MULTIPLE_CHOICE', label: 'Risposta multipla' },
  { value: 'OPEN_TEXT', label: 'Risposta aperta' },
];

const TEMPLATE_DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: 'Facile' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HARD', label: 'Difficile' },
];

const TEMPLATE_LANGUAGE_OPTIONS = [
  { value: '', label: 'Tutte le lingue' },
  { value: 'IT', label: 'Italiano' },
  { value: 'EN', label: 'Inglese' },
];

const TEMPLATE_QUESTION_TYPE_LABELS: Record<TemplateQuestionTypeValue, string> = {
  SINGLE_CHOICE: 'Risposta singola',
  MULTIPLE_CHOICE: 'Risposta multipla',
  OPEN_TEXT: 'Risposta aperta',
};

const TEMPLATE_LANGUAGE_LABELS: Record<'IT' | 'EN', string> = {
  IT: 'Italiano',
  EN: 'Inglese',
};

const toNonNegativeInteger = (value: unknown): number => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : 0;

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const normalizeCountRecord = (counts?: Record<string, unknown> | null): Record<string, number> => {
  if (!counts) return {};

  return Object.entries(counts).reduce<Record<string, number>>((normalized, [key, value]) => {
    const count = toNonNegativeInteger(value);
    if (count > 0) normalized[key] = count;
    return normalized;
  }, {});
};

const distributeCountEvenly = (total: number, ids: readonly string[]): Record<string, number> => {
  if (total <= 0 || ids.length === 0) return {};
  return ids.reduce((counts, id, index) => {
    const base = Math.floor(total / ids.length);
    const remainder = total % ids.length;
    counts[id] = base + (index < remainder ? 1 : 0);
    return counts;
  }, {} as Record<string, number>);
};

const getCountTotal = (counts?: Record<string, unknown>): number =>
  Object.values(counts ?? {}).reduce<number>((total, count) => total + toNonNegativeInteger(count), 0);

const getSectionTargetQuestionCount = (section: Partial<SimulationSection>): number => {
  const directCount = toNonNegativeInteger(section.questionCount);
  if (directCount > 0) return directCount;

  return getCountTotal((section as { subjectQuestionCounts?: Record<string, unknown> }).subjectQuestionCounts);
};

const getQuestionCountForLanguage = (counts: TemplateQuestionCounts, language: TemplateLanguageFilter): number =>
  language ? counts[language] : counts.total;

const filterTemplateSubjectsByLanguage = (
  subjects: TemplateSubjectItem[],
  language: TemplateLanguageFilter
): TemplateSubjectItem[] => {
  if (!language) return subjects;
  return subjects
    .map((subject) => ({
      ...subject,
      topics: subject.topics.filter((topic) => getQuestionCountForLanguage(topic.questionCounts, language) > 0),
    }))
    .filter((subject) => getQuestionCountForLanguage(subject.questionCounts, language) > 0 || subject.topics.length > 0);
};

const buildTemplateSubjectOptions = (
  subjects: TemplateSubjectItem[],
  language: TemplateLanguageFilter
) => subjects.map((subject) => {
  const count = getQuestionCountForLanguage(subject.questionCounts, language);
  const languageHint = language ? ` (${count} ${language})` : subject.hasEnglishQuestions ? ' (EN)' : '';
  return {
    value: subject.id,
    label: `${subject.name}${languageHint}`,
    color: subject.color ?? undefined,
  };
});

const getTemplateTopicOptions = (
  subjects: TemplateSubjectItem[],
  selectedSubjectIds: string[],
  language: TemplateLanguageFilter
) => {
  const selectedIds = new Set(selectedSubjectIds);
  const selectedSubjects = subjects.filter((subject) => selectedIds.has(subject.id));
  const showSubjectName = selectedSubjects.length > 1;

  return selectedSubjects.flatMap((subject) =>
    subject.topics
      .filter((topic) => !language || getQuestionCountForLanguage(topic.questionCounts, language) > 0)
      .map((topic) => {
        const count = getQuestionCountForLanguage(topic.questionCounts, language);
        const languageHint = language ? ` (${count} ${language})` : topic.hasEnglishQuestions ? ' (EN)' : '';
        const subjectHint = showSubjectName ? ` - ${subject.name}` : '';
        return {
          value: topic.id,
          label: `${topic.name}${subjectHint}${languageHint}`,
          color: subject.color ?? undefined,
        };
      })
  );
};

// Type options - staff creation supports Ufficiale / Esercitazione
const primaryTypeOptions: { value: SimulationType; label: string; description: string; icon: React.ReactNode; badge?: string }[] = [
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
];

const typeOptions = primaryTypeOptions;

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

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function NewSimulationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Check authorization
  const userRole = user?.role;
  const hasAccess = userRole && isStaff(userRole);
  const creationMode: CreationMode = searchParams.get('mode') === 'template' ? 'template' : 'simulation';
  const editId = creationMode === 'template' ? (searchParams.get('editId') ?? '') : '';
  const isEditMode = !!editId;
  const activeSteps = creationMode === 'template' ? TEMPLATE_STEPS : SIMULATION_STEPS;

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSelfPracticeTemplate, setIsSelfPracticeTemplate] = useState(false);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>([]);
  // Filter/search state for the self-practice assignment panel
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentGroupFilter, setStudentGroupFilter] = useState('');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

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
  const [showSectionsInPaper, setShowSectionsInPaper] = useState(true);
  // Attendance tracking
  const [trackAttendance, setTrackAttendance] = useState(false);
  const [locationType, setLocationType] = useState<LocationType | ''>('');
  // eslint-disable-next-line sonarjs/no-unused-vars -- setter reserved for location input feature
  const [locationDetails, _setLocationDetails] = useState('');

  
  // Anti-cheat settings
  const [enableAntiCheat, setEnableAntiCheat] = useState(false);
  const [forceFullscreen, setForceFullscreen] = useState(false);
  const [blockTabChange, setBlockTabChange] = useState(false);
  const [blockCopyPaste, setBlockCopyPaste] = useState(false);
  const [logSuspiciousEvents, setLogSuspiciousEvents] = useState(false);
  
  // Sections (for TOLC-style)
  const [hasSections, setHasSections] = useState(() => creationMode === 'template');
  const [sectionMode, setSectionMode] = useState<'auto' | 'manual'>(() => creationMode === 'template' ? 'manual' : 'auto');
  const [sections, setSections] = useState<SimulationSection[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [fillSectionId, setFillSectionId] = useState<string | null>(null);
  
  // Questions
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionTypeFilter>('');
  const [questionTagFilter, setQuestionTagFilter] = useState<string[]>([]);
  const [questionLanguageFilter, setQuestionLanguageFilter] = useState('');
  
  // Question detail modal
  const [previewQuestion, setPreviewQuestion] = useState<string | null>(null);

  // Right-panel tab: list of selected questions OR section assignment view
  const [rightPanelTab, setRightPanelTab] = useState<'domande' | 'sezioni'>('domande');
  // Section-centric assignment: which section's "add questions" panel is open
  const [expandedAddSection, setExpandedAddSection] = useState<string | null>(null);
  // Questions checked inside the expanded section's add-panel
  const [bulkAssignSelectedIds, setBulkAssignSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentStep(0);
    if (creationMode === 'template') {
      setSelectedTemplateId('');
      setHasSections(true);
      setSectionMode('manual');
      setRightPanelTab('sezioni');
    }
  }, [creationMode]);

  // Simulation preview modal (for students view)
  const [showSimulationPreview, setShowSimulationPreview] = useState(false);
  const [previewQuestionsData, setPreviewQuestionsData] = useState<Array<{
    id: string;
    text: string;
    textLatex?: string | null;
    type: string;
    difficulty: string;
    imageUrl?: string | null;
    subject?: { name: string; color?: string | null } | null;
    topic?: { name?: string | null } | null;
    answers: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      order: number;
      imageUrl?: string | null;
    }>;
  }>>([]);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Fetch data
  const { data: subjectsData } = trpc.questions.getSubjects.useQuery();
  const { data: tagCategoriesData } = trpc.questionTags.getCategories.useQuery({});
  const { data: templateGroupsData } = trpc.groups.getAll.useQuery(
    { onlyMyGroups: userRole === 'COLLABORATOR' },
    { enabled: creationMode === 'template' }
  );
  const { data: templateStudentsData } = trpc.students.getStudents.useQuery(
    { pageSize: 500, isActive: true, ...(userRole === 'COLLABORATOR' && { onlyMyGroups: true }) },
    { enabled: creationMode === 'template' && isSelfPracticeTemplate }
  );
  const { data: templatesData } = trpc.simulationTemplates.list.useQuery({
    page: 1,
    pageSize: 100,
    status: 'PUBLISHED',
    sortBy: 'title',
    sortOrder: 'asc',
  });

  // Derived: filtered students for the self-practice assignment panel
  const allTemplateStudents = useMemo(() => templateStudentsData?.students ?? [], [templateStudentsData?.students]);
  const filteredTemplateStudents = useMemo(() => {
    let list = allTemplateStudents;
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (studentGroupFilter) {
      const group = (templateGroupsData ?? []).find((g) => g.id === studentGroupFilter);
      const memberStudentIds = new Set((group?.studentMembers ?? []).map((m) => m.id));
      list = list.filter((s) => s.studentId && memberStudentIds.has(s.studentId));
    }
    return list;
  }, [allTemplateStudents, studentSearchQuery, studentGroupFilter, templateGroupsData]);

  // Load existing template data when editing
  const { data: editTemplateData, isLoading: editTemplateLoading } = trpc.simulationTemplates.get.useQuery(
    { id: editId },
    { enabled: isEditMode && !!editId }
  );

  // Pre-fill form when editing an existing template (run once when data arrives)
  const [editFormApplied, setEditFormApplied] = useState(false);
  useEffect(() => {
    if (!isEditMode || !editTemplateData || editFormApplied) return;
    const tpl = editTemplateData;
    const rawSections = Array.isArray(tpl.sections) ? tpl.sections as Array<Partial<SimulationSection>> : [];
    setTitle(tpl.title);
    setDescription(tpl.description ?? '');
    setDurationMinutes(tpl.durationMinutes);
    setShowResults(tpl.showResults);
    setShowCorrectAnswers(tpl.showCorrectAnswers);
    setAllowReview(tpl.allowReview);
    setRandomizeOrder(tpl.randomizeOrder);
    setRandomizeAnswers(tpl.randomizeAnswers);
    _setUseQuestionPoints(tpl.useQuestionPoints);
    setCorrectPoints(tpl.correctPoints);
    setWrongPoints(tpl.wrongPoints);
    setBlankPoints(tpl.blankPoints);
    setMaxScore(tpl.maxScore);
    setPassingScore(tpl.passingScore);
    setIsRepeatable(tpl.isRepeatable);
    setMaxAttempts(tpl.maxAttempts);
    setIsSelfPracticeTemplate(Boolean(tpl.isSelfPracticeTemplate));
    setAssignedStudentIds((tpl.templateAssignments ?? []).map((assignment) => assignment.studentId).filter((id): id is string => Boolean(id)));
    setAssignedGroupIds((tpl.templateAssignments ?? []).map((assignment) => assignment.groupId).filter((id): id is string => Boolean(id)));
    setHasSections(true);
    setSectionMode('manual');
    setSections(rawSections.map((section, index) => {
      const subjectQuestionCounts = normalizeCountRecord((section as { subjectQuestionCounts?: Record<string, unknown> }).subjectQuestionCounts);
      const questionTypeCounts = normalizeCountRecord((section as { questionTypeCounts?: Record<string, unknown> }).questionTypeCounts);

      return {
        id: section.id ?? `section-${Date.now()}-${index}`,
        name: section.name ?? `Sezione ${index + 1}`,
        durationMinutes: section.durationMinutes ?? 10,
        questionCount: getSectionTargetQuestionCount({ ...section, subjectQuestionCounts }),
        subjectId: section.subjectId ?? null,
        subjectIds: (section as { subjectIds?: string[] }).subjectIds ?? (section.subjectId ? [section.subjectId] : []),
        subjectQuestionCounts,
        topicIds: section.topicIds ?? [],
        questionTypes: (section as { questionTypes?: TemplateQuestionTypeValue[] }).questionTypes ?? [],
        questionTypeCounts,
        difficultyLevels: (section as { difficultyLevels?: TemplateDifficultyValue[] }).difficultyLevels ?? [],
        tagIds: (section as { tagIds?: string[] }).tagIds ?? [],
        language: (section as { language?: 'IT' | 'EN' | null }).language ?? null,
        questionIds: [],
        order: section.order ?? index,
      };
    }));
    setRightPanelTab('sezioni');
    setEditFormApplied(true);
  }, [isEditMode, editTemplateData, editFormApplied]);

  // Questions query - include tag filter
  const { data: questionsData, isLoading: questionsLoading } = trpc.questions.getQuestions.useQuery({
    page: 1,
    pageSize: 100,
    search: questionSearchTerm || undefined,
    subjectIds: questionSubjectFilter ? [questionSubjectFilter] : undefined,
    types: questionTypeFilter ? [questionTypeFilter as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT'] : undefined,
    difficulties: questionDifficultyFilter ? [questionDifficultyFilter as 'EASY' | 'MEDIUM' | 'HARD'] : undefined,
    statuses: ['PUBLISHED'],
    tagIds: questionTagFilter.length > 0 ? questionTagFilter : undefined,
    languages: questionLanguageFilter ? [questionLanguageFilter as 'IT' | 'EN'] : undefined,
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

  const createTemplateMutation = trpc.simulationTemplates.create.useMutation({
    onSuccess: () => {
      showSuccess('Template creato', 'Il template è stato salvato come bozza. Pubblicalo dalla lista template quando è pronto.');
      utils.simulationTemplates.list.invalidate();
      router.push('/simulazioni');
    },
    onError: handleMutationError,
  });

  const updateTemplateMutation = trpc.simulationTemplates.update.useMutation({
    onSuccess: () => {
      showSuccess('Template aggiornato', 'Le modifiche al template sono state salvate.');
      utils.simulationTemplates.list.invalidate();
      if (editId) utils.simulationTemplates.get.invalidate({ id: editId });
      router.push('/simulazioni');
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

  const applyTemplateToForm = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setTitle('');
      setDescription('');
      applyPreset('PRACTICE');
      setSections([]);
      setSelectedQuestions([]);
      setRightPanelTab('domande');
      return;
    }

    const template = templatesData?.templates.find((item) => item.id === templateId);
    if (!template) return;

    const rawSections = Array.isArray(template.sections)
      ? template.sections as Array<Partial<SimulationSection>>
      : [];

    setTitle(template.title);
    setDescription(template.description ?? '');
    setDurationMinutes(template.durationMinutes);
    setShowResults(template.showResults);
    setShowCorrectAnswers(template.showCorrectAnswers);
    setAllowReview(template.allowReview);
    setRandomizeOrder(template.randomizeOrder);
    setRandomizeAnswers(template.randomizeAnswers);
    setCorrectPoints(template.correctPoints);
    setWrongPoints(template.wrongPoints);
    setBlankPoints(template.blankPoints);
    setMaxScore(template.maxScore);
    setPassingScore(template.passingScore);
    setIsRepeatable(template.isRepeatable);
    setMaxAttempts(template.maxAttempts);
    setHasSections(true);
    setSectionMode('manual');
    setSections(rawSections.map((section, index) => {
      const subjectQuestionCounts = normalizeCountRecord((section as { subjectQuestionCounts?: Record<string, unknown> }).subjectQuestionCounts);
      const questionTypeCounts = normalizeCountRecord((section as { questionTypeCounts?: Record<string, unknown> }).questionTypeCounts);

      return {
        id: section.id ?? `section-${Date.now()}-${index}`,
        name: section.name ?? `Sezione ${index + 1}`,
        durationMinutes: section.durationMinutes ?? 10,
        questionCount: getSectionTargetQuestionCount({ ...section, subjectQuestionCounts }),
        subjectId: section.subjectId ?? null,
        subjectIds: (section as { subjectIds?: string[] }).subjectIds ?? (section.subjectId ? [section.subjectId] : []),
        subjectQuestionCounts,
        topicIds: section.topicIds ?? [],
        questionTypes: (section as { questionTypes?: TemplateQuestionTypeValue[] }).questionTypes ?? [],
        questionTypeCounts,
        difficultyLevels: (section as { difficultyLevels?: TemplateDifficultyValue[] }).difficultyLevels ?? [],
        tagIds: (section as { tagIds?: string[] }).tagIds ?? [],
        language: (section as { language?: 'IT' | 'EN' | null }).language ?? null,
        questionIds: [],
        order: section.order ?? index,
      };
    }));
    setSelectedQuestions([]);
    setRightPanelTab('sezioni');
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

  // Remove all selected questions and clear all section assignments
  const clearAllQuestions = () => {
    setSelectedQuestions([]);
    setSections(prev => prev.map(s => ({ ...s, questionIds: [], questionCount: 0 })));
  };

  // Remove all questions belonging to a specific section
  const clearSectionQuestions = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const idsToRemove = new Set(section.questionIds ?? []);
    setSelectedQuestions(prev =>
      prev.filter(q => !idsToRemove.has(q.questionId)).map((q, i) => ({ ...q, order: i }))
    );
    setSections(prev =>
      prev.map(s => s.id === sectionId ? { ...s, questionIds: [], questionCount: 0 } : s)
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
      subjectIds: [],
      subjectQuestionCounts: {},
      topicIds: [],
      questionTypes: [],
      questionTypeCounts: {},
      difficultyLevels: [],
      tagIds: [],
      language: null,
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

  /**
   * Append a batch of randomly-picked questions to a section.
   * Adds them to selectedQuestions (if not already there) and assigns them
   * exclusively to the target section.
   */
  const applyPickedQuestionsToSection = (
    sectionId: string,
    picked: PickedQuestion[]
  ) => {
    if (picked.length === 0) return;

    // 1. Append to selectedQuestions (avoid duplicates)
    setSelectedQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.questionId));
      const toAdd = picked
        .filter((q) => !existingIds.has(q.id))
        .map<SelectedQuestion>((q, i) => ({
          questionId: q.id,
          order: prev.length + i,
          question: {
            id: q.id,
            text: q.text,
            type: q.type,
            difficulty: q.difficulty,
            subject: q.subject
              ? { name: q.subject.name, color: q.subject.color }
              : undefined,
            topic: q.topic ? { name: q.topic.name } : undefined,
          },
        }));
      return [...prev, ...toAdd];
    });

    // 2. Assign to section (remove from other sections first to keep exclusive)
    const pickedIds = picked.map((p) => p.id);
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          const merged = Array.from(
            new Set([...(s.questionIds || []), ...pickedIds])
          );
          return { ...s, questionIds: merged, questionCount: merged.length };
        }
        // Remove these IDs from other sections to keep assignment exclusive
        const cleaned = (s.questionIds || []).filter(
          (id) => !pickedIds.includes(id)
        );
        return { ...s, questionIds: cleaned, questionCount: cleaned.length };
      })
    );
  };

  // eslint-disable-next-line sonarjs/no-unused-vars -- utility for section management
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

  // Type for questions with answers for printing
  type PrintQuestion = {
    id: string;
    text: string;
    type: string;
    difficulty: string;
    imageUrl?: string | null;
    subject?: { name?: string | null; color?: string | null } | null;
    topic?: { name?: string | null } | null;
    answers: Array<{ id: string; text: string; isCorrect: boolean; order: number; imageUrl?: string | null }>;
  };

  // Generate auto sections based on question subjects
  const generateAutoSections = (questions: PrintQuestion[]): SimulationSection[] => {
    if (!hasSections) return [];
    
    // If manual mode with existing sections, return them
    if (sectionMode === 'manual' && sections.length > 0) {
      return sections;
    }
    
    // Auto mode: group questions by subject
    const subjectGroups = new Map<string, { name: string; questionIds: string[] }>();
    
    for (const q of questions) {
      const subjectName = q.subject?.name || 'Altro';
      if (!subjectGroups.has(subjectName)) {
        subjectGroups.set(subjectName, { name: subjectName, questionIds: [] });
      }
      subjectGroups.get(subjectName)!.questionIds.push(q.id);
    }
    
    // Convert to array and sort by name
    const autoSections: SimulationSection[] = Array.from(subjectGroups.entries()).map(([_, group], index) => ({
      id: `auto-${index}`,
      name: group.name,
      durationMinutes: Math.ceil((durationMinutes / questions.length) * group.questionIds.length),
      questionIds: group.questionIds,
      questionCount: group.questionIds.length,
      order: index,
    }));
    
    return autoSections;
  };

  // Get effective sections for rendering (manual or auto-generated)
  const getEffectiveSections = (questions: PrintQuestion[]): SimulationSection[] => {
    if (!hasSections) return [];
    // Use manual sections if available, otherwise fall back to auto-generated
    if (sectionMode === 'manual' && sections.length > 0) return sections;
    // Auto mode or manual mode with no sections: generate from subjects
    return generateAutoSections(questions);
  };

  // Open print window directly with questions
  const openPrintWindow = (questions: PrintQuestion[]) => {
    // Calculate academic year (current year → next year)
    const currentYear = new Date().getFullYear();
    const academicYearText = `Anno accademico ${currentYear}/${currentYear + 1}`;

    const escapeHtmlAttribute = (value: string) => value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

    const removeLatexImageReferences = (text: string) => text
      .replaceAll(/\\includegraphics(?:\[[^\]]*\])?\{[^}]+\}/g, '')
      .trim();

    const toPrintableImageSrc = (imageUrl?: string | null) => {
      if (!imageUrl?.trim()) return '';

      try {
        return new URL(imageUrl, window.location.origin).href;
      } catch {
        return imageUrl;
      }
    };

    const renderImage = (imageUrl?: string | null, className = 'question-image') => {
      const imageSrc = toPrintableImageSrc(imageUrl);
      if (!imageSrc) return '';

      return `<div class="${className}"><img src="${escapeHtmlAttribute(imageSrc)}" alt="Immagine" loading="eager" decoding="sync"></div>`;
    };
    
    // Get effective sections
    const effectiveSections = getEffectiveSections(questions);
    
    // Helper to render questions grouped by type
    const renderQuestionsByType = (
      questionsToRender: PrintQuestion[],
      startNumber: number,
      showTypeHeaders: boolean = true
    ): { html: string; nextNumber: number } => {
      let html = '';
      let questionNumber = startNumber;
      
      // Group by type
      const choiceQuestions = questionsToRender.filter(question => question.type !== 'OPEN_TEXT');
      const openText = questionsToRender.filter(q => q.type === 'OPEN_TEXT');
      
      // Render choice questions
      if (choiceQuestions.length > 0) {
        if (showTypeHeaders) html += `<div class="question-type-header">DOMANDE A RISPOSTA MULTIPLA</div>`;
        for (const question of choiceQuestions) {
          html += `<div class="question">`;
          html += `<div class="question-text"><strong>${questionNumber}.</strong> ${removeLatexImageReferences(question.text)}</div>`;
          html += renderImage(question.imageUrl);
          if (question.answers && question.answers.length > 0) {
            html += `<div class="answers">`;
            const sortedAnswers = [...question.answers].sort((firstAnswer, secondAnswer) => firstAnswer.order - secondAnswer.order);
            sortedAnswers.forEach((answer, idx) => {
              html += `<div class="answer"><strong>${String.fromCharCode(65 + idx)})</strong> ${removeLatexImageReferences(answer.text)}${renderImage(answer.imageUrl, 'answer-image')}</div>`;
            });
            html += `</div>`;
          }
          html += `</div>`;
          questionNumber++;
        }
      }
      
      // Render OPEN_TEXT
      if (openText.length > 0) {
        if (showTypeHeaders) html += `<div class="question-type-header">DOMANDE A RISPOSTA CON MODALITÀ A COMPLETAMENTO</div>`;
        for (const question of openText) {
          html += `<div class="question">`;
          html += `<div class="question-text"><strong>${questionNumber}.</strong> ${removeLatexImageReferences(question.text)}</div>`;
          html += renderImage(question.imageUrl);
          // Open questions don't have answer options - add space for answer
          html += `<div class="open-answer-space"></div>`;
          html += `</div>`;
          questionNumber++;
        }
      }
      
      return { html, nextNumber: questionNumber };
    };
    
    // Build questions HTML
    let questionsHtml = '';

    // Determine globally if multiple question types exist
    const hasMultipleTypes =
      questions.some(q => q.type !== 'OPEN_TEXT') &&
      questions.some(q => q.type === 'OPEN_TEXT');
    
    if (hasSections && showSectionsInPaper && effectiveSections.length > 0) {
      // Render with sections - grouped by type within each section
      const sortedSections = [...effectiveSections].sort((a, b) => a.order - b.order);

      // Count sections that actually have questions
      const sectionsWithQuestions = sortedSections.filter(section =>
        (section.questionIds || []).some(id => questions.find(q => q.id === id))
      );
      const showSectionHeaders = sectionsWithQuestions.length > 1;

      let globalQuestionNumber = 1;
      
      for (const section of sortedSections) {
        const sectionQuestionIds = section.questionIds || [];
        const sectionQuestions = sectionQuestionIds
          .map(id => questions.find(q => q.id === id))
          .filter((q): q is typeof questions[0] => q !== undefined);
        
        if (sectionQuestions.length === 0) continue;
        
        // Section header only if multiple sections
        if (showSectionHeaders) questionsHtml += `<div class="section-header">${section.name}</div>`;
        
        // Render questions grouped by type
        const result = renderQuestionsByType(sectionQuestions, globalQuestionNumber, hasMultipleTypes);
        questionsHtml += result.html;
        globalQuestionNumber = result.nextNumber;
      }
      
      // Unassigned questions (only for manual mode)
      const assignedIds = sortedSections.flatMap(s => s.questionIds || []);
      const unassigned = sectionMode === 'manual' 
        ? selectedQuestions.filter(sq => !assignedIds.includes(sq.questionId))
        : [];
      if (unassigned.length > 0) {
        const unassignedQuestions = unassigned
          .map(sq => questions.find(q => q.id === sq.questionId))
          .filter((q): q is typeof questions[0] => q !== undefined);
        
        questionsHtml += `<div class="section-header">ALTRE DOMANDE</div>`;
        const result = renderQuestionsByType(unassignedQuestions, globalQuestionNumber, hasMultipleTypes);
        questionsHtml += result.html;
        // globalQuestionNumber updated but not used after this point
      }
    } else {
      // Render without sections - just group by type
      const allQuestions = selectedQuestions
        .map(sq => questions.find(q => q.id === sq.questionId))
        .filter((q): q is typeof questions[0] => q !== undefined);
      
      const result = renderQuestionsByType(allQuestions, 1, hasMultipleTypes);
      questionsHtml = result.html;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title || 'Simulazione'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    /* Page setup and page number footer */
    @page { 
      size: A4; 
      margin: 10mm 15mm 20mm 15mm;

      @bottom-center {
        content: "Pagina " counter(page);
        font-family: 'Times New Roman', Times, serif;
        font-size: 10pt;
      }
    }
    
    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important;
      }
      .print-instruction { display: none !important; }
    }
    
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 11pt; 
      line-height: 1.4; 
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
      position: relative;
    }
    
    /* Page header - centered logo (first page only) */
    .page-header {
      text-align: center;
      margin-bottom: 15px;
    }
    .page-header-logo {
      width: 100px;
      height: auto;
      display: inline-block;
    }
    
    /* Watermark background logo */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.06;
      z-index: -1;
      width: 50%;
      max-width: 350px;
      pointer-events: none;
    }
    
    .container { 
      max-width: 100%; 
      padding: 0; 
      position: relative; 
      z-index: 1;
      margin-top: 0;
    }
    
    /* Description (centered, bold, underlined) */
    .description {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      text-align: center;
      text-decoration: underline;
      font-weight: bold;
      margin: 5px 0;
    }
    
    /* Academic year */
    .academic-year {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 10px;
    }
    
    /* Section header (e.g., FISICA E MATEMATICA) */
    .section-header {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      font-weight: bold;
      text-align: center;
      text-decoration: underline;
      margin: 25px 0 10px 0;
      text-transform: uppercase;
    }
    
    /* Question type header (e.g., DOMANDE A RISPOSTA MULTIPLA) */
    .question-type-header {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      font-weight: bold;
      text-align: center;
      text-decoration: underline;
      margin: 15px 0 12px 0;
      text-transform: uppercase;
    }
    
    /* Questions */
    .question { 
      margin-bottom: 14px; 
    }
    
    /* Open answer space for OPEN_TEXT questions */
    .open-answer-space {
      display: none;
    }
    .question-text { 
      margin-bottom: 4px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: bold;
    }
    .question-text strong {
      font-weight: bold;
    }
    .question-image {
      margin: 6px 0;
      text-align: center;
    }
    .question-image img,
    .answer-image img {
      max-width: 300px;
      max-height: 200px;
      height: auto;
    }
    .answer-image {
      margin: 4px 0 4px 25px;
    }
    .answers { 
      margin-left: 25px; 
      font-family: Arial, Helvetica, sans-serif;
    }
    .answer { 
      margin: 2px 0; 
      font-size: 11pt;
    }
    .answer strong {
      font-weight: bold;
    }
    
    /* Subscript and superscript */
    sub { font-size: 0.7em; vertical-align: sub; }
    sup { font-size: 0.7em; vertical-align: super; }
    
    /* KaTeX */
    .katex { font-size: 1em; }
    .katex-display { margin: 6px 0; }
    
    /* End of questions */
    .end-of-questions {
      text-align: center;
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      margin-top: 30px;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <!-- Header - centered logo (first page only) -->
  <div class="page-header">
    <img src="/images/Logo_testata_doc.png" alt="" class="page-header-logo">
  </div>
  
  <!-- Watermark logo -->
  <img src="/images/logo.png" alt="" class="watermark">
  
  <div class="container">
    <!-- Description -->
    ${description ? `<div class="description">${description}</div>` : ''}
    
    <div class="academic-year">${academicYearText}</div>
    
    ${questionsHtml}
    <div class="end-of-questions">********** FINE DELLE DOMANDE **********</div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"><\/script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\\\[', right: '\\\\]', display: true},
          {left: '\\\\(', right: '\\\\)', display: false}
        ],
        throwOnError: false
      });
      const imageLoaders = Array.from(document.images).map(function(image) {
        if (image.complete) {
          if (image.naturalWidth === 0) {
            const imageWrapper = image.closest('.question-image, .answer-image');
            if (imageWrapper) imageWrapper.remove();
          }
          return Promise.resolve();
        }

        return new Promise(function(resolve) {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', function() {
            const imageWrapper = image.closest('.question-image, .answer-image');
            if (imageWrapper) imageWrapper.remove();
            resolve(undefined);
          }, { once: true });
        });
      });
      const imageTimeout = new Promise(function(resolve) {
        setTimeout(resolve, 3000);
      });

      Promise.race([Promise.all(imageLoaders), imageTimeout]).then(function() {
        setTimeout(function() { window.print(); }, 100);
      });
    });
  <\/script>
</body>
</html>
      `);
      printWindow.document.close();
    }
  };

  // Fetch questions with answers utility (using refetch)
  const questionsWithAnswersQuery = trpc.questions.getQuestionsWithAnswers.useQuery(
    { questionIds: selectedQuestions.map(sq => sq.questionId) },
    { enabled: false } // Disabled by default, we'll call refetch manually
  );


  // Handle PDF preview - fetch complete question data with answers
  // eslint-disable-next-line sonarjs/no-unused-vars -- handler reserved for PDF preview button
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
          // Sections support
          hasSections,
          showSectionsInPaper,
          sections: hasSections ? sections.map(s => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            questionIds: s.questionIds || [],
            subjectId: s.subjectId,
            order: s.order,
          })) : undefined,
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
        return creationMode === 'template' || !!simulationType;
      case 1: // Config
        return !!title && durationMinutes >= 0 && (
          creationMode !== 'template'
          || !isSelfPracticeTemplate
          || assignedStudentIds.length > 0
          || assignedGroupIds.length > 0
        );
      case 2: // Questions
        if (creationMode === 'template') {
          return sections.length > 0 && sections.every((section) => (section.questionCount || 0) > 0);
        }
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
      if (creationMode === 'template') {
        const templateSections = sections.map((section, index) => ({
          ...section,
          order: index,
          questionIds: [],
          topicIds: section.topicIds ?? [],
          subjectIds: section.subjectIds ?? (section.subjectId ? [section.subjectId] : []),
          subjectQuestionCounts: section.subjectQuestionCounts ?? {},
          questionTypes: section.questionTypes ?? [],
          questionTypeCounts: section.questionTypeCounts ?? {},
          difficultyLevels: section.difficultyLevels ?? [],
          tagIds: section.tagIds ?? [],
          language: section.language ?? null,
          questionCount: section.questionCount || 0,
        }));

        await (isEditMode && editId
          ? updateTemplateMutation.mutateAsync({
              id: editId,
              title,
              description: description || undefined,
              durationMinutes,
              totalQuestions: templateSections.reduce((sum, section) => sum + section.questionCount, 0),
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
              hasSections: true,
              isSelfPracticeTemplate,
              assignedStudentIds: isSelfPracticeTemplate ? assignedStudentIds : [],
              assignedGroupIds: isSelfPracticeTemplate ? assignedGroupIds : [],
              sections: templateSections,
            })
          : createTemplateMutation.mutateAsync({
              title,
              description: description || undefined,
              durationMinutes,
              totalQuestions: templateSections.reduce((sum, section) => sum + section.questionCount, 0),
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
              hasSections: true,
              isSelfPracticeTemplate,
              assignedStudentIds: isSelfPracticeTemplate ? assignedStudentIds : [],
              assignedGroupIds: isSelfPracticeTemplate ? assignedGroupIds : [],
              sections: templateSections,
            }));
        return;
      }

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
        showSectionsInPaper,
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
        sourceTemplateId: selectedTemplateId || undefined,
        assignments: [], // Assignments added post-creation
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Render step content - complexity is inherent to multi-step wizard design
  // Each case renders a complete step UI with its own form sections
  // eslint-disable-next-line sonarjs/cognitive-complexity -- Multi-step wizard pattern requires switch with complex cases
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                {creationMode === 'template' ? 'Nuovo template' : 'Nuova simulazione'}
              </h2>
              <p className={`mt-1 text-sm ${colors.text.muted}`}>
                {creationMode === 'template'
                  ? 'Crea una struttura riutilizzabile con impostazioni e sezioni, senza legarla a ufficiale o esercitazione.'
                  : 'Scegli il tipo della simulazione. Puoi partire da zero o usare un template già salvato.'}
              </p>
              {userRole === 'COLLABORATOR' && (
                <p className={`mt-2 text-sm ${colors.text.muted} flex items-start gap-2`}>
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Come collaboratore puoi creare tutti i tipi di simulazione, ma non potrai modificarle o eliminarle dopo la creazione.</span>
                </p>
              )}
            </div>

            {creationMode === 'simulation' && templatesData && templatesData.templates.length > 0 && (
              <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                <CustomSelect
                  label="Parti da un template (opzionale)"
                  value={selectedTemplateId}
                  onChange={applyTemplateToForm}
                  options={[
                    { value: '', label: 'Parti da zero' },
                    ...templatesData.templates.map((template) => ({
                      value: template.id,
                      label: `${template.title} (${template.totalQuestions} domande previste)`,
                    })),
                  ]}
                  placeholder="Parti da zero"
                />

                {/* Template preview panel */}
                {selectedTemplateId && (() => {
                  const tpl = templatesData.templates.find((t) => t.id === selectedTemplateId);
                  if (!tpl) return null;
                  const rawSections = Array.isArray(tpl.sections)
                    ? tpl.sections as Array<Partial<SimulationSection>>
                    : [];
                  const repeatableLabel = tpl.isRepeatable
                    ? `Sì${tpl.maxAttempts ? ' (max ' + tpl.maxAttempts + ')' : ''}`
                    : 'No';
                  const settingRows: { label: string; value: string }[] = [
                    { label: 'Mostra risultati', value: tpl.showResults ? 'Sì' : 'No' },
                    { label: 'Mostra risposte corrette', value: tpl.showCorrectAnswers ? 'Sì' : 'No' },
                    { label: 'Revisione risposte', value: tpl.allowReview ? 'Sì' : 'No' },
                    { label: 'Ordine casuale domande', value: tpl.randomizeOrder ? 'Sì' : 'No' },
                    { label: 'Ordine casuale risposte', value: tpl.randomizeAnswers ? 'Sì' : 'No' },
                    { label: 'Ripetibile', value: repeatableLabel },
                    { label: 'Punti corretta', value: String(tpl.correctPoints) },
                    { label: 'Punti errata', value: String(tpl.wrongPoints) },
                    { label: 'Punti bianca', value: String(tpl.blankPoints) },
                    ...(tpl.maxScore !== null ? [{ label: 'Punteggio massimo', value: String(tpl.maxScore) }] : []),
                    ...(tpl.passingScore !== null ? [{ label: 'Punteggio sufficienza', value: String(tpl.passingScore) }] : []),
                  ];
                  return (
                    <div className={`mt-4 pt-4 border-t ${colors.border.light}`}>
                      <h4 className={`text-sm font-semibold ${colors.text.primary} mb-3 flex items-center gap-2`}>
                        <Info className="w-4 h-4 text-blue-500" />
                        Dettagli template
                      </h4>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className={`p-3 rounded-lg ${colors.background.tertiary} text-center`}>
                          <div className={`text-lg font-bold ${colors.text.primary}`}>{tpl.totalQuestions}</div>
                          <div className={`text-xs ${colors.text.muted}`}>Domande</div>
                        </div>
                        <div className={`p-3 rounded-lg ${colors.background.tertiary} text-center`}>
                          <div className={`text-lg font-bold ${colors.text.primary}`}>{tpl.durationMinutes}</div>
                          <div className={`text-xs ${colors.text.muted}`}>Minuti totali</div>
                        </div>
                        <div className={`p-3 rounded-lg ${colors.background.tertiary} text-center`}>
                          <div className={`text-lg font-bold ${colors.text.primary}`}>{rawSections.length}</div>
                          <div className={`text-xs ${colors.text.muted}`}>Sezioni</div>
                        </div>
                      </div>

                      {/* Settings grid */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-4">
                        {settingRows.map((row) => (
                          <div key={row.label} className="flex items-center justify-between gap-2">
                            <span className={`text-xs ${colors.text.muted}`}>{row.label}</span>
                            <span className={`text-xs font-medium ${colors.text.secondary}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Sections list */}
                      {rawSections.length > 0 && (
                        <div>
                          <p className={`text-xs font-semibold ${colors.text.muted} uppercase tracking-wide mb-2`}>Sezioni</p>
                          <div className="space-y-1.5">
                            {rawSections.map((section, i) => (
                              <div key={section.id ?? i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${colors.background.tertiary}`}>
                                <div className="flex items-center gap-2">
                                  <Layers className={`w-3.5 h-3.5 ${colors.text.muted}`} />
                                  <span className={`text-sm ${colors.text.primary}`}>{section.name ?? `Sezione ${i + 1}`}</span>
                                </div>
                                <div className={`flex items-center gap-3 text-xs ${colors.text.muted}`}>
                                  <span>{section.questionCount ?? 0} domande</span>
                                  <span><Clock className="w-3 h-3 inline mr-0.5" />{section.durationMinutes ?? 0} min</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tpl.description && (
                        <p className={`mt-3 text-xs ${colors.text.muted} italic`}>{tpl.description}</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {creationMode === 'template' ? (
              <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light} flex items-start gap-3`}>
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className={`font-semibold ${colors.text.primary}`}>Template indipendente dal tipo</h3>
                  <p className={`mt-1 text-sm ${colors.text.muted}`}>
                    Ufficiale o esercitazione si sceglie solo quando crei la simulazione. Il template resta valido per entrambe.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className={`font-semibold ${colors.text.primary} mb-3`}>
                  Tipo simulazione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {primaryTypeOptions.map((option) => (
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
              </div>
            )}
            
            {/* Paper-based option */}
            {creationMode === 'simulation' && (
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
            )}
            
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
              {creationMode === 'template' ? 'Impostazioni template' : 'Configurazione simulazione'}
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
                {creationMode === 'template' && (
                  <div className={`md:col-span-2 rounded-xl border ${colors.border.light} ${colors.background.secondary} p-4 space-y-4`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="isSelfPracticeTemplate"
                        checked={isSelfPracticeTemplate}
                        onChange={(e) => {
                          setIsSelfPracticeTemplate(e.target.checked);
                          if (!e.target.checked) {
                            setAssignedStudentIds([]);
                            setAssignedGroupIds([]);
                          }
                        }}
                      />
                      <div>
                        <label htmlFor="isSelfPracticeTemplate" className={`font-medium ${colors.text.primary} cursor-pointer`}>
                          Template per autoesercitazione studente
                        </label>
                        <p className={`mt-1 text-sm ${colors.text.muted}`}>
                          Se attivo, gli studenti assegnati vedranno questo template nel menu Autoesercitazione della dashboard.
                        </p>
                      </div>
                    </div>

                    {isSelfPracticeTemplate && (
                      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {/* ── Studenti ── */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`text-sm font-semibold ${colors.text.primary}`}>
                              Studenti
                            </h4>
                            <span className={`text-xs ${colors.text.muted}`}>{assignedStudentIds.length} selezionati</span>
                          </div>

                          {/* Search + group filter */}
                          <div className="flex gap-2 mb-2">
                            <div className="relative flex-1">
                              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${colors.text.muted}`} />
                              <input
                                type="text"
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                placeholder="Cerca per nome…"
                                className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                              />
                            </div>
                            <CustomSelect
                              value={studentGroupFilter}
                              onChange={(value) => setStudentGroupFilter(value)}
                              options={[
                                { value: '', label: 'Tutti i gruppi' },
                                ...(templateGroupsData ?? []).map((g) => ({ value: g.id, label: g.name })),
                              ]}
                              className="min-w-[140px]"
                            />                          </div>

                          <div className={`rounded-lg border ${colors.border.light} ${colors.background.card} max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700`}>
                            {filteredTemplateStudents.length === 0 ? (
                              <p className={`p-3 text-sm ${colors.text.muted}`}>Nessuno studente trovato</p>
                            ) : (
                              filteredTemplateStudents.map((student) => {
                                if (!student.studentId) return null;
                                const checked = assignedStudentIds.includes(student.studentId);
                                return (
                                  <label key={student.studentId} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:${colors.background.secondary}`}>
                                    <Checkbox
                                      id={`spt-student-${student.studentId}`}
                                      checked={checked}
                                      onChange={(e) => {
                                        setAssignedStudentIds((prev) => e.target.checked
                                          ? [...prev, student.studentId!]
                                          : prev.filter((id) => id !== student.studentId));
                                      }}
                                    />
                                    <span className={`text-sm ${colors.text.primary}`}>{student.name}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* ── Gruppi ── */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`text-sm font-semibold ${colors.text.primary}`}>Gruppi</h4>
                            <span className={`text-xs ${colors.text.muted}`}>{assignedGroupIds.length} selezionati</span>
                          </div>
                          <div className={`rounded-lg border ${colors.border.light} ${colors.background.card} divide-y divide-gray-100 dark:divide-slate-700`}>
                            {(templateGroupsData ?? []).length === 0 ? (
                              <p className={`p-3 text-sm ${colors.text.muted}`}>Nessun gruppo disponibile</p>
                            ) : (
                              (templateGroupsData ?? []).map((group) => {
                                const checked = assignedGroupIds.includes(group.id);
                                const isExpanded = expandedGroupIds.has(group.id);
                                const studentMembersList = group.studentMembers ?? [];
                                const referentNames: string[] = Array.from(
                                  new Map([
                                    ...(group.referenceCollaborator ? [[`${group.referenceCollaborator.user.name}-COLLABORATOR`, `${group.referenceCollaborator.user.name} (Collaboratore)`]] : []),
                                    ...(group.referenceAdmin ? [[`${group.referenceAdmin.user.name}-ADMIN`, `${group.referenceAdmin.user.name} (Admin)`]] : []),
                                    ...((group.referenceCollaborators ?? []).map((rc) => [`${rc.collaborator.user.name}-COLLABORATOR`, `${rc.collaborator.user.name} (Collaboratore)`])),
                                    ...((group.referenceAdmins ?? []).map((ra) => [`${ra.admin.user.name}-ADMIN`, `${ra.admin.user.name} (Admin)`])),
                                  ] as [string, string][]).values()
                                );
                                return (
                                  <div key={group.id}>
                                    <div className={`flex items-center gap-3 px-3 py-2 hover:${colors.background.secondary}`}>
                                      <Checkbox
                                        id={`spt-group-${group.id}`}
                                        checked={checked}
                                        onChange={(e) => {
                                          setAssignedGroupIds((prev) => e.target.checked
                                            ? [...prev, group.id]
                                            : prev.filter((id) => id !== group.id));
                                        }}
                                      />
                                      <label htmlFor={`spt-group-${group.id}`} className={`flex-1 text-sm ${colors.text.primary} cursor-pointer`}>
                                        {group.name}
                                      </label>
                                      <span className={`text-xs ${colors.text.muted}`}>{group.memberCount} studenti</span>
                                      <button
                                        type="button"
                                        onClick={() => setExpandedGroupIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(group.id)) {
                                            next.delete(group.id);
                                          } else {
                                            next.add(group.id);
                                          }
                                          return next;
                                        })}
                                        className={`p-0.5 rounded ${colors.text.muted} hover:${colors.text.secondary}`}
                                        aria-label={isExpanded ? 'Nascondi dettagli' : 'Mostra dettagli'}
                                      >
                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                    {isExpanded && (
                                      <div className={`px-4 pb-3 pt-1 space-y-2 ${colors.background.secondary} border-t border-gray-100 dark:border-slate-700`}>
                                        {referentNames.length > 0 && (
                                          <div>
                                            <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>Referenti</p>
                                            <ul className="space-y-0.5">
                                              {referentNames.map((name, i) => (
                                                <li key={i} className={`text-xs ${colors.text.secondary} flex items-center gap-1.5`}>
                                                  <Users className="w-3 h-3 flex-shrink-0" />
                                                  {name}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {studentMembersList.length > 0 && (
                                          <div>
                                            <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>Studenti partecipanti ({studentMembersList.length})</p>
                                            <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                                              {studentMembersList.map((member) => (
                                                <li key={member.id} className={`text-xs ${colors.text.secondary}`}>{member.name}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {referentNames.length === 0 && studentMembersList.length === 0 && (
                                          <p className={`text-xs ${colors.text.muted}`}>Nessun membro</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                <NumericInput
                  value={durationMinutes}
                  onValueChange={(value) => {
                    if (value !== null) {
                      setDurationMinutes(value);
                    }
                  }}
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
                  <NumericInput
                    value={correctPoints}
                    onValueChange={(value) => {
                      if (value !== null) {
                        setCorrectPoints(value);
                      }
                    }}
                    parseMode="float"
                    step={0.1}
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Risposta errata
                  </label>
                  <NumericInput
                    value={wrongPoints}
                    onValueChange={(value) => {
                      if (value !== null) {
                        setWrongPoints(value);
                      }
                    }}
                    parseMode="float"
                    step={0.1}
                    max={0}
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Non risposta
                  </label>
                  <NumericInput
                    value={blankPoints}
                    onValueChange={(value) => {
                      if (value !== null) {
                        setBlankPoints(value);
                      }
                    }}
                    parseMode="float"
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
                  <NumericInput
                    value={maxScore}
                    onValueChange={setMaxScore}
                    allowEmpty
                    parseMode="float"
                    step={0.1}
                    placeholder="Calcolato automaticamente"
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                    Punteggio minimo per passare
                  </label>
                  <NumericInput
                    value={passingScore}
                    onValueChange={setPassingScore}
                    allowEmpty
                    parseMode="float"
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
                  <NumericInput
                    value={maxAttempts}
                    onValueChange={setMaxAttempts}
                    allowEmpty
                    min={1}
                    placeholder="Illimitati"
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
              )}
            </div>

            {/* Anti-cheat settings (only for online simulations) */}
            {creationMode === 'simulation' && !isPaperBased && (
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
                    checked={creationMode === 'template' || hasSections}
                    disabled={creationMode === 'template'}
                    onChange={(e) => {
                      if (creationMode === 'template') return;
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
                      {creationMode === 'template'
                        ? 'I template salvano la struttura delle sezioni e il numero di domande previsto per ciascuna.'
                        : 'Dividi la simulazione in sezioni con tempi e domande specifiche (es. Comprensione del testo, Biologia, Chimica...)'}
                    </p>
                    
                    {(creationMode === 'template' || hasSections) && (
                      <div className="mt-4 space-y-4">
                        {/* Section mode toggle */}
                        {creationMode === 'simulation' && (
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
                        )}

                        {creationMode === 'simulation' && sectionMode === 'auto' && (
                          <p className={`text-xs ${colors.text.muted} italic`}>
                            Le sezioni verranno create automaticamente in base alla materia di ciascuna domanda.
                          </p>
                        )}

                        {(creationMode === 'template' || sectionMode === 'manual') && (
                          <div className="space-y-3">
                            <p className={`text-xs ${colors.text.muted} italic`}>
                              {creationMode === 'template'
                                ? 'Crea le sezioni del template e indica quante domande dovrà contenere ciascuna.'
                                : 'Crea le sezioni qui e assegna le domande nel passo successivo.'}
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
                                      <NumericInput
                                        value={section.durationMinutes}
                                        onValueChange={(value) => {
                                          if (value !== null) {
                                            updateSection(section.id, { durationMinutes: value });
                                          }
                                        }}
                                        className={`w-16 px-2 py-1 rounded border ${colors.border.input} ${colors.background.input} ${colors.text.primary} text-sm text-center`}
                                        min="1"
                                      />
                                      <span className={`text-xs ${colors.text.muted}`}>min</span>
                                    </div>
                                    
                                    {creationMode === 'template' ? (
                                      <div className="flex items-center gap-1">
                                        <Target className="w-3 h-3 text-gray-400" />
                                        <NumericInput
                                          value={section.questionCount || 0}
                                          onValueChange={(value) => {
                                            if (value !== null) {
                                              updateSection(section.id, { questionCount: value });
                                            }
                                          }}
                                          className={`w-16 px-2 py-1 rounded border ${colors.border.input} ${colors.background.input} ${colors.text.primary} text-sm text-center`}
                                          min="1"
                                        />
                                        <span className={`text-xs ${colors.text.muted}`}>domande</span>
                                      </div>
                                    ) : (
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        getSectionTargetQuestionCount(section) > 0 
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                      }`}>
                                        {getSectionTargetQuestionCount(section)} domande
                                      </span>
                                    )}
                                    
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
                        
                        {/* Show sections in paper PDF toggle - visible when paper mode is enabled */}
                        {creationMode === 'simulation' && isPaperBased && (
                          <div className={`mt-4 pt-4 border-t ${colors.border.light}`}>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="showSectionsInPaper"
                                checked={showSectionsInPaper}
                                onChange={(e) => setShowSectionsInPaper(e.target.checked)}
                              />
                              <div className="flex-1">
                                <label htmlFor="showSectionsInPaper" className={`font-medium ${colors.text.primary} cursor-pointer`}>
                                  Mostra sezioni nel PDF cartaceo
                                </label>
                                <p className={`text-sm ${colors.text.muted} mt-0.5`}>
                                  Visualizza i separatori di sezione con il nome nel PDF stampato
                                </p>
                              </div>
                            </div>
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
        if (creationMode === 'template') {
          const totalTemplateQuestions = sections.reduce((sum, section) => sum + (section.questionCount || 0), 0);
          const templateSubjects = (subjectsData ?? []) as TemplateSubjectItem[];

          return (
            <div className="space-y-6">
              <div>
                <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                  Sezioni del template
                </h2>
                <p className={`mt-1 text-sm ${colors.text.muted}`}>
                  Qui definisci solo la struttura: le domande verranno scelte quando creerai una simulazione da questo template.
                </p>
              </div>

              <div className={`rounded-xl border ${colors.border.light} overflow-hidden`}>
                <div className={`px-4 py-3 ${colors.background.secondary} border-b ${colors.border.light} flex items-center justify-between gap-3`}>
                  <span className={`font-medium ${colors.text.primary}`}>{sections.length} sezioni</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {totalTemplateQuestions} domande previste
                  </span>
                </div>

                {sections.length === 0 ? (
                  <div className="p-8 text-center">
                    <Layers className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className={colors.text.muted}>Nessuna sezione creata</p>
                    <p className={`text-sm ${colors.text.muted}`}>Torna alla configurazione e aggiungi almeno una sezione.</p>
                  </div>
                ) : (
                  <div className={`divide-y ${colors.border.light}`}>
                    {sections.map((section, index) => {
                      const sectionLanguage = (section.language ?? '') as TemplateLanguageFilter;
                      const selectedSubjectIds = section.subjectIds ?? (section.subjectId ? [section.subjectId] : []);
                      const languageFilteredSubjects = filterTemplateSubjectsByLanguage(templateSubjects, sectionLanguage);
                      const topicOptions = getTemplateTopicOptions(languageFilteredSubjects, selectedSubjectIds, sectionLanguage);
                      const hasLanguageFilter = Boolean(sectionLanguage);

                      return (
                      <div key={section.id} className={`px-4 py-4 ${colors.background.card}`}>
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className={`font-medium ${colors.text.primary} truncate`}>{section.name}</p>
                                <p className={`text-xs ${colors.text.muted}`}>{section.durationMinutes} minuti</p>
                              </div>
                            </div>

                            <label className="flex items-center gap-2 flex-shrink-0 lg:justify-end">
                              <span className={`text-xs ${colors.text.muted}`}>Domande</span>
                              <input
                                type="number"
                                value={section.questionCount || 0}
                                onChange={(e) => {
                                  const total = parseInt(e.target.value) || 0;
                                  const ids = section.subjectIds ?? [];
                                  const selectedTypes = section.questionTypes ?? [];
                                  const updates: Partial<SimulationSection> = { questionCount: total };
                                  if (ids.length > 1) {
                                    updates.subjectQuestionCounts = distributeCountEvenly(total, ids);
                                  }
                                  if (selectedTypes.length > 1) {
                                    updates.questionTypeCounts = distributeCountEvenly(total, selectedTypes);
                                  }
                                  updateSection(section.id, updates);
                                }}
                                min={0}
                                className={`w-20 px-2 py-1.5 rounded-lg border ${colors.border.input} ${colors.background.input} ${colors.text.primary} text-sm text-center`}
                              />
                            </label>
                          </div>

                          <div className={`rounded-lg border ${colors.border.light} ${colors.background.secondary} p-4 space-y-4`}>
                            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
                              <CustomSelect
                                label="Lingua"
                                value={section.language ?? ''}
                                onChange={(value) => {
                                  const nextLanguage = value as TemplateLanguageFilter;
                                  const nextSubjects = filterTemplateSubjectsByLanguage(templateSubjects, nextLanguage);
                                  const availableSubjectIds = new Set(nextSubjects.map((subject) => subject.id));
                                  const nextSubjectIds = selectedSubjectIds.filter((subjectId) => availableSubjectIds.has(subjectId));
                                  const nextTopicOptions = getTemplateTopicOptions(nextSubjects, nextSubjectIds, nextLanguage);
                                  const availableTopicIds = new Set(nextTopicOptions.map((topic) => topic.value));
                                  const total = section.questionCount ?? 0;

                                  updateSection(section.id, {
                                    language: nextLanguage || null,
                                    subjectIds: nextSubjectIds,
                                    subjectId: nextSubjectIds.length === 1 ? nextSubjectIds[0] : null,
                                    subjectQuestionCounts: nextSubjectIds.length > 1 ? distributeCountEvenly(total, nextSubjectIds) : {},
                                    topicIds: (section.topicIds ?? []).filter((topicId) => availableTopicIds.has(topicId)),
                                  });
                                }}
                                options={TEMPLATE_LANGUAGE_OPTIONS}
                                placeholder="Tutte le lingue"
                                size="sm"
                              />

                              <MultiSelect
                                label="Materie"
                                values={selectedSubjectIds}
                                options={buildTemplateSubjectOptions(languageFilteredSubjects, sectionLanguage)}
                                onChange={(vals) => {
                                  const total = section.questionCount ?? 0;
                                  const nextTopicOptions = getTemplateTopicOptions(languageFilteredSubjects, vals, sectionLanguage);
                                  const availableTopicIds = new Set(nextTopicOptions.map((topic) => topic.value));
                                  updateSection(section.id, {
                                    subjectIds: vals,
                                    subjectId: vals.length === 1 ? vals[0] : null,
                                    subjectQuestionCounts: vals.length > 1 ? distributeCountEvenly(total, vals) : {},
                                    topicIds: (section.topicIds ?? []).filter((topicId) => availableTopicIds.has(topicId)),
                                  });
                                }}
                                placeholder={hasLanguageFilter ? `Materie con domande ${sectionLanguage}` : 'Tutte le materie'}
                                size="sm"
                              />
                            </div>

                            {hasLanguageFilter && (
                              <p className={`text-xs ${colors.text.muted}`}>
                                Sono disponibili solo materie e argomenti con almeno una domanda pubblicata in {TEMPLATE_LANGUAGE_LABELS[sectionLanguage as TemplateLanguageValue]}.
                              </p>
                            )}

                            {selectedSubjectIds.length > 0 && (
                              topicOptions.length > 0 ? (
                                <MultiSelect
                                  label="Argomenti"
                                  values={(section.topicIds ?? []).filter((topicId) => topicOptions.some((option) => option.value === topicId))}
                                  options={topicOptions}
                                  onChange={(vals) => updateSection(section.id, { topicIds: vals })}
                                  placeholder="Tutti gli argomenti"
                                  size="sm"
                                />
                              ) : (
                                <div className={`rounded-lg border ${colors.border.light} ${colors.background.input} px-3 py-2 text-xs ${colors.text.muted}`}>
                                  Nessun argomento disponibile per le materie e la lingua selezionate.
                                </div>
                              )
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              <MultiSelect
                                label="Tipologia domanda"
                                values={section.questionTypes ?? []}
                                options={TEMPLATE_QUESTION_TYPE_OPTIONS}
                                onChange={(vals) => {
                                  const selectedTypes = vals as TemplateQuestionTypeValue[];
                                  const total = section.questionCount ?? 0;
                                  updateSection(section.id, {
                                    questionTypes: selectedTypes,
                                    questionTypeCounts: selectedTypes.length > 1 ? distributeCountEvenly(total, selectedTypes) : {},
                                  });
                                }}
                                placeholder="Tutte le tipologie"
                                size="sm"
                              />

                              <MultiSelect
                                label="Difficoltà"
                                values={section.difficultyLevels ?? []}
                                options={TEMPLATE_DIFFICULTY_OPTIONS}
                                onChange={(vals) => updateSection(section.id, { difficultyLevels: vals as TemplateDifficultyValue[] })}
                                placeholder="Tutte le difficoltà"
                                size="sm"
                              />

                              {tagCategoriesData && tagCategoriesData.length > 0 && (
                                <MultiSelect
                                  label="Tag"
                                  values={section.tagIds ?? []}
                                  options={tagCategoriesData.flatMap((category) =>
                                    category.tags.map((tag) => ({
                                      value: tag.id,
                                      label: tagCategoriesData.length > 1 ? `${tag.name} (${category.name})` : tag.name,
                                      color: tag.color ?? undefined,
                                    }))
                                  )}
                                  onChange={(vals) => updateSection(section.id, { tagIds: vals })}
                                  placeholder="Tutti i tag"
                                  size="sm"
                                />
                              )}
                            </div>

                            {(section.questionTypes ?? []).length > 1 && (
                              <div className={`rounded-lg border ${colors.border.light} ${colors.background.input} p-3`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className={`text-xs font-medium ${colors.text.muted}`}>Distribuzione per tipologia</p>
                                  <div className={`text-xs ${getCountTotal(section.questionTypeCounts) > (section.questionCount ?? 0) ? 'text-red-500' : colors.text.muted}`}>
                                    {getCountTotal(section.questionTypeCounts)} / {section.questionCount ?? 0}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                  {(section.questionTypes ?? []).map((type) => {
                                    const val = (section.questionTypeCounts ?? {})[type] ?? 0;
                                    const total = section.questionCount ?? 0;
                                    const otherTotal = getCountTotal(section.questionTypeCounts) - val;
                                    return (
                                      <div key={type} className="flex items-center gap-1">
                                        <span className={`text-xs ${colors.text.secondary}`}>{TEMPLATE_QUESTION_TYPE_LABELS[type]}:</span>
                                        <input
                                          type="number"
                                          min={0}
                                          max={Math.max(0, total - otherTotal)}
                                          value={val}
                                          onChange={(e) => {
                                            const parsed = parseInt(e.target.value, 10) || 0;
                                            const capped = Math.min(parsed, Math.max(0, total - otherTotal));
                                            updateSection(section.id, {
                                              questionTypeCounts: { ...(section.questionTypeCounts ?? {}), [type]: capped },
                                            });
                                          }}
                                          className={`w-14 px-1 py-0.5 rounded border ${colors.border.input} ${colors.background.secondary} ${colors.text.primary} text-xs text-center`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                {getCountTotal(section.questionTypeCounts) < (section.questionCount ?? 0) && (
                                  <p className={`mt-2 text-xs ${colors.text.muted}`}>
                                    {(section.questionCount ?? 0) - getCountTotal(section.questionTypeCounts)} domande restano casuali tra le tipologie selezionate.
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Editable per-subject distribution when 2+ subjects */}
                            {selectedSubjectIds.length > 1 && (
                              <div className={`rounded-lg border ${colors.border.light} ${colors.background.input} p-3`}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className={`text-xs font-medium ${colors.text.muted}`}>Distribuzione domande</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const total = section.questionCount ?? 0;
                                      updateSection(section.id, { subjectQuestionCounts: distributeCountEvenly(total, selectedSubjectIds) });
                                    }}
                                    className={`text-xs ${colors.text.muted} hover:${colors.text.primary} transition-colors flex items-center gap-1`}
                                    title="Ribilancia equamente"
                                  >
                                    Ribilancia
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                  {selectedSubjectIds.map((sid) => {
                                    const subjectName = languageFilteredSubjects.find((s) => s.id === sid)?.name ?? sid;
                                    const val = (section.subjectQuestionCounts ?? {})[sid] ?? 0;
                                    return (
                                      <div key={sid} className="flex items-center gap-1">
                                        <span className={`text-xs ${colors.text.secondary}`}>{subjectName}:</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={val}
                                          onChange={(e) => {
                                            const newVal = parseInt(e.target.value) || 0;
                                            const newCounts = { ...(section.subjectQuestionCounts ?? {}), [sid]: newVal };
                                            const newTotal = Object.values(newCounts).reduce((a, b) => a + b, 0);
                                            updateSection(section.id, {
                                              subjectQuestionCounts: newCounts,
                                              questionCount: newTotal,
                                              ...(section.questionTypes && section.questionTypes.length > 1
                                                ? { questionTypeCounts: distributeCountEvenly(newTotal, section.questionTypes) }
                                                : {}),
                                            });
                                          }}
                                          className={`w-14 px-1 py-0.5 rounded border ${colors.border.input} ${colors.background.secondary} ${colors.text.primary} text-xs text-center`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
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
          );
        }

        return (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                Seleziona le domande ({selectedQuestions.length} selezionate)
              </h2>
              <p className={`mt-1 text-sm ${colors.text.muted}`}>
                Aggiungi le domande con i filtri a sinistra; se usi le sezioni, assegnale dal pannello a destra.
              </p>
            </div>

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          value={questionTypeFilter}
                          onChange={(value) => setQuestionTypeFilter(value as QuestionTypeFilter)}
                          options={[
                            { value: '', label: 'Tutte le tipologie' },
                            { value: 'SINGLE_CHOICE', label: 'Risposta singola' },
                            { value: 'MULTIPLE_CHOICE', label: 'Risposta multipla' },
                            { value: 'OPEN_TEXT', label: 'Risposta aperta' },
                          ]}
                          placeholder="Tutte le tipologie"
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
                      <div className="flex-1">
                        <CustomSelect
                          value={questionLanguageFilter}
                          onChange={setQuestionLanguageFilter}
                          options={[
                            { value: '', label: 'Tutte le lingue' },
                            { value: 'IT', label: 'Italiano' },
                            { value: 'EN', label: 'Inglese' },
                          ]}
                          placeholder="Tutte le lingue"
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
                                {stripHtml(question.text)}
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

              {/* Right panel: tabbed — Domande selezionate / Sezioni */}
              <div className={`rounded-xl border ${colors.border.light} overflow-hidden flex flex-col max-h-[600px]`}>
                {/* Tab bar */}
                <div className={`flex border-b ${colors.border.light} ${colors.background.secondary} flex-shrink-0`}>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab('domande')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      rightPanelTab === 'domande'
                        ? `border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 ${colors.background.card}`
                        : `${colors.text.muted} hover:${colors.text.secondary}`
                    }`}
                  >
                    Domande selezionate
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                      rightPanelTab === 'domande' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {selectedQuestions.length}
                    </span>
                  </button>
                  {selectedQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllQuestions}
                      title="Rimuovi tutte le domande"
                      className="px-3 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasSections && sectionMode === 'manual' && (
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('sezioni')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        rightPanelTab === 'sezioni'
                          ? `border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 ${colors.background.card}`
                          : `${colors.text.muted} hover:${colors.text.secondary}`
                      }`}
                    >
                      Sezioni
                      {getUnassignedQuestions().length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                          {getUnassignedQuestions().length} non assegnate
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* TAB: Domande selezionate */}
                {rightPanelTab === 'domande' && (
                  <div className="flex-1 overflow-y-auto">
                    {selectedQuestions.length === 0 ? (
                      <div className="p-8 text-center">
                        <Target className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className={colors.text.muted}>Nessuna domanda selezionata</p>
                        <p className={`text-sm ${colors.text.muted}`}>
                          La lista a sinistra serve solo per aggiunte manuali. Per casuale o smart usa la scheda Sezioni.
                        </p>
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
                                {sq.question?.text ? stripHtml(sq.question.text) : 'Domanda'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {sq.question?.subject && (
                                  <span
                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                    style={{
                                      backgroundColor: (sq.question.subject.color || '#6b7280') + 'd9',
                                      color: 'white',
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
                )}

                {/* TAB: Sezioni — section-centric assignment */}
                {rightPanelTab === 'sezioni' && hasSections && sectionMode === 'manual' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {sections.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <Layers className="w-12 h-12 mx-auto text-gray-400" />
                        <p className={`font-medium ${colors.text.primary}`}>Nessuna sezione configurata</p>
                        <p className={`text-sm ${colors.text.muted}`}>
                          Vai alla scheda <strong>Configurazione</strong> e aggiungi le sezioni, poi torna qui ad assegnare le domande.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Progress banner */}
                        {selectedQuestions.length === 0 ? (
                          <div className={`px-4 py-3 flex-shrink-0 border-b ${colors.border.light} bg-blue-50 dark:bg-blue-900/20`}>
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                              Usa “Casuale/Smart DB” su una sezione per pescare e assegnare domande automaticamente, oppure seleziona domande a sinistra per aggiungerle a mano.
                            </p>
                          </div>
                        ) : (() => {
                          const unassignedCount = getUnassignedQuestions().length;
                          const assignedCount = selectedQuestions.length - unassignedCount;
                          return (
                            <div className={`px-4 py-2.5 flex-shrink-0 border-b ${colors.border.light} ${
                              unassignedCount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20'
                            }`}>
                              <p className={`text-xs font-medium mb-1 ${unassignedCount > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}`}>
                                {unassignedCount === 0
                                  ? `✓ Tutte le ${selectedQuestions.length} domande sono assegnate`
                                  : `${assignedCount} / ${selectedQuestions.length} domande assegnate — ${unassignedCount} ancora da assegnare`}
                              </p>
                              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                                  style={{ width: `${(assignedCount / selectedQuestions.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Section cards */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {sections.map((section) => {
                            const sectionQuestions = selectedQuestions.filter((sq) =>
                              section.questionIds?.includes(sq.questionId)
                            );
                            const unassigned = getUnassignedQuestions();
                            const isExpanded = expandedAddSection === section.id;

                            return (
                              <div key={section.id} className={`rounded-xl border ${colors.border.light} overflow-hidden`}>
                                {/* Section header */}
                                <div className={`px-3 py-2.5 flex items-center gap-2 ${colors.background.secondary}`}>
                                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                    {section.order + 1}
                                  </span>
                                  <span className={`text-sm font-semibold ${colors.text.primary} flex-1 truncate`}>{section.name}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                                    sectionQuestions.length > 0
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                  }`}>
                                    {sectionQuestions.length} domande
                                  </span>
                                  {sectionQuestions.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => clearSectionQuestions(section.id)}
                                      title="Rimuovi tutte le domande di questa sezione"
                                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Assigned questions list */}
                                {sectionQuestions.length > 0 && (
                                  <div className={`divide-y ${colors.border.light}`}>
                                    {sectionQuestions.map((sq) => (
                                      <div key={sq.questionId} className={`px-3 py-2 flex items-center gap-2 ${colors.background.card}`}>
                                        <p className={`text-sm ${colors.text.primary} line-clamp-1 flex-1`}>
                                          {sq.question?.text ? stripHtml(sq.question.text) : 'Domanda'}
                                        </p>
                                        {sq.question?.subject && (
                                          <span
                                            className="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
                                            style={{ backgroundColor: (sq.question.subject.color || '#6b7280') + 'd9', color: 'white' }}
                                          >
                                            {sq.question.subject.name}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => assignQuestionToSection(sq.questionId, null)}
                                          className="p-1 rounded text-red-400 hover:text-red-600 shrink-0"
                                          title="Rimuovi dalla sezione"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Action row */}
                                <div className={`px-3 py-2 flex items-center gap-2 border-t ${colors.border.light} ${colors.background.card}`}>
                                  <button
                                    type="button"
                                    disabled={unassigned.length === 0 && !isExpanded}
                                    onClick={() => {
                                      const next = isExpanded ? null : section.id;
                                      setExpandedAddSection(next);
                                      setBulkAssignSelectedIds([]);
                                    }}
                                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      isExpanded
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                        : unassigned.length === 0
                                          ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    {isExpanded
                                      ? 'Chiudi'
                                      : unassigned.length === 0
                                        ? 'Nessuna disponibile'
                                        : `Aggiungi manualmente (${unassigned.length})`}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFillSectionId(section.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors"
                                    title="Pesca domande casuali o smart dal database e aggiungile a questa sezione"
                                  >
                                    <Wand2 className="w-3.5 h-3.5" />
                                    Casuale/Smart DB
                                  </button>
                                </div>

                                {/* Expandable: pick unassigned questions to add to this section */}
                                {isExpanded && (
                                  <div className={`border-t ${colors.border.light}`}>
                                    {unassigned.length === 0 ? (
                                      <p className={`px-3 py-3 text-xs ${colors.text.muted}`}>
                                        Tutte le domande selezionate sono già assegnate a una sezione.
                                      </p>
                                    ) : (
                                      <>
                                        <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                                          {unassigned.map((sq) => {
                                            const checked = bulkAssignSelectedIds.includes(sq.questionId);
                                            return (
                                              <label
                                                key={sq.questionId}
                                                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer ${
                                                  checked ? 'bg-blue-50 dark:bg-blue-900/20' : `hover:${colors.background.secondary}`
                                                }`}
                                              >
                                                <Checkbox
                                                  checked={checked}
                                                  onChange={() =>
                                                    setBulkAssignSelectedIds((prev) =>
                                                      checked ? prev.filter((id) => id !== sq.questionId) : [...prev, sq.questionId]
                                                    )
                                                  }
                                                />
                                                <span className={`text-sm ${colors.text.primary} line-clamp-1 flex-1`}>
                                                  {sq.question?.text ? stripHtml(sq.question.text) : 'Domanda'}
                                                </span>
                                                {sq.question?.subject && (
                                                  <span
                                                    className="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
                                                    style={{ backgroundColor: (sq.question.subject.color || '#6b7280') + 'd9', color: 'white' }}
                                                  >
                                                    {sq.question.subject.name}
                                                  </span>
                                                )}
                                              </label>
                                            );
                                          })}
                                        </div>
                                        <div className={`px-3 py-2 flex items-center gap-2 border-t ${colors.border.light} ${colors.background.secondary}`}>
                                          <button
                                            type="button"
                                            onClick={() => setBulkAssignSelectedIds(unassigned.map((q) => q.questionId))}
                                            className={`text-xs ${colors.text.muted} hover:text-blue-500 underline`}
                                          >
                                            Tutte ({unassigned.length})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setBulkAssignSelectedIds([])}
                                            className={`text-xs ${colors.text.muted} hover:text-blue-500 underline`}
                                          >
                                            Nessuna
                                          </button>
                                          <div className="flex-1" />
                                          <button
                                            type="button"
                                            disabled={bulkAssignSelectedIds.length === 0}
                                            onClick={() => {
                                              const ids = new Set(bulkAssignSelectedIds);
                                              setSections((prev) =>
                                                prev.map((s) => {
                                                  if (s.id === section.id) {
                                                    const merged = Array.from(new Set([...(s.questionIds || []), ...ids]));
                                                    return { ...s, questionIds: merged, questionCount: merged.length };
                                                  }
                                                  // Remove from other sections to keep assignment exclusive
                                                  const cleaned = (s.questionIds || []).filter((id) => !ids.has(id));
                                                  return { ...s, questionIds: cleaned, questionCount: cleaned.length };
                                                })
                                              );
                                              setBulkAssignSelectedIds([]);
                                              setExpandedAddSection(null);
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                          >
                                            {bulkAssignSelectedIds.length > 0
                                              ? `Aggiungi ${bulkAssignSelectedIds.length} domande`
                                              : 'Aggiungi domande'}
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3: // Review step
        return (
          <div className="space-y-6">
            <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
              {creationMode === 'template' ? 'Riepilogo template' : 'Riepilogo simulazione'}
            </h2>
            <p className={`text-sm ${colors.text.muted}`}>
              {creationMode === 'template'
                ? 'Il template sarà disponibile quando crei una nuova simulazione.'
                : 'Dopo la creazione potrai assegnare la simulazione a studenti, gruppi o classi dalla pagina di dettaglio.'}
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
                    <dd className={`font-medium ${colors.text.primary}`}>
                      {creationMode === 'template'
                        ? sections.reduce((sum, section) => sum + (section.questionCount || 0), 0)
                        : selectedQuestions.length}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={colors.text.muted}>Durata</dt>
                    <dd className={`font-medium ${colors.text.primary}`}>
                      {durationMinutes > 0 ? `${durationMinutes} minuti` : 'Illimitata'}
                    </dd>
                  </div>
                  {(creationMode === 'template' || hasSections) && (
                    <div className="flex justify-between">
                      <dt className={colors.text.muted}>Sezioni</dt>
                      <dd className={`font-medium text-blue-600 dark:text-blue-400`}>
                        {creationMode === 'template'
                          ? `${sections.length} nel template`
                          : sectionMode === 'auto' ? 'Automatiche (per materia)' : `${sections.length} manuali`}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Sections detail (only for manual mode) */}
              {(creationMode === 'template' || (hasSections && sectionMode === 'manual')) && sections.length > 0 && (
                <div className={`p-6 rounded-xl ${colors.background.secondary} md:col-span-2`}>
                  <h3 className={`font-medium ${colors.text.primary} mb-4 flex items-center gap-2`}>
                    <Layers className="w-4 h-4 text-blue-600" />
                    Dettaglio Sezioni
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sections.map((section, idx) => {
                        const selectedTypeLabels = (section.questionTypes ?? [])
                          .map((type) => TEMPLATE_QUESTION_TYPE_LABELS[type])
                          .join(', ');
                        const selectedLanguageLabel = section.language ? TEMPLATE_LANGUAGE_LABELS[section.language] : '';

                        return (
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
                                (creationMode === 'template' ? section.questionCount || 0 : section.questionIds?.length || 0) > 0 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {creationMode === 'template' ? section.questionCount || 0 : section.questionIds?.length || 0} domande
                              </span>
                            </div>
                            {creationMode === 'template' && (selectedTypeLabels || selectedLanguageLabel) && (
                              <div className={`mt-2 space-y-1 text-xs ${colors.text.muted}`}>
                                {selectedTypeLabels && <p>Tipologie: {selectedTypeLabels}</p>}
                                {selectedLanguageLabel && <p>Lingua: {selectedLanguageLabel}</p>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  {creationMode === 'simulation' && getUnassignedQuestions().length > 0 && (
                    <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
                      ⚠️ Attenzione: {getUnassignedQuestions().length} domande non assegnate a nessuna sezione
                    </p>
                  )}
                </div>
              )}

              {/* Self-practice assignment summary */}
              {creationMode === 'template' && (
                <div className={`p-6 rounded-xl ${colors.background.secondary} md:col-span-2`}>
                  <h3 className={`font-medium ${colors.text.primary} mb-4 flex items-center gap-2`}>
                    <Users className="w-4 h-4 text-pink-500" />
                    Autoesercitazione studenti
                  </h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between items-center">
                      <dt className={colors.text.muted}>Template per studenti</dt>
                      <dd className={`font-medium ${isSelfPracticeTemplate ? 'text-green-600 dark:text-green-400' : colors.text.muted}`}>
                        {isSelfPracticeTemplate ? 'Sì' : 'No'}
                      </dd>
                    </div>
                    {isSelfPracticeTemplate && (
                      <>
                        <div className="flex justify-between items-start gap-4">
                          <dt className={`${colors.text.muted} shrink-0`}>Studenti assegnati</dt>
                          <dd className="text-right">
                            {assignedStudentIds.length === 0 ? (
                              <span className={colors.text.muted}>Nessuno</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {assignedStudentIds.map((id) => {
                                  const student = allTemplateStudents.find((s) => s.studentId === id);
                                  return student ? (
                                    <span key={id} className={`text-xs px-2 py-0.5 rounded-full ${colors.background.card} border ${colors.border.light} ${colors.text.primary}`}>
                                      {student.name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <dt className={`${colors.text.muted} shrink-0`}>Gruppi assegnati</dt>
                          <dd className="text-right">
                            {assignedGroupIds.length === 0 ? (
                              <span className={colors.text.muted}>Nessuno</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {assignedGroupIds.map((id) => {
                                  const group = (templateGroupsData ?? []).find((g) => g.id === id);
                                  return group ? (
                                    <span key={id} className={`text-xs px-2 py-0.5 rounded-full ${colors.background.card} border ${colors.border.light} ${colors.text.primary}`}>
                                      {group.name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
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
                  {creationMode === 'simulation' && (
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
                  )}
                  {creationMode === 'simulation' && !isPaperBased && (
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
                  {creationMode === 'simulation' && trackAttendance && (
                    <div className="flex justify-between">
                      <dt className={colors.text.muted}>Presenze</dt>
                      <dd className={`font-medium text-green-600 dark:text-green-400`}>Tracciate</dd>
                    </div>
                  )}
                  {creationMode === 'simulation' && locationType && (
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

            {/* Paper-based print button */}
            {creationMode === 'simulation' && isPaperBased && (
              <div className={`mt-6`}>
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedQuestions.length === 0) {
                      alert('Seleziona almeno una domanda per stampare');
                      return;
                    }
                    // Fetch questions with answers then open print directly
                    setIsPdfLoading(true);
                    try {
                      const result = await questionsWithAnswersQuery.refetch();
                      if (result.data) {
                        // Open print directly with the fetched questions
                        const printQuestions = result.data.map(q => ({
                          id: q.id,
                          text: q.text,
                          type: q.type,
                          difficulty: q.difficulty,
                          imageUrl: q.imageUrl,
                          subject: q.subject,
                          topic: q.topic,
                          answers: q.answers.map(a => ({
                            id: a.id,
                            text: a.text,
                            isCorrect: a.isCorrect,
                            order: a.order,
                            imageUrl: a.imageUrl,
                          })),
                        }));
                        
                        // Open print window directly
                        openPrintWindow(printQuestions);
                      }
                    } catch (error) {
                      console.error('Error loading questions for print:', error);
                      alert('Errore nel caricamento delle domande. Riprova.');
                    } finally {
                      setIsPdfLoading(false);
                    }
                  }}
                  disabled={selectedQuestions.length === 0 || isPdfLoading}
                  className={`w-full px-4 py-3 ${colors.primary.bg} text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {isPdfLoading ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      Caricamento...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      Anteprima stampa simulazione
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Non-paper-based preview button */}
            {creationMode === 'simulation' && !isPaperBased && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedQuestions.length === 0) {
                      alert('Seleziona almeno una domanda per visualizzare l\'anteprima');
                      return;
                    }
                    setIsPreviewLoading(true);
                    try {
                      const result = await questionsWithAnswersQuery.refetch();
                      if (result.data) {
                        const previewData = result.data.map(q => ({
                          id: q.id,
                          text: q.text,
                          textLatex: q.textLatex,
                          type: q.type,
                          difficulty: q.difficulty,
                          imageUrl: q.imageUrl,
                          subject: q.subject ? { name: q.subject.name, color: q.subject.color } : null,
                          topic: q.topic ? { name: q.topic.name } : null,
                          answers: q.answers.map((a: { id: string; text: string; isCorrect: boolean; order: number; imageUrl?: string | null }) => ({
                            id: a.id,
                            text: a.text,
                            isCorrect: a.isCorrect,
                            order: a.order,
                            imageUrl: a.imageUrl,
                          })),
                        }));
                        setPreviewQuestionsData(previewData);
                        setShowSimulationPreview(true);
                      }
                    } catch (error) {
                      console.error('Error loading questions for preview:', error);
                      alert('Errore nel caricamento delle domande. Riprova.');
                    } finally {
                      setIsPreviewLoading(false);
                    }
                  }}
                  disabled={selectedQuestions.length === 0 || isPreviewLoading}
                  className={`w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm`}
                >
                  {isPreviewLoading ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      Caricamento anteprima...
                    </>
                  ) : (
                    <>
                      <Monitor className="w-4 h-4" />
                      Anteprima studente
                    </>
                  )}
                </button>
                <p className={`text-xs mt-2 text-center ${colors.text.muted}`}>
                  Visualizza come gli studenti vedranno la simulazione
                </p>
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

  // Show loader while loading an existing template for editing
  if (isEditMode && editTemplateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
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
        <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
          {creationMode === 'template'
            ? (isEditMode ? 'Modifica Template' : 'Nuovo Template')
            : 'Nuova Simulazione'}
        </h1>
      </div>

      {/* Steps indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {activeSteps.map((step, index) => {
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
                {index < activeSteps.length - 1 && (
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
          {currentStep === activeSteps.length - 1 ? (
            <>
              {creationMode === 'simulation' && (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={!isStepValid(currentStep) || isSaving}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
                >
                  <Save className="w-4 h-4" />
                  Salva come bozza
                </button>
              )}
              <button
                onClick={() => handleSubmit(true)}
                disabled={!isStepValid(currentStep) || isSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? <Spinner size="sm" variant="white" /> : creationMode === 'template' ? <FileText className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {creationMode === 'template'
                  ? (isEditMode ? 'Salva modifiche' : 'Crea Template')
                  : 'Crea Simulazione'}
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

            {questionDetail.type === 'OPEN_TEXT' ? (
              <div className="space-y-2 mt-4">
                <h4 className={`font-medium ${colors.text.primary}`}>Keywords di valutazione:</h4>
                <p className={`text-xs ${colors.text.muted}`}>
                  Lo studente deve scrivere almeno una di queste keywords (alternative tra loro).
                </p>
                {questionDetail.keywords && questionDetail.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {questionDetail.keywords.map((keyword) => (
                      <span
                        key={keyword.id}
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${colors.background.secondary} ${colors.text.secondary}`}
                        title={keyword.synonyms.length > 0 ? `Sinonimi: ${keyword.synonyms.join(', ')}` : undefined}
                      >
                        {keyword.keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${colors.text.muted}`}>
                    Nessuna keyword configurata per questa domanda aperta.
                  </p>
                )}
              </div>
            ) : (
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
            )}
          </div>
        )}
      </Modal>

      {/* Simulation Preview Modal - shows what students will see */}
      <SimulationPreviewModal
        isOpen={showSimulationPreview}
        onClose={() => setShowSimulationPreview(false)}
        title={title || 'Simulazione'}
        description={description}
        simulationType={simulationType}
        durationMinutes={durationMinutes}
        questions={previewQuestionsData}
        hasSections={hasSections}
        sections={sections.map(s => ({
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          questionIds: s.questionIds || [],
          order: s.order,
        }))}
        correctPoints={correctPoints}
        wrongPoints={wrongPoints}
        blankPoints={blankPoints}
        showResults={showResults}
        showCorrectAnswers={showCorrectAnswers}
        isRepeatable={isRepeatable}
        isOfficial={isOfficial}
        enableAntiCheat={enableAntiCheat}
        forceFullscreen={forceFullscreen}
        randomizeOrder={randomizeOrder}
        randomizeAnswers={randomizeAnswers}
      />

      {/* Fill Section Modal — bulk-fill a section with random questions */}
      {fillSectionId && (() => {
        const targetSection = sections.find((s) => s.id === fillSectionId);
        if (!targetSection) return null;
        const selectedTemplate = templatesData?.templates.find((template) => template.id === selectedTemplateId);
        const selectedTemplateSections = Array.isArray(selectedTemplate?.sections)
          ? selectedTemplate.sections as Array<Partial<SimulationSection>>
          : [];
        const sourceTemplateSection = selectedTemplateSections.find((section) => section.id === targetSection.id);
        const defaultSectionQuestionCount =
          (sourceTemplateSection ? getSectionTargetQuestionCount(sourceTemplateSection) : 0)
          || getSectionTargetQuestionCount(targetSection)
          || 10;
        return (
          <FillSectionModal
            isOpen={!!fillSectionId}
            onClose={() => setFillSectionId(null)}
            sectionName={targetSection.name}
            defaultSubjectId={targetSection.subjectId}
            defaultSubjectIds={targetSection.subjectIds}
            defaultTopicIds={targetSection.topicIds}
            defaultTypes={targetSection.questionTypes}
            defaultDifficulties={targetSection.difficultyLevels}
            defaultTagIds={targetSection.tagIds}
            defaultLanguage={targetSection.language}
            defaultCount={defaultSectionQuestionCount}
            excludeQuestionIds={selectedQuestions.map((q) => q.questionId)}
            onPicked={(picked) => applyPickedQuestionsToSection(fillSectionId, picked)}
          />
        );
      })()}
    </div>
  );
}
