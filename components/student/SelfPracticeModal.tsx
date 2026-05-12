'use client';

import { useState, useMemo, useEffect } from 'react';
import { Zap, Target, Award, Info, Sparkles, BookOpen, PenTool } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import { ButtonLoader, Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

type LanguageFilter = 'BOTH' | 'IT' | 'EN';

interface QuestionCounts {
  total: number;
  IT: number;
  EN: number;
}

interface TopicItem {
  id: string;
  name: string;
  hasItalianQuestions: boolean;
  hasEnglishQuestions: boolean;
  questionCounts: QuestionCounts;
  _count: { questions: number };
}

interface SubjectItem {
  id: string;
  name: string;
  hasItalianQuestions: boolean;
  hasEnglishQuestions: boolean;
  questionCounts: QuestionCounts;
  _count: { questions: number };
  topics: TopicItem[];
}

interface SelfPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function parseScore(raw: string, fallback: number): number {
  const v = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(v) ? v : fallback;
}

function getSelectedTopics(subjects: SubjectItem[], selectedSubjectIds: string[]) {
  return subjects
    .filter((s) => selectedSubjectIds.includes(s.id))
    .flatMap((s) => s.topics.map((t) => ({ ...t, subjectName: s.name })));
}

function buildSubjectDistribution(subjectIds: string[], count: number): Record<string, number> {
  return subjectIds.reduce((distribution, subjectId, index) => {
    const baseCount = Math.floor(count / subjectIds.length);
    const remainder = count % subjectIds.length;
    distribution[subjectId] = baseCount + (index < remainder ? 1 : 0);
    return distribution;
  }, {} as Record<string, number>);
}

const LANGUAGE_OPTIONS: Array<{ value: LanguageFilter; label: string }> = [
  { value: 'BOTH', label: '🌐 Entrambe' },
  { value: 'IT', label: '🇮🇹 Solo italiano' },
  { value: 'EN', label: '🇬🇧 Solo inglese' },
];

const EMPTY_SUBJECTS: SubjectItem[] = [];

function getQuestionCountByLanguage(counts: QuestionCounts, language: LanguageFilter): number {
  return language === 'BOTH' ? counts.total : counts[language];
}

function filterSubjectsByLanguage(subjects: SubjectItem[], language: LanguageFilter): SubjectItem[] {
  return subjects
    .map((subject) => ({
      ...subject,
      topics: subject.topics.filter((topic) => getQuestionCountByLanguage(topic.questionCounts, language) > 0),
    }))
    .filter((subject) => getQuestionCountByLanguage(subject.questionCounts, language) > 0 || subject.topics.length > 0);
}

function getQuestionCountError(count: number): string | null {
  if (isNaN(count) || count < 5) return 'Inserisci un numero minimo di 5 domande.';
  if (count > 60) return 'Il numero massimo è 60 domande.';
  return null;
}

function EnBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="text-xs px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 font-medium">EN</span>;
}

