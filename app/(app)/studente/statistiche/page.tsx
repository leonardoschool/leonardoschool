'use client';

import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import {
  BarChart3,
  Target,
  Clock,
  Award,
  TrendingUp,
  Flame,
  BookOpen,
  CheckCircle,
  Calendar,
  Activity,
} from 'lucide-react';
import type { SimulationType } from '@/lib/validations/simulationValidation';

// Type labels
const typeLabels: Record<SimulationType, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

// Subject labels
const subjectLabels: Record<string, string> = {
  BIOLOGIA: 'Biologia',
  CHIMICA: 'Chimica',
  FISICA: 'Fisica',
  MATEMATICA: 'Matematica',
  LOGICA: 'Logica',
  CULTURA_GENERALE: 'Cultura Generale',
};

export default function StudentStatsPage() {
  const { data: stats, isLoading } = trpc.students.getMyStats.useQuery();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className={`text-center ${colors.text.muted}`}>
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Impossibile caricare le statistiche</p>
        </div>
      </div>
    );
  }

  const { overview, subjectStats, recentResults } = stats;

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Mai';
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Le Mie Statistiche</h1>
          <p className={colors.text.muted}>Monitora i tuoi progressi e risultati</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Simulazioni</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>{overview.totalSimulations}</p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Risposte Corrette</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>
            {overview.totalCorrectAnswers}/{overview.totalQuestions}
          </p>
          <p className={`text-sm ${colors.text.muted}`}>
            {overview.totalQuestions > 0
              ? `${Math.round((overview.totalCorrectAnswers / overview.totalQuestions) * 100)}%`
              : '0%'}
          </p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Punteggio Medio</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>
            {overview.avgScore.toFixed(1)}%
          </p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Miglior Punteggio</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>
            {overview.bestScore.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Study Time & Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Tempo di Studio</span>
          </div>
          <p className={`text-2xl font-bold ${colors.text.primary}`}>
            {formatTime(overview.totalStudyTimeMinutes)}
          </p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Streak Attuale</span>
          </div>
          <p className={`text-2xl font-bold ${colors.text.primary}`}>
            {overview.currentStreak} giorni
          </p>
          <p className={`text-sm ${colors.text.muted}`}>Record: {overview.longestStreak} giorni</p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Ultima Attività</span>
          </div>
          <p className={`text-lg font-semibold ${colors.text.primary}`}>
            {formatDate(overview.lastActivityDate)}
          </p>
        </div>
      </div>

      {/* Subject Stats */}
      {Object.keys(subjectStats).length > 0 && (
        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Statistiche per Materia</h2>
          </div>

          <div className="space-y-4">
            {Object.entries(subjectStats).map(([subject, data]) => {
              const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
              return (
                <div key={subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${colors.text.primary}`}>
                      {subjectLabels[subject] || subject}
                    </span>
                    <span className={colors.text.muted}>
                      {data.correct}/{data.total} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className={`h-2 rounded-full ${colors.background.secondary}`}>
                    <div
                      className={`h-full rounded-full ${
                        percentage >= 70
                          ? 'bg-green-500'
                          : percentage >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Results */}
      <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <div className="flex items-center gap-3 mb-6">
          <Activity className={`w-5 h-5 ${colors.text.muted}`} />
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Risultati Recenti</h2>
        </div>

        {recentResults.length === 0 ? (
          <div className={`text-center py-8 ${colors.text.muted}`}>
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessuna simulazione completata</p>
            <p className="text-sm">Inizia una simulazione per vedere i tuoi risultati qui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentResults.map((result) => (
              <div
                key={result.id}
                className={`flex items-center justify-between p-4 rounded-lg ${colors.background.secondary}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      result.completedAt
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}
                  >
                    {result.completedAt ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${colors.text.primary}`}>{result.simulationTitle}</p>
                    <p className={`text-sm ${colors.text.muted}`}>
                      {typeLabels[result.simulationType as SimulationType]} •{' '}
                      {formatDate(result.startedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {result.completedAt && result.percentageScore !== null && (
                    <>
                      <p
                        className={`text-lg font-bold ${
                          (result.percentageScore ?? 0) >= 70
                            ? 'text-green-600 dark:text-green-400'
                            : (result.percentageScore ?? 0) >= 50
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {result.percentageScore?.toFixed(1)}%
                      </p>
                      <p className={`text-sm ${colors.text.muted}`}>
                        Punteggio: {result.totalScore?.toFixed(1)}
                      </p>
                    </>
                  )}
                  {!result.completedAt && (
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                      In corso...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
