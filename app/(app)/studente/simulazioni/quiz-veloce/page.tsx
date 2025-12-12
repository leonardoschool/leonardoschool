'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors, getSubjectColor } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner, ButtonLoader } from '@/components/ui/loaders';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Zap,
  Clock,
  Target,
  ChevronRight,
  Check,
  Settings,
  BookOpen,
  Layers,
  Play,
} from 'lucide-react';

const DIFFICULTY_OPTIONS = [
  { value: 'MIXED', label: 'Misto', description: 'Tutte le difficoltà' },
  { value: 'EASY', label: 'Facile', description: 'Domande base' },
  { value: 'MEDIUM', label: 'Medio', description: 'Domande intermedie' },
  { value: 'HARD', label: 'Difficile', description: 'Domande avanzate' },
] as const;

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 30, 50];
const DURATION_OPTIONS = [
  { value: 0, label: 'Nessun limite' },
  { value: 5, label: '5 minuti' },
  { value: 10, label: '10 minuti' },
  { value: 15, label: '15 minuti' },
  { value: 30, label: '30 minuti' },
  { value: 60, label: '1 ora' },
];

export default function QuickQuizPage() {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showError } = useToast();

  // Config state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'MIXED' | 'EASY' | 'MEDIUM' | 'HARD'>('MIXED');
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [showResults, setShowResults] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);

  // Fetch subjects with topics
  const { data: subjects, isLoading: loadingSubjects } = trpc.questions.getSubjects.useQuery();

  // Get topics for selected subjects
  const availableTopics = subjects
    ?.filter(s => selectedSubjects.includes(s.id))
    .flatMap(s => s.topics || []) || [];

  // Generate quiz mutation
  const generateMutation = trpc.simulations.generateQuickQuiz.useMutation({
    onSuccess: (data) => {
      router.push(`/studente/simulazioni/${data.simulationId}`);
    },
    onError: handleMutationError,
  });

  // Reset topics when subjects change
  useEffect(() => {
    setSelectedTopics([]);
  }, [selectedSubjects]);

  // Toggle subject selection
  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Toggle topic selection
  const toggleTopic = (id: string) => {
    setSelectedTopics(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // Handle generate
  const handleGenerate = () => {
    if (selectedSubjects.length === 0) {
      showError('Errore', 'Seleziona almeno una materia');
      return;
    }

    generateMutation.mutate({
      subjectIds: selectedSubjects,
      topicIds: selectedTopics.length > 0 ? selectedTopics : undefined,
      difficulty,
      questionCount,
      durationMinutes,
      correctPoints: 1,
      wrongPoints: -0.25,
      showResultsImmediately: showResults,
      showCorrectAnswers,
    });
  };

  if (loadingSubjects) {
    return <PageLoader />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <Link
        href="/studente/simulazioni"
        className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-6`}
      >
        <ArrowLeft className="w-4 h-4" />
        Torna alle simulazioni
      </Link>

      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${colors.text.primary} flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-lg ${colors.primary.gradient} flex items-center justify-center`}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          Quiz Veloce
        </h1>
        <p className={`mt-2 ${colors.text.secondary}`}>
          Configura e genera un quiz personalizzato per allenarti
        </p>
      </div>

      {/* Configuration sections */}
      <div className="space-y-6">
        {/* Subjects */}
        <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-6`}>
          <h2 className={`text-lg font-semibold ${colors.text.primary} flex items-center gap-2 mb-4`}>
            <BookOpen className="w-5 h-5" />
            Materie
            <span className="text-sm font-normal text-red-500">*</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subjects?.map((subject) => {
              const isSelected = selectedSubjects.includes(subject.id);
              const subjectName = subject.name as 'BIOLOGIA' | 'CHIMICA' | 'FISICA' | 'MATEMATICA' | 'LOGICA' | 'CULTURA_GENERALE';
              return (
                <button
                  key={subject.id}
                  onClick={() => toggleSubject(subject.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `border-red-500 ${getSubjectColor(subjectName, 'bg')} bg-opacity-20`
                      : `border-transparent ${colors.background.secondary} ${colors.background.hover}`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${colors.text.primary}`}>
                      {subject.name.replace(/_/g, ' ')}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className={`text-sm ${colors.text.muted} mt-1`}>
                    {subject._count?.questions || 0} domande
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics (shown only when subjects are selected) */}
        {availableTopics.length > 0 && (
          <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-6`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} flex items-center gap-2 mb-4`}>
              <Layers className="w-5 h-5" />
              Argomenti
              <span className={`text-sm font-normal ${colors.text.muted}`}>(opzionale)</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {availableTopics.map((topic) => {
                const isSelected = selectedTopics.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      isSelected
                        ? `${colors.primary.bg} text-white`
                        : `${colors.background.secondary} ${colors.text.secondary} ${colors.background.hover}`
                    }`}
                  >
                    {topic.name}
                    {isSelected && <Check className="w-3 h-3 ml-1 inline" />}
                  </button>
                );
              })}
            </div>
            <p className={`text-xs ${colors.text.muted} mt-2`}>
              Se non selezioni nessun argomento, verranno usati tutti
            </p>
          </div>
        )}

        {/* Settings grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Difficulty */}
          <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-6`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} flex items-center gap-2 mb-4`}>
              <Target className="w-5 h-5" />
              Difficoltà
            </h2>
            <div className="space-y-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDifficulty(option.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    difficulty === option.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : `border-transparent ${colors.background.secondary} ${colors.background.hover}`
                  }`}
                >
                  <div className="text-left">
                    <p className={`font-medium ${colors.text.primary}`}>{option.label}</p>
                    <p className={`text-xs ${colors.text.muted}`}>{option.description}</p>
                  </div>
                  {difficulty === option.value && (
                    <Check className="w-4 h-4 text-red-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Question count & Duration */}
          <div className="space-y-6">
            {/* Question count */}
            <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-6`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>
                Numero Domande
              </h2>
              <div className="flex flex-wrap gap-2">
                {QUESTION_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      questionCount === count
                        ? `${colors.primary.bg} text-white`
                        : `${colors.background.secondary} ${colors.text.secondary} ${colors.background.hover}`
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-6`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} flex items-center gap-2 mb-4`}>
                <Clock className="w-5 h-5" />
                Tempo
              </h2>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.input} ${colors.background.secondary} ${colors.text.primary}`}
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-6`}>
          <h2 className={`text-lg font-semibold ${colors.text.primary} flex items-center gap-2 mb-4`}>
            <Settings className="w-5 h-5" />
            Opzioni
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Mostra risultati subito</p>
                <p className={`text-sm ${colors.text.muted}`}>Visualizza i risultati appena completato</p>
              </div>
              <button
                type="button"
                onClick={() => setShowResults(!showResults)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showResults ? colors.primary.bg : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    showResults ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Mostra risposte corrette</p>
                <p className={`text-sm ${colors.text.muted}`}>Visualizza quali erano le risposte giuste</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showCorrectAnswers ? colors.primary.bg : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    showCorrectAnswers ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Summary & Generate */}
        <div className={`rounded-xl ${colors.primary.gradient} p-6 text-white`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Riepilogo Quiz</h3>
              <ul className="text-sm opacity-90 mt-2 space-y-1">
                <li>• {selectedSubjects.length} materie selezionate</li>
                <li>• {selectedTopics.length > 0 ? `${selectedTopics.length} argomenti` : 'Tutti gli argomenti'}</li>
                <li>• {questionCount} domande</li>
                <li>• Difficoltà: {DIFFICULTY_OPTIONS.find(d => d.value === difficulty)?.label}</li>
                <li>• {durationMinutes > 0 ? `${durationMinutes} minuti` : 'Senza limite di tempo'}</li>
              </ul>
            </div>
            <button
              onClick={handleGenerate}
              disabled={selectedSubjects.length === 0 || generateMutation.isPending}
              className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-white text-red-600 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-w-[150px]`}
            >
              <ButtonLoader loading={generateMutation.isPending} loadingText="Generazione...">
                <Play className="w-5 h-5" />
                Inizia Quiz
              </ButtonLoader>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