const DIFFICULTY_LEVELS: Array<{
  value: DifficultyLevel;
  emoji: string;
  label: string;
  activeClass: string;
  textClass: string;
}> = [
  { value: 'EASY', emoji: '🟢', label: 'Facile', activeClass: 'border-green-500 bg-green-50 dark:bg-green-900/20', textClass: 'text-green-700 dark:text-green-300' },
  { value: 'MEDIUM', emoji: '🟡', label: 'Media', activeClass: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20', textClass: 'text-yellow-700 dark:text-yellow-300' },
  { value: 'HARD', emoji: '🔴', label: 'Difficile', activeClass: 'border-red-500 bg-red-50 dark:bg-red-900/20', textClass: 'text-red-700 dark:text-red-300' },
];

function DifficultySelector({ values, onChange }: { values: DifficultyLevel[]; onChange: (v: DifficultyLevel[]) => void }) {
  const toggle = (level: DifficultyLevel) => {
    const next = values.includes(level)
      ? values.filter((v) => v !== level)
      : [...values, level];
    if (next.length > 0) onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Difficoltà
      </label>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_LEVELS.map((opt) => {
          const isSelected = values.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                isSelected ? opt.activeClass : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg block mb-1">{opt.emoji}</span>
              <span className={`block text-xs font-medium ${
                isSelected ? opt.textClass : 'text-gray-700 dark:text-gray-300'
              }`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {values.length === 3 ? 'Mix di tutte le difficoltà' : `Selezionate: ${values.map((v) => DIFFICULTY_LEVELS.find((d) => d.value === v)?.label).join(' + ')}`}
      </p>
    </div>
  );
}

interface TemplateOption {
  id: string;
  title: string;
  description?: string | null;
  totalQuestions: number;
  durationMinutes: number;
  sections: unknown;
}

function TemplateInfoBox({ templates, selectedTemplateId }: { templates: TemplateOption[]; selectedTemplateId: string }) {
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  if (!selectedTemplate) return null;
  const sections = Array.isArray(selectedTemplate.sections)
    ? (selectedTemplate.sections as Array<{ name?: string; questionCount?: number; durationMinutes?: number }>)
    : [];
  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{selectedTemplate.title}</p>
      {selectedTemplate.description && (
        <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">{selectedTemplate.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-800 dark:text-blue-200">
        <span className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-900/40">{selectedTemplate.totalQuestions} domande</span>
        <span className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-900/40">{selectedTemplate.durationMinutes} min</span>
        <span className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-900/40">{sections.length} sezioni</span>
      </div>
    </div>
  );
}

function LanguageFilterSection({ show, value, onChange }: { show: boolean; value: LanguageFilter; onChange: (v: LanguageFilter) => void }) {
  if (!show) return null;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Lingua delle domande
      </label>
      <div className="flex gap-2">
        {LANGUAGE_OPTIONS.map(({ value: optValue, label }) => (
          <button
            key={optValue}
            onClick={() => onChange(optValue)}
            className={`flex-1 px-3 py-2 rounded-xl border-2 text-center text-xs font-medium transition-all ${
              value === optValue
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SelfPracticeModal({ isOpen, onClose }: SelfPracticeModalProps) {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();

  const [selectedSelfPracticeTemplateId, setSelectedSelfPracticeTemplateId] = useState<string>('CUSTOM');
  const isTemplateMode = selectedSelfPracticeTemplateId !== 'CUSTOM';

  // Modalità quiz o lettura
  const [quizMode, setQuizMode] = useState<'quiz' | 'reading'>('quiz');

  // Numero domande
  const [questionCount, setQuestionCount] = useState<string>('20');

  // Durata quiz (in minuti, 0 = illimitato)
  const [durationMinutes, setDurationMinutes] = useState<string>('0');

  // Distribuzione materie
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('BOTH');


  const [correctPoints, setCorrectPoints] = useState<string>('1');
  const [wrongPoints, setWrongPoints] = useState<string>('0');
  const [blankPoints, setBlankPoints] = useState<string>('0');

  // Difficoltà
  const [selectedDifficulties, setSelectedDifficulties] = useState<DifficultyLevel[]>(['EASY', 'MEDIUM', 'HARD']);

  // Opzioni avanzate
  const [maximizeCoverage, setMaximizeCoverage] = useState(true);
  const [avoidRecent, setAvoidRecent] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(true);

  // Gestione domande aperte (solo per modalità quiz)
  const [openQuestionCorrection, setOpenQuestionCorrection] = useState<'self' | 'staff'>('self');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Query
  const { data: subjectsData } = trpc.questions.getSubjects.useQuery();
  const { data: staff = [] } = trpc.users.getStaff.useQuery();
  const { data: assignedSelfPracticeTemplates = [] } = trpc.simulationTemplates.listMySelfPracticeTemplates.useQuery(
    undefined,
    { enabled: isOpen },
  );

  const subjects = subjectsData ?? EMPTY_SUBJECTS;
  const filteredSubjects = useMemo(
    () => filterSubjectsByLanguage(subjects, languageFilter),
    [subjects, languageFilter],
  );
  const selectedSubjectTopics = useMemo(
    () => getSelectedTopics(filteredSubjects, selectedSubjectIds),
    [filteredSubjects, selectedSubjectIds],
  );
  const availableSubjectIds = useMemo(
    () => new Set(filteredSubjects.map((subject) => subject.id)),
    [filteredSubjects],
  );
  const availableTopicIds = useMemo(
    () => new Set(filteredSubjects.flatMap((subject) => subject.topics.map((topic) => topic.id))),
    [filteredSubjects],
  );

  useEffect(() => {
    setSelectedSubjectIds((prev) => {
      const next = prev.filter((id) => availableSubjectIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    setSelectedTopicIds((prev) => {
      const next = prev.filter((id) => availableTopicIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [availableSubjectIds, availableTopicIds]);

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    const topicIds = filteredSubjects.find((s) => s.id === subjectId)?.topics.map((t) => t.id) ?? [];
    setSelectedSubjectIds((prev) => checked ? [...prev, subjectId] : prev.filter((id) => id !== subjectId));
    setSelectedTopicIds((prev) => prev.filter((topicId) => checked || !topicIds.includes(topicId)));
  };

  const handleTopicToggle = (topicId: string, checked: boolean) => {
    setSelectedTopicIds((prev) => checked ? [...prev, topicId] : prev.filter((id) => id !== topicId));
  };

  // Mutations
  const generateSmartQuestions = trpc.questions.generateSmartRandomQuestions.useMutation({
    onError: handleMutationError,
  });

  const createSelfPractice = trpc.simulations.createSelfPractice.useMutation({
    onSuccess: (data) => {
      showSuccess('Quiz creato!', 'Inizia ora il tuo quiz!');
      onClose();
      router.push(`/simulazioni/${data.id}`);
    },
    onError: handleMutationError,
  });

  const createSelfPracticeFromTemplate = trpc.simulations.createSelfPracticeFromTemplate.useMutation({
    onSuccess: (data) => {
      showSuccess('Quiz creato!', 'Inizia ora il tuo quiz!');
      onClose();
      router.push(`/simulazioni/${data.id}`);
    },
    onError: handleMutationError,
  });

  const handleGenerate = async () => {
    try {
      if (isTemplateMode) {
        if (openQuestionCorrection === 'staff' && !selectedStaffId) {
          showError('Errore', 'Seleziona un collaboratore per la correzione.');
          return;
        }

        await createSelfPracticeFromTemplate.mutateAsync({
          templateId: selectedSelfPracticeTemplateId,
          openQuestionCorrection,
          requestCorrectionFromId: openQuestionCorrection === 'staff' ? selectedStaffId : undefined,
        });
        return;
      }

      const count = parseInt(questionCount, 10);
      const countError = getQuestionCountError(count);
      if (countError) {
        showError('Errore', countError);
        return;
      }

      if (quizMode === 'quiz' && openQuestionCorrection === 'staff' && !selectedStaffId) {
        showError('Errore', 'Seleziona un collaboratore per la correzione.');
        return;
      }

      const customSubjectDistribution = selectedSubjectIds.length > 0
        ? buildSubjectDistribution(selectedSubjectIds, count)
        : undefined;

      const result = await generateSmartQuestions.mutateAsync({
        totalQuestions: count,
        preset: selectedSubjectIds.length > 0 ? 'CUSTOM' : 'PROPORTIONAL',
        difficultyLevels: selectedDifficulties,
        maximizeTopicCoverage: maximizeCoverage,
        avoidRecentlyUsed: avoidRecent,
        customSubjectDistribution,
        subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
        topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
        language: languageFilter !== 'BOTH' ? languageFilter : undefined,
      });

      if (!result || result.questions.length === 0) {
        showError('Nessuna domanda', 'Non ci sono domande disponibili con i criteri selezionati.');
        return;
      }

      // Modalità lettura: naviga direttamente alla pagina di studio
      if (quizMode === 'reading') {
        const questionIds = result.questions.map((q) => q.questionId).join(',');
        showSuccess('Pronto!', 'Studia le domande e le risposte corrette.');
        onClose();
        router.push(`/simulazioni/studio?ids=${questionIds}`);
        return;
      }

      const duration = parseInt(durationMinutes, 10);
      await createSelfPractice.mutateAsync({
        questionIds: result.questions.map((q) => q.questionId),
        durationMinutes: isNaN(duration) || duration < 0 ? 0 : duration,
        includeOpenQuestions: true,
        openQuestionCorrection: openQuestionCorrection,
        requestCorrectionFromId: openQuestionCorrection === 'staff' ? selectedStaffId : undefined,
        correctPoints: parseScore(correctPoints, 1),
        wrongPoints: parseScore(wrongPoints, 0),
        blankPoints: parseScore(blankPoints, 0),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const isCreating = createSelfPractice.isPending || createSelfPracticeFromTemplate.isPending || generateSmartQuestions.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Autoesercitazione"
      subtitle="Crea un quiz o studia le domande"
      icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6" />}
      variant="info"
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isCreating}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isCreating}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            <ButtonLoader loading={isCreating} loadingText="Creazione...">
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                {quizMode === 'reading' ? 'Inizia a Studiare' : 'Inizia Quiz'}
              </span>
            </ButtonLoader>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo autoesercitazione
          </label>
          <CustomSelect
            value={selectedSelfPracticeTemplateId}
            onChange={(value) => {
              setSelectedSelfPracticeTemplateId(value);
              if (value !== 'CUSTOM') {
                setQuizMode('quiz');
              }
            }}
            options={[
              { value: 'CUSTOM', label: 'Personalizzato' },
              ...assignedSelfPracticeTemplates.map((template) => ({
                value: template.id,
                label: `${template.title} (${template.totalQuestions} domande)`,
              })),
            ]}
            className="w-full"
          />
        </div>

        {isTemplateMode && (
          <TemplateInfoBox
            templates={assignedSelfPracticeTemplates
              .filter((t) => t.id && t.title != null)
              .map((t) => ({
                id: t.id!,
                title: t.title!,
                description: t.description,
                totalQuestions: t.totalQuestions ?? 0,
                durationMinutes: t.durationMinutes ?? 0,
                sections: t.sections,
              }))}
            selectedTemplateId={selectedSelfPracticeTemplateId}
          />
        )}

        {/* Selezione modalità: Quiz vs Lettura */}
        {!isTemplateMode && <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Come vuoi esercitarti?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setQuizMode('quiz')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                quizMode === 'quiz'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <PenTool className={`w-6 h-6 mx-auto mb-2 ${
                quizMode === 'quiz' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
              <span className={`block text-sm font-medium ${
                quizMode === 'quiz' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Quiz
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Rispondi e verifica
              </span>
            </button>

            <button
              onClick={() => setQuizMode('reading')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                quizMode === 'reading'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <BookOpen className={`w-6 h-6 mx-auto mb-2 ${
                quizMode === 'reading' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
              <span className={`block text-sm font-medium ${
                quizMode === 'reading' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Lettura
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Studia domande e risposte
              </span>
            </button>
          </div>
        </div>}

        {/* Numero domande - semplice input */}
        {!isTemplateMode && <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Numero di domande
          </label>
          <input
            type="number"
            min="5"
            max="60"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="Minimo 5 domande"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimo 5, massimo 60 domande
          </p>
        </div>}

        {/* Durata quiz (solo per modalità quiz) */}
        {!isTemplateMode && quizMode === 'quiz' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Durata quiz (minuti)
              </label>
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="0 = tempo illimitato"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                0 minuti = tempo illimitato. Es: 60 per 1 ora
              </p>
            </div>
          </>
        )}

        {!isTemplateMode && (
          <LanguageFilterSection show value={languageFilter} onChange={setLanguageFilter} />
        )}

        {/* Materie */}
        {!isTemplateMode && <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Materie
          </label>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
              {selectedSubjectIds.length === 0
                ? 'Tutte le materie disponibili'
                : `${selectedSubjectIds.length} materia/e selezionata/e`}
            </div>
            <div className="max-h-44 overflow-y-auto border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
              {filteredSubjects.length === 0 && (
                <p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Nessuna materia disponibile per la lingua selezionata.
                </p>
              )}
              {filteredSubjects.map((subject) => {
                const checked = selectedSubjectIds.includes(subject.id);
                return (
                  <div key={subject.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={checked}
                      onChange={(e) => handleSubjectToggle(subject.id, e.target.checked)}
                    />
                    <label htmlFor={`subject-${subject.id}`} className="flex-1 flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{subject.name}</span>
                      <EnBadge show={subject.hasEnglishQuestions} />
                    </label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getQuestionCountByLanguage(subject.questionCounts, languageFilter)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedSubjectTopics.length > 0 && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Argomenti (opzionale)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-2 space-y-1">
                {selectedSubjectTopics.map((topic) => {
                  const checked = selectedTopicIds.includes(topic.id);
                  return (
                    <div key={topic.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <Checkbox
                        id={`topic-${topic.id}`}
                        checked={checked}
                        onChange={(e) => handleTopicToggle(topic.id, e.target.checked)}
                      />
                      <label htmlFor={`topic-${topic.id}`} className="flex-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <span>{topic.name}</span>
                        <EnBadge show={topic.hasEnglishQuestions} />
                      </label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{topic.subjectName}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedTopicIds.length === 0
                  ? 'Nessun filtro: tutti gli argomenti delle materie selezionate'
                  : `${selectedTopicIds.length} argomento/i selezionato/i`}
              </p>
            </div>
          )}
        </div>}

        {/* Difficoltà */}
        {!isTemplateMode && <DifficultySelector values={selectedDifficulties} onChange={setSelectedDifficulties} />}

        {isTemplateMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Correzione domande aperte
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOpenQuestionCorrection('self')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  openQuestionCorrection === 'self'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Target className="w-4 h-4" />
                Auto
              </button>
              <button
                onClick={() => setOpenQuestionCorrection('staff')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  openQuestionCorrection === 'staff'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Award className="w-4 h-4" />
                Docente
              </button>
            </div>

            {openQuestionCorrection === 'staff' && (
              <div className="mt-3">
                <CustomSelect
                  value={selectedStaffId}
                  onChange={(value) => setSelectedStaffId(value)}
                  options={[
                    { value: '', label: 'Seleziona collaboratore...' },
                    ...staff.map((member) => ({
                      value: member.id,
                      label: member.name,
                    })),
                  ]}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        {/* Opzioni avanzate (collassabili) */}
        {!isTemplateMode && <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                Opzioni avanzate
              </span>
              {!showAdvanced && quizMode === 'quiz' && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Punteggi: +{correctPoints} / {wrongPoints} / {blankPoints} · {openQuestionCorrection === 'self' ? 'Auto' : 'Docente'}
                </span>
              )}
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
              {/* Checkbox opzioni */}
              <div className="space-y-3">
                <Checkbox
                  id="maximize-coverage"
                  checked={maximizeCoverage}
                  onChange={(e) => setMaximizeCoverage(e.target.checked)}
                  label="Varia gli argomenti"
                />
                <Checkbox
                  id="avoid-recent"
                  checked={avoidRecent}
                  onChange={(e) => setAvoidRecent(e.target.checked)}
                  label="Evita domande già viste"
                />
              </div>

              {/* Punteggi (solo modalità quiz) */}
              {quizMode === 'quiz' && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Punteggi (per domanda)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="score-correct" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Corretta</label>
                      <input
                        id="score-correct"
                        type="text"
                        inputMode="decimal"
                        value={correctPoints}
                        onChange={(e) => setCorrectPoints(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="score-wrong" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Errata</label>
                      <input
                        id="score-wrong"
                        type="text"
                        inputMode="decimal"
                        value={wrongPoints}
                        onChange={(e) => setWrongPoints(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="score-blank" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">In bianco</label>
                      <input
                        id="score-blank"
                        type="text"
                        inputMode="decimal"
                        value={blankPoints}
                        onChange={(e) => setBlankPoints(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Gestione domande aperte - solo per quiz */}
              {quizMode === 'quiz' && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Correzione domande aperte
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOpenQuestionCorrection('self')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        openQuestionCorrection === 'self'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Target className="w-4 h-4" />
                      Auto
                    </button>
                    <button
                      onClick={() => setOpenQuestionCorrection('staff')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        openQuestionCorrection === 'staff'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      Docente
                    </button>
                  </div>

                  {openQuestionCorrection === 'staff' && (
                    <div className="mt-3">
                      <CustomSelect
                        value={selectedStaffId}
                        onChange={(value) => setSelectedStaffId(value)}
                        options={[
                          { value: '', label: 'Seleziona collaboratore...' },
                          ...staff.map((member) => ({
                            value: member.id,
                            label: member.name,
                          })),
                        ]}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>}

        {/* Info box - diverso per modalità */}
        <div className={`rounded-xl p-3 ${
          quizMode === 'reading' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex gap-3">
            <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              quizMode === 'reading' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-blue-600 dark:text-blue-400'
            }`} />
            <p className={`text-sm ${
              quizMode === 'reading' 
                ? 'text-green-900 dark:text-green-100' 
                : 'text-blue-900 dark:text-blue-100'
            }`}>
              {isTemplateMode
                ? 'Le domande verranno generate automaticamente in base alle sezioni e agli argomenti del template assegnato.'
                : quizMode === 'reading' 
                ? 'Vedrai le domande con le risposte corrette evidenziate. Perfetto per ripassare!'
                : 'Rispondi alle domande e verifica le tue conoscenze. Vedrai il punteggio alla fine.'
              }
            </p>
          </div>
        </div>

        {/* Loading */}
        {isCreating && (
          <div className="flex items-center justify-center gap-3 py-2">
            <Spinner size="sm" variant="primary" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Preparo le domande...
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
