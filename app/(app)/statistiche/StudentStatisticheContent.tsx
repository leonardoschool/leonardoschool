'use client';

import { trpc } from '@/lib/trpc/client';
import { colors, getSubjectColor } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import Link from 'next/link';
import {
  BarChart3,
  Target,
  Clock,
  Award,
  TrendingUp,
  TrendingDown,
  Flame,
  BookOpen,
  CheckCircle,
  Calendar,
  Activity,
  Trophy,
  Zap,
  XCircle,
  HelpCircle,
  ChevronRight,
  Star,
  Medal,
  Timer,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { SimulationType } from '@/lib/validations/simulationValidation';
import dynamic from 'next/dynamic';

// Type for subject names used in getSubjectColor
type SubjectName = 'MATEMATICA' | 'BIOLOGIA' | 'CHIMICA' | 'FISICA' | 'LOGICA' | 'CULTURA_GENERALE';

// Dynamically import charts to avoid SSR issues with recharts
const ScoreTrendChart = dynamic(
  () => import('@/components/statistiche/charts/ScoreTrendChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const SubjectRadarChart = dynamic(
  () => import('@/components/statistiche/charts/SubjectRadarChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const AnswerDistributionChart = dynamic(
  () => import('@/components/statistiche/charts/AnswerDistributionChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const SimulationTypeChart = dynamic(
  () => import('@/components/statistiche/charts/SimulationTypeChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const DifficultyBreakdownChart = dynamic(
  () => import('@/components/statistiche/charts/DifficultyBreakdownChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const MonthlyActivityChart = dynamic(
  () => import('@/components/statistiche/charts/MonthlyActivityChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return (
    <div className="h-[220px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg flex items-center justify-center">
      <Activity className="w-8 h-8 text-gray-400 dark:text-gray-600" />
    </div>
  );
}

const TYPE_LABELS: Record<SimulationType, string> = {
  OFFICIAL: 'Ufficiali',
  PRACTICE: 'Pratica',
  CUSTOM: 'Personalizzate',
  QUICK_QUIZ: 'Quiz Veloci',
};

const TYPE_COLORS: Record<SimulationType, string> = {
  OFFICIAL: '#3B82F6',
  PRACTICE: '#22C55E',
  CUSTOM: '#a8012b',
  QUICK_QUIZ: '#F59E0B',
};

const SUBJECT_LABELS: Record<string, string> = {
  BIOLOGIA: 'Biologia',
  CHIMICA: 'Chimica',
  FISICA: 'Fisica',
  MATEMATICA: 'Matematica',
  LOGICA: 'Logica',
  CULTURA_GENERALE: 'Cultura Generale',
};

export default function StudentStatisticheContent() {
  const { data: stats, isLoading, error } = trpc.students.getDetailedStats.useQuery();

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="p-6 sm:p-10">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Errore nel caricamento
          </h3>
          <p className="text-red-600 dark:text-red-300">
            Non è stato possibile caricare le statistiche. Riprova più tardi.
          </p>
        </div>
      </div>
    );
  }

  if (!stats || stats.overview.totalSimulations === 0) {
    return (
      <div className="p-6 sm:p-10">
        <div className="text-center py-16">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${colors.primary.gradient} flex items-center justify-center`}>
            <BarChart3 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            Nessuna simulazione completata
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Inizia a fare le simulazioni per vedere le tue statistiche e monitorare i tuoi progressi.
          </p>
          <Link
            href="/simulazioni"
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium ${colors.primary.gradient} hover:opacity-90 transition-opacity`}
          >
            <Zap className="w-5 h-5" />
            Inizia una simulazione
          </Link>
        </div>
      </div>
    );
  }

  const { overview, typeBreakdown, trendData, monthlyTrend, subjectStats, bestSubject, worstSubject, answerDistribution, difficultyBreakdown, achievements, recentResults } = stats;

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            Le tue Statistiche
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitora i tuoi progressi e migliora le tue performance
          </p>
        </div>
        <Link
          href="/simulazioni"
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium ${colors.primary.gradient} hover:opacity-90 transition-opacity`}
        >
          <Zap className="w-4 h-4" />
          Nuova Simulazione
        </Link>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${colors.primary.gradient}`}>
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Simulazioni</span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">
            {overview.totalSimulations}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">completate</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Media</span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">
            {overview.averageScore.toFixed(1)}%
          </p>
          <div className="flex items-center gap-1 mt-1">
            {overview.improvement >= 0 ? (
              <>
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">+{overview.improvement.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">{overview.improvement.toFixed(1)}%</span>
              </>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs prime 5</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Miglior Punteggio</span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">
            {overview.bestScore.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">record personale</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Serie Attuale</span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">
            {overview.currentStreak}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">giorni consecutivi</p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium">Corrette</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{overview.totalCorrect}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium">Errate</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{overview.totalWrong}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <HelpCircle className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium">Non date</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{overview.totalBlank}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium">Tempo Medio</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{overview.averageTime}m</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium">Questo Mese</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{overview.simulationsThisMonth}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Timer className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium">Tempo Totale</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{overview.totalTimeSpent}m</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Andamento Punteggio</h3>
          </div>
          {trendData.length > 0 ? (
            <ScoreTrendChart data={trendData} avgScore={overview.averageScore} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Dati insufficienti
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Performance per Materia</h3>
          </div>
          {subjectStats.length > 0 ? (
            <SubjectRadarChart data={subjectStats} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Dati insufficienti
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Distribuzione Risposte</h3>
          </div>
          <AnswerDistributionChart data={answerDistribution} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Tipi di Simulazione</h3>
          </div>
          {typeBreakdown.length > 0 ? (
            <SimulationTypeChart data={typeBreakdown} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Dati insufficienti
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Difficoltà Domande</h3>
          </div>
          {difficultyBreakdown.length > 0 ? (
            <DifficultyBreakdownChart data={difficultyBreakdown} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Dati insufficienti
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Attività Mensile</h3>
          </div>
          {monthlyTrend.length > 0 ? (
            <MonthlyActivityChart data={monthlyTrend} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Dati insufficienti
            </div>
          )}
        </div>
      </div>

      {/* Best/Worst Subjects */}
      {(bestSubject || worstSubject) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bestSubject && (
            <div className={`rounded-2xl p-5 sm:p-6 shadow-sm border ${getSubjectColor(bestSubject.subject as SubjectName, 'bg')} bg-opacity-10 dark:bg-opacity-20 border-gray-100 dark:border-gray-700`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${getSubjectColor(bestSubject.subject as SubjectName, 'bg')}`}>
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Materia Migliore</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{SUBJECT_LABELS[bestSubject.subject] || bestSubject.subject}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{bestSubject.accuracy.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Accuratezza</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{bestSubject.totalQuestions}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Domande</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{bestSubject.correctAnswers}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Corrette</p>
                </div>
              </div>
            </div>
          )}
          {worstSubject && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Da Migliorare</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{SUBJECT_LABELS[worstSubject.subject] || worstSubject.subject}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{worstSubject.accuracy.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Accuratezza</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{worstSubject.totalQuestions}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Domande</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{worstSubject.correctAnswers}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Corrette</p>
                </div>
              </div>
              <Link
                href={`/simulazioni?subject=${worstSubject.subject}`}
                className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${colors.primary.text} hover:underline`}
              >
                Esercitati su questa materia
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Traguardi Raggiunti</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl text-center ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800'
                    : 'bg-gray-100 dark:bg-gray-700 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{achievement.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Ultime Simulazioni</h3>
            </div>
            <Link
              href="/simulazioni"
              className={`text-sm font-medium ${colors.primary.text} hover:underline flex items-center gap-1`}
            >
              Vedi tutte
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentResults.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-2 h-10 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[result.type as SimulationType] || '#a8012b' }}
                  />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {result.title || TYPE_LABELS[result.type as SimulationType] || result.type}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(result.date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    result.score >= 70 ? 'text-green-600 dark:text-green-400' :
                    result.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {result.score.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {result.correct}/{result.total} corrette
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulation Type Breakdown */}
      {typeBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Medal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Dettaglio per Tipo</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {typeBreakdown.map((type, index) => (
              <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[type.type as SimulationType] || '#a8012b' }}
                  />
                  <span className="font-medium text-gray-800 dark:text-white">
                    {TYPE_LABELS[type.type as SimulationType] || type.type}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Completate</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{type.count}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Media</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{type.averageScore.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
