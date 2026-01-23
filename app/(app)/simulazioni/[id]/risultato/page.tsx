'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader, ButtonLoader } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { auth } from '@/lib/firebase/config';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
import {
  ArrowLeft,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  AlertCircle,
  BarChart3,
  Medal,
  Star,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react';

// --- Helper Components to reduce cognitive complexity ---

// Helper functions for answer status
function getAnswerStatusClass(isCorrect: boolean | null): string {
  if (isCorrect === null) return 'bg-gray-100 text-gray-500 dark:bg-gray-800';
  if (isCorrect) return 'bg-green-100 text-green-600 dark:bg-green-900/30';
  return 'bg-red-100 text-red-600 dark:bg-red-900/30';
}

function getAnswerStatusIcon(isCorrect: boolean | null): React.ReactNode {
  if (isCorrect === null) return <MinusCircle className="w-4 h-4" />;
  if (isCorrect) return <CheckCircle className="w-4 h-4" />;
  return <XCircle className="w-4 h-4" />;
}

function getOpenQuestionBorderClass(isCorrect: boolean | null): string {
  if (isCorrect === null) return 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20';
  if (isCorrect) return 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20';
  return 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20';
}

function getMultipleChoiceBgColor(isCorrectAnswer: boolean, isSelected: boolean): string {
  if (isCorrectAnswer) return 'bg-green-100 dark:bg-green-900/20';
  if (isSelected) return 'bg-red-100 dark:bg-red-900/20';
  return colors.background.secondary;
}

function getMultipleChoiceTextColor(isCorrectAnswer: boolean, isSelected: boolean): string {
  if (isCorrectAnswer) return 'text-green-700 dark:text-green-300';
  if (isSelected) return 'text-red-700 dark:text-red-300';
  return colors.text.primary;
}

function getMultipleChoiceLabelClass(isCorrectAnswer: boolean, isSelected: boolean): string {
  if (isCorrectAnswer) return 'bg-green-500 text-white';
  if (isSelected) return 'bg-red-500 text-white';
  return 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300';
}

// Helper for time formatting
function formatTimeDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

// Type for answer data
type AnswerData = {
  question: { subject: string; subjectColor?: string | null };
  isCorrect: boolean | null;
  answerText?: string | null;
};

// Helper for subject statistics calculation
function calculateSubjectStats(answers: AnswerData[]): Array<{
  subject: string;
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  color: string | null;
  percentage: number;
}> {
  const stats: Record<string, { correct: number; wrong: number; blank: number; total: number; color: string | null }> = {};

  for (const answer of answers) {
    const subject = answer.question.subject;
    if (!stats[subject]) {
      stats[subject] = { correct: 0, wrong: 0, blank: 0, total: 0, color: answer.question.subjectColor || null };
    }
    stats[subject].total++;
    if (answer.isCorrect === null) {
      stats[subject].blank++;
    } else if (answer.isCorrect) {
      stats[subject].correct++;
    } else {
      stats[subject].wrong++;
    }
  }

  return Object.entries(stats)
    .map(([subject, data]) => ({
      subject,
      ...data,
      percentage: Math.round((data.correct / data.total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

// Helper for filtering answers
function filterAnswersByType(answers: AnswerData[], filterType: 'all' | 'correct' | 'wrong' | 'blank' | 'pending'): AnswerData[] {
  switch (filterType) {
    case 'correct':
      return answers.filter((a) => a.isCorrect === true);
    case 'wrong':
      return answers.filter((a) => a.isCorrect === false);
    case 'blank':
      return answers.filter((a) => a.isCorrect === null && !a.answerText);
    case 'pending':
      return answers.filter((a) => a.isCorrect === null && !!a.answerText);
    default:
      return answers;
  }
}

// Styling lookup for passed/failed states using array index (0=failed, 1=passed)
const RESULT_STYLES_ARRAY = [
  // Index 0 = failed (passed=false maps to 0 via +false)
  {
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    scoreColor: 'text-red-600',
    headerBg: 'bg-red-500',
  },
  // Index 1 = passed (passed=true maps to 1 via +true)
  {
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    scoreColor: 'text-green-600',
    headerBg: 'bg-green-500',
  },
] as const;

// Helper for passed/failed badge styling using array lookup
function getPassedBadgeClass(passed: boolean): string {
  return RESULT_STYLES_ARRAY[Number(passed)].badgeClass;
}

function getPassedScoreColor(passed: boolean): string {
  return RESULT_STYLES_ARRAY[Number(passed)].scoreColor;
}

function getPassedHeaderBg(passed: boolean): string {
  return RESULT_STYLES_ARRAY[Number(passed)].headerBg;
}

// PassedBadge component to reduce complexity
function PassedBadge({ passed }: { readonly passed: boolean }): React.ReactElement {
  if (passed) {
    return (
      <>
        <CheckCircle className="w-5 h-5" />
        <span className="font-medium">Superata</span>
      </>
    );
  }
  return (
    <>
      <XCircle className="w-5 h-5" />
      <span className="font-medium">Non Superata</span>
    </>
  );
}

interface LeaderboardEntryProps {
  readonly entry: {
    rank?: number;
    studentId?: string | null;
    studentName?: string;
    studentMatricola?: string | null;
    totalScore?: number;
    durationSeconds?: number;
    isCurrentUser?: boolean;
  };
  readonly canSeeAllNames: boolean;
}

function LeaderboardEntry({ entry, canSeeAllNames }: LeaderboardEntryProps) {
  const isCurrentUser = entry.isCurrentUser ?? false;
  const rank = entry.rank ?? 0;
  const totalScore = entry.totalScore ?? 0;
  const durationSeconds = entry.durationSeconds ?? 0;
  const studentName = entry.studentName ?? 'Anonimo';
  
  const getRankColor = (r: number): string => {
    if (r === 1) return 'text-yellow-500';
    if (r === 2) return 'text-gray-400';
    if (r === 3) return 'text-amber-600';
    return colors.text.muted;
  };
  
  const getRankIcon = (r: number): React.ReactNode => {
    if (r === 1) return <Trophy className="w-5 h-5" />;
    if (r === 2) return <Medal className="w-5 h-5" />;
    if (r === 3) return <Star className="w-5 h-5" />;
    return null;
  };
  
  const rankColor = getRankColor(rank);
  const rankIcon = getRankIcon(rank);

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
        isCurrentUser
          ? `${colors.primary.gradient} text-white`
          : `${colors.background.secondary} hover:bg-gray-100 dark:hover:bg-gray-700`
      }`}
    >
      <div className={`flex items-center justify-center w-12 font-bold text-lg ${isCurrentUser ? 'text-white' : rankColor}`}>
        {rankIcon || `#${rank}`}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isCurrentUser ? 'text-white' : colors.text.primary}`}>
          {studentName}
          {isCurrentUser && <span className="ml-2 text-xs opacity-90">(Tu)</span>}
        </p>
        {canSeeAllNames && entry.studentMatricola && (
          <p className={`text-xs ${isCurrentUser ? 'text-white/80' : colors.text.muted}`}>
            Matricola: {entry.studentMatricola}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className={`font-bold text-lg ${isCurrentUser ? 'text-white' : colors.text.primary}`}>
          {totalScore.toFixed(2)}
        </p>
        <p className={`text-xs ${isCurrentUser ? 'text-white/80' : colors.text.muted}`}>
          {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}

// --- Main Component ---

/**
 * Simulation Result Page - Shows results after completing a simulation
 * This page is primarily for students, but staff can also view results
 */
export default function SimulationResultPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id: simulationId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get('resultId');
  const { showSuccess } = useToast();
  const { handleMutationError } = useApiError();

  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong' | 'blank' | 'pending'>('all');

  // Check authentication
  const { data: user, isLoading: userLoading, error: userError } = trpc.auth.me.useQuery();

  // Handle auth error
  useEffect(() => {
    if (userError || (!userLoading && !user)) {
      const handleLogout = async () => {
        try {
          // Solo signOut - i cookie vengono puliti dal listener onIdTokenChanged in useAuth
          // o direttamente qui per garantire pulizia
          await auth.signOut();
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (e) {
          console.error('Logout error:', e);
        }
        router.push('/auth/login');
      };
      handleLogout();
    }
  }, [userError, userLoading, user, router]);

  // Fetch result details - use resultId if available, otherwise use simulationId
  const { data: result, isLoading, error, refetch } = trpc.simulations.getResultDetails.useQuery(
    resultId ? { resultId } : { simulationId },
    { enabled: !!user }
  );

  // Self-correct mutation
  const selfCorrectMutation = trpc.simulations.selfCorrectOpenAnswer.useMutation({
    onSuccess: () => {
      showSuccess('Corretto!', 'La tua risposta è stata valutata.');
      refetch();
    },
    onError: handleMutationError,
  });

  // Fetch leaderboard data
  const { data: leaderboardData } = trpc.simulations.getLeaderboard.useQuery(
    { simulationId, limit: 50 },
    { enabled: !!user && !!result }
  );

  // Calculate statistics by subject
  const subjectStats = useMemo(() => {
    if (!result?.answers) return [];
    return calculateSubjectStats(result.answers);
  }, [result]);

  // Filter questions
  const filteredAnswers = useMemo(() => {
    if (!result?.answers) return [];
    return filterAnswersByType(result.answers, filterType);
  }, [result, filterType]);

  if (userLoading || isLoading) {
    return <PageLoader />;
  }

  if (error || !result) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
          <p className={`font-medium ${colors.text.primary}`}>
            {error?.message || 'Risultato non trovato'}
          </p>
          <Link
            href="/simulazioni"
            className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alle simulazioni
          </Link>
        </div>
      </div>
    );
  }

  const { id: currentResultId, simulation, score, totalScore, correctAnswers, wrongAnswers, blankAnswers, pendingOpenAnswers = 0, timeSpent, passed } = result;
  const showSelfCorrection = simulation.showCorrectAnswers;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/simulazioni"
        className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-6`}
      >
        <ArrowLeft className="w-4 h-4" />
        Torna alle simulazioni
      </Link>

      {/* Main score card */}
      <div className={`rounded-xl overflow-hidden ${colors.background.card} border ${colors.border.light} mb-8`}>
        <div className={`p-6 sm:p-8 ${getPassedHeaderBg(passed)} text-white text-center`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8" />
            {simulation.isOfficial && <Award className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{simulation.title}</h1>
          <p className="opacity-90">{simulation.description}</p>
        </div>

        <div className="p-6 sm:p-8">
          {/* Score display */}
          <div className="text-center mb-8">
            <div className={`text-5xl sm:text-6xl font-bold mb-2 ${getPassedScoreColor(passed)}`}>
              {score.toFixed(2)} / {totalScore}
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getPassedBadgeClass(passed)}`}>
              <PassedBadge passed={passed} />
            </div>
            {simulation.passingScore && (
              <p className={`text-sm ${colors.text.muted} mt-2`}>
                Soglia di sufficienza: {simulation.passingScore} punti
              </p>
            )}
          </div>

          {/* Pending review banner - different message based on self-correction vs staff correction */}
          {pendingOpenAnswers > 0 && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
              showSelfCorrection 
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            }`}>
              <Edit3 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${showSelfCorrection ? 'text-blue-500' : 'text-amber-500'}`} />
              <div>
                <p className={`font-medium ${showSelfCorrection ? 'text-blue-800 dark:text-blue-200' : 'text-amber-800 dark:text-amber-200'}`}>
                  {pendingOpenAnswers} {pendingOpenAnswers === 1 ? 'risposta aperta da valutare' : 'risposte aperte da valutare'}
                </p>
                <p className={`text-sm mt-1 ${showSelfCorrection ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {showSelfCorrection 
                    ? 'Scorri le domande e valuta le tue risposte aperte cliccando su "Corretta" o "Sbagliata".'
                    : 'Il punteggio finale verrà ricalcolato dopo la correzione da parte dello staff.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className={`grid grid-cols-2 ${pendingOpenAnswers > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-4 mb-6`}>
            <div className={`p-4 rounded-lg ${colors.background.secondary} text-center`}>
              <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-2" />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{correctAnswers}</p>
              <p className={`text-sm ${colors.text.muted}`}>Corrette</p>
            </div>
            <div className={`p-4 rounded-lg ${colors.background.secondary} text-center`}>
              <XCircle className="w-6 h-6 mx-auto text-red-500 mb-2" />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{wrongAnswers}</p>
              <p className={`text-sm ${colors.text.muted}`}>Errate</p>
            </div>
            <div className={`p-4 rounded-lg ${colors.background.secondary} text-center`}>
              <MinusCircle className="w-6 h-6 mx-auto text-gray-500 mb-2" />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{blankAnswers}</p>
              <p className={`text-sm ${colors.text.muted}`}>Non date</p>
            </div>
            {pendingOpenAnswers > 0 && (
              <div className={`p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-center`}>
                <Edit3 className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                <p className={`text-2xl font-bold text-amber-600 dark:text-amber-400`}>{pendingOpenAnswers}</p>
                <p className={`text-sm text-amber-600 dark:text-amber-400`}>Da correggere</p>
              </div>
            )}
            <div className={`p-4 rounded-lg ${colors.background.secondary} text-center`}>
              <Clock className="w-6 h-6 mx-auto text-blue-500 mb-2" />
              <p className={`text-xl font-bold ${colors.text.primary}`}>{formatTimeDisplay(timeSpent)}</p>
              <p className={`text-sm ${colors.text.muted}`}>Tempo</p>
            </div>
          </div>

          {/* Score breakdown */}
          <div className={`p-4 rounded-lg ${colors.background.secondary} text-sm`}>
            <h4 className={`font-medium ${colors.text.primary} mb-2`}>Dettaglio punteggio:</h4>
            <div className={`grid grid-cols-3 gap-4 ${colors.text.secondary}`}>
              <div>
                <span className="text-green-600 font-medium">{correctAnswers}</span> corrette × <span className="font-medium">+{simulation.correctPoints}</span> = <span className="font-medium text-green-600">+{(correctAnswers * simulation.correctPoints).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-red-600 font-medium">{wrongAnswers}</span> errate × <span className="font-medium">{simulation.wrongPoints}</span> = <span className="font-medium text-red-600">{(wrongAnswers * simulation.wrongPoints).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">{blankAnswers}</span> vuote × <span className="font-medium">{simulation.blankPoints}</span> = <span className="font-medium">{(blankAnswers * simulation.blankPoints).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Subject breakdown */}
      {subjectStats.length > 0 && (
        <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-6 mb-8`}>
          <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
            <BarChart3 className="w-5 h-5" />
            Risultati per Materia
          </h2>
          <div className="space-y-4">
            {subjectStats.map(({ subject, correct, wrong, blank, total, percentage }) => (
              <div key={subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${colors.text.primary}`}>
                    {subject.replaceAll('_', ' ')}
                  </span>
                  <span className={`text-sm ${colors.text.muted}`}>
                    {correct}/{total} corrette ({percentage}%)
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                  <div
                    className="bg-green-500"
                    style={{ width: `${(correct / total) * 100}%` }}
                  />
                  <div
                    className="bg-red-400"
                    style={{ width: `${(wrong / total) * 100}%` }}
                  />
                  <div
                    className="bg-gray-400"
                    style={{ width: `${(blank / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className={colors.text.muted}>Corrette</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span className={colors.text.muted}>Errate</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-400" />
              <span className={colors.text.muted}>Non date</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboardData && leaderboardData.leaderboard.length > 0 && (
        <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} p-6 mb-8`}>
          <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
            <Trophy className="w-5 h-5 text-yellow-500" />
            Classifica
            <span className={`text-sm font-normal ${colors.text.muted}`}>
              ({leaderboardData.totalParticipants} partecipanti)
            </span>
          </h2>

          <div className="space-y-2">
            {leaderboardData.leaderboard.map((entry) => (
              <LeaderboardEntry
                key={entry.studentId || `anonymous-${entry.rank}`}
                entry={entry}
                canSeeAllNames={leaderboardData.canSeeAllNames}
              />
            ))}
          </div>

          {/* Info message */}
          {!leaderboardData.canSeeAllNames && (
            <div className={`mt-4 p-3 rounded-lg ${colors.background.secondary} flex items-start gap-2`}>
              <AlertCircle className={`w-5 h-5 ${colors.text.muted} flex-shrink-0 mt-0.5`} />
              <p className={`text-sm ${colors.text.muted}`}>
                I nomi degli altri partecipanti sono anonimi per proteggere la privacy. 
                Solo il tuo nome è visibile nella tua riga.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Question review */}
      {simulation.allowReview && (
        <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${colors.text.primary} flex items-center gap-2`}>
                <Eye className="w-5 h-5" />
                Revisione Domande
              </h2>
              <button
                onClick={() => setShowAllQuestions(!showAllQuestions)}
                className={`text-sm ${colors.primary.text} flex items-center gap-1`}
              >
                {showAllQuestions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showAllQuestions ? 'Nascondi tutte' : 'Mostra tutte'}
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {[
                { value: 'all', label: 'Tutte', count: result.answers.length },
                { value: 'correct', label: 'Corrette', count: correctAnswers },
                { value: 'wrong', label: 'Errate', count: wrongAnswers },
                { value: 'blank', label: 'Non date', count: blankAnswers - pendingOpenAnswers },
                ...(pendingOpenAnswers > 0 ? [{ value: 'pending', label: '⚡ Da valutare', count: pendingOpenAnswers }] : []),
              ].map((filter) => {
                const getFilterButtonClass = (): string => {
                  if (filterType === filter.value) {
                    if (filter.value === 'pending') return 'bg-amber-500 text-white';
                    return `${colors.primary.bg} text-white`;
                  }
                  if (filter.value === 'pending') {
                    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-2 ring-amber-400 animate-pulse';
                  }
                  return `${colors.background.secondary} ${colors.text.secondary}`;
                };
                return (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value as typeof filterType)}
                  className={`px-3 py-1.5 rounded-full text-sm ${getFilterButtonClass()}`}
                >
                  {filter.label} ({filter.count})
                </button>
              );
              })}
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAnswers.map((answer: {
              id: string;
              question: {
                id: string;
                text: string;
                textLatex?: string | null;
                subject: string;
                subjectColor?: string | null;
                answers: { id: string; text: string; textLatex?: string | null; isCorrect: boolean }[];
                explanation?: string;
              };
              selectedAnswerId: string | null;
              answerText?: string | null;
              isCorrect: boolean | null;
              timeSpent: number;
            }, index: number) => {
              const isExpanded = showAllQuestions || expandedQuestion === answer.id;
              const subjectColor = answer.question.subjectColor;
              const isOpenQuestion = !!answer.answerText && answer.question.answers.length === 0;
              const canSelfCorrect = isOpenQuestion && answer.isCorrect === null && simulation.showCorrectAnswers;

              return (
                <div key={answer.id} className="p-4">
                  <button
                    onClick={() => !showAllQuestions && setExpandedQuestion(expandedQuestion === answer.id ? null : answer.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getAnswerStatusClass(answer.isCorrect)}`}>
                        {getAnswerStatusIcon(answer.isCorrect)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${colors.text.primary}`}>
                              Domanda {index + 1}
                            </span>
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full text-white"
                              style={subjectColor ? { backgroundColor: subjectColor } : undefined}
                            >
                              {answer.question.subject.replaceAll('_', ' ')}
                            </span>
                          </div>
                          {!showAllQuestions && (
                            isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                        <div className={`text-sm ${colors.text.secondary} line-clamp-1 mt-1`}>
                          {answer.question.textLatex ? (
                            <LaTeXRenderer latex={answer.question.textLatex} className="line-clamp-1" displayMode={false} />
                          ) : (
                            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.question.text) }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pl-11 space-y-3">
                      {/* Full question */}
                      <div className={`p-3 rounded-lg ${colors.background.secondary} ${colors.text.primary} space-y-2`}>
                        {/* Question text */}
                        {answer.question.text && (
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.question.text) }} />
                        )}
                        {/* LaTeX formula if present */}
                        {answer.question.textLatex && (
                          <div className="mt-3">
                            <LaTeXRenderer latex={answer.question.textLatex} className={colors.text.primary} />
                          </div>
                        )}
                      </div>

                      {/* Open question - show student's answer and self-correction UI */}
                      {isOpenQuestion ? (
                        <div className="space-y-3">
                          {/* Student's answer */}
                          <div className={`p-4 rounded-lg border-2 ${getOpenQuestionBorderClass(answer.isCorrect)}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-gray-500" />
                              <span className={`text-sm font-medium ${colors.text.secondary}`}>La tua risposta:</span>
                            </div>
                            <div 
                              className={`${colors.text.primary}`}
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.answerText || '') }}
                            />
                          </div>

                          {/* Self-correction buttons */}
                          {canSelfCorrect && currentResultId && (
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
                                Valuta la tua risposta confrontandola con la soluzione:
                              </p>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => selfCorrectMutation.mutate({
                                    resultId: currentResultId,
                                    questionId: answer.question.id,
                                    isCorrect: true,
                                  })}
                                  disabled={selfCorrectMutation.isPending}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                  <ButtonLoader loading={selfCorrectMutation.isPending}>
                                    <ThumbsUp className="w-5 h-5" />
                                    <span>Corretta</span>
                                  </ButtonLoader>
                                </button>
                                <button
                                  onClick={() => selfCorrectMutation.mutate({
                                    resultId: currentResultId,
                                    questionId: answer.question.id,
                                    isCorrect: false,
                                  })}
                                  disabled={selfCorrectMutation.isPending}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                  <ButtonLoader loading={selfCorrectMutation.isPending}>
                                    <ThumbsDown className="w-5 h-5" />
                                    <span>Sbagliata</span>
                                  </ButtonLoader>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Already corrected status */}
                          {isOpenQuestion && answer.isCorrect !== null && (
                            <div className={`p-3 rounded-lg flex items-center gap-2 ${
                              answer.isCorrect 
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            }`}>
                              {answer.isCorrect ? (
                                <>
                                  <CheckCircle className="w-5 h-5" />
                                  <span className="font-medium">Hai valutato questa risposta come corretta</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-5 h-5" />
                                  <span className="font-medium">Hai valutato questa risposta come sbagliata</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Multiple choice answers */
                        <div className="space-y-2">
                          {answer.question.answers.map((a: { id: string; text: string; textLatex?: string | null; isCorrect: boolean }, i: number) => {
                          const label = String.fromCodePoint(65 + i);
                          const isSelected = answer.selectedAnswerId === a.id;
                          const isCorrectAnswer = a.isCorrect;

                          const bgColor = getMultipleChoiceBgColor(isCorrectAnswer, isSelected);
                          const textColor = getMultipleChoiceTextColor(isCorrectAnswer, isSelected);
                          const labelClass = getMultipleChoiceLabelClass(isCorrectAnswer, isSelected);

                          return (
                            <div
                              key={a.id}
                              className={`flex items-start gap-3 p-3 rounded-lg ${bgColor} ${textColor}`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${labelClass}`}>
                                {label}
                              </span>
                              <div className="flex-1">
                                {a.textLatex ? (
                                  <LaTeXRenderer latex={a.textLatex} displayMode={false} />
                                ) : (
                                  <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.text) }} />
                                )}
                              </div>
                              {isSelected && (
                                <span className="text-xs">La tua risposta</span>
                              )}
                              {isCorrectAnswer && (
                                <span className="text-xs">✓ Corretta</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      )}

                      {/* Explanation */}
                      {answer.question.explanation && (
                        <div className={`p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Spiegazione:</p>
                          <div 
                            className="text-sm text-blue-700 dark:text-blue-300"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.question.explanation) }}
                          />
                        </div>
                      )}

                      {/* Time spent */}
                      {answer.timeSpent > 0 && (
                        <p className={`text-xs ${colors.text.muted} flex items-center gap-1`}>
                          <Clock className="w-3 h-3" />
                          Tempo: {formatTimeDisplay(answer.timeSpent)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/simulazioni"
          className={`px-6 py-3 rounded-lg border ${colors.border.light} ${colors.text.secondary} ${colors.background.hover} text-center`}
        >
          Torna alle simulazioni
        </Link>
        {simulation.isRepeatable && (
          <Link
            href={`/simulazioni/${simulationId}`}
            className={`px-6 py-3 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 text-center`}
          >
            Riprova la simulazione
          </Link>
        )}
      </div>
    </div>
  );
}
