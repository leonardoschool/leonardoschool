'use client';

import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { trpc } from '@/lib/trpc/client';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Percent,
  Trophy,
  Calendar,
} from 'lucide-react';

interface TemplateStatisticsProps {
  simulationId: string;
}

/**
 * Comprehensive template statistics component
 * Shows advanced analytics for a simulation template
 */
export function TemplateStatistics({ simulationId }: TemplateStatisticsProps) {
  const { data, isLoading, error } = trpc.simulations.getTemplateStatistics.useQuery({
    simulationId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <p>Errore nel caricamento delle statistiche</p>
        </div>
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className={`p-8 rounded-xl ${colors.background.card} border ${colors.border.light} text-center`}>
        <BarChart3 className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted} opacity-50`} />
        <h3 className={`text-lg font-semibold ${colors.text.primary} mb-2`}>
          Nessun dato disponibile
        </h3>
        <p className={colors.text.muted}>
          Le statistiche saranno disponibili dopo che almeno uno studente avrà completato la simulazione.
        </p>
        {data?.simulation.assignmentsCount === 0 && (
          <p className={`mt-2 text-sm ${colors.text.muted}`}>
            Questa simulazione non è ancora stata assegnata a nessuno studente.
          </p>
        )}
      </div>
    );
  }

  const { overview, scoreDistribution, timeAnalysis, topPerformers, strugglingStudents, completionTrend } = data;

  // Format duration helper
  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Partecipanti</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>{overview!.totalAttempts}</p>
          {overview!.passedCount !== null && (
            <p className={`text-sm ${colors.text.muted}`}>
              {overview!.passedCount} superato ({overview!.passRate?.toFixed(0)}%)
            </p>
          )}
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Percent className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Punteggio Medio</span>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(overview!.averageScore)}`}>
            {overview!.averageScore.toFixed(1)}%
          </p>
          <p className={`text-sm ${colors.text.muted}`}>
            Mediana: {overview!.medianScore.toFixed(1)}%
          </p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Miglior Punteggio</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>{overview!.highestScore.toFixed(1)}%</p>
          <p className={`text-sm ${colors.text.muted}`}>
            Min: {overview!.lowestScore.toFixed(1)}%
          </p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Risposte Medie</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400 font-bold">
              {overview!.averageCorrect.toFixed(1)}
            </span>
            <span className={colors.text.muted}>/</span>
            <span className="text-red-600 dark:text-red-400 font-bold">
              {overview!.averageWrong.toFixed(1)}
            </span>
            <span className={colors.text.muted}>/</span>
            <span className={`${colors.text.muted} font-bold`}>
              {overview!.averageBlank.toFixed(1)}
            </span>
          </div>
          <p className={`text-xs ${colors.text.muted} mt-1`}>
            Corrette / Errate / Vuote
          </p>
        </div>
      </div>

      {/* Score Distribution Chart */}
      <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${colors.border.light}`}>
          <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Distribuzione Punteggi</h3>
          <p className={`text-sm ${colors.text.muted}`}>
            Dev. Standard: {overview!.standardDeviation.toFixed(2)}
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-end gap-1 sm:gap-2 h-40 mb-12">
            {scoreDistribution.map((bucket, index) => {
              const maxCount = Math.max(...scoreDistribution.map(b => b.count));
              const heightPercent = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
              const isPassingRange = data.simulation.passingScore 
                ? index >= Math.floor(data.simulation.passingScore / 10)
                : index >= 6;
              
              return (
                <div key={bucket.range} className="flex-1 flex flex-col items-center gap-1 relative">
                  <span className={`text-xs font-medium ${colors.text.primary}`}>
                    {bucket.count}
                  </span>
                  <div 
                    className={`w-full rounded-t-md transition-all ${
                      isPassingRange 
                        ? 'bg-green-500 dark:bg-green-600' 
                        : 'bg-red-400 dark:bg-red-500'
                    }`}
                    style={{ height: `${heightPercent}%`, minHeight: bucket.count > 0 ? '4px' : '0' }}
                  />
                  <span className={`absolute -bottom-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${colors.text.muted} transform -rotate-45 origin-center whitespace-nowrap`}>
                    {bucket.range}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Time Analysis */}
      {timeAnalysis && (
        <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${colors.border.light}`}>
            <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Analisi Tempi</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`p-3 rounded-lg ${colors.background.secondary} inline-block mb-2`}>
                  <Timer className="w-6 h-6 text-blue-500" />
                </div>
                <p className={`text-xl font-bold ${colors.text.primary}`}>
                  {formatDuration(timeAnalysis.averageTime)}
                </p>
                <p className={`text-sm ${colors.text.muted}`}>Tempo Medio</p>
              </div>
              <div className="text-center">
                <div className={`p-3 rounded-lg ${colors.background.secondary} inline-block mb-2`}>
                  <TrendingDown className="w-6 h-6 text-green-500" />
                </div>
                <p className={`text-xl font-bold ${colors.text.primary}`}>
                  {formatDuration(timeAnalysis.fastestTime)}
                </p>
                <p className={`text-sm ${colors.text.muted}`}>Più Veloce</p>
              </div>
              <div className="text-center">
                <div className={`p-3 rounded-lg ${colors.background.secondary} inline-block mb-2`}>
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                </div>
                <p className={`text-xl font-bold ${colors.text.primary}`}>
                  {formatDuration(timeAnalysis.slowestTime)}
                </p>
                <p className={`text-sm ${colors.text.muted}`}>Più Lento</p>
              </div>
              <div className="text-center">
                <div className={`p-3 rounded-lg ${colors.background.secondary} inline-block mb-2`}>
                  <Clock className="w-6 h-6 text-purple-500" />
                </div>
                <p className={`text-xl font-bold ${colors.text.primary}`}>
                  {timeAnalysis.completedInTime}/{timeAnalysis.totalWithTime}
                </p>
                <p className={`text-sm ${colors.text.muted}`}>Nei Tempi</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Performers & Struggling Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${colors.border.light} flex items-center gap-2`}>
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Top Performers</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {topPerformers.map((student, index) => (
                <div key={student.resultId} className={`px-6 py-3 flex items-center gap-4 ${colors.background.hover}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      : index === 1
                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        : index === 2
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          : `${colors.background.secondary} ${colors.text.secondary}`
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${colors.text.primary} truncate`}>{student.studentName}</p>
                    <p className={`text-sm ${colors.text.muted}`}>
                      {student.correctAnswers} corrette
                      {student.durationSeconds && ` • ${formatDuration(student.durationSeconds)}`}
                    </p>
                  </div>
                  <div className={`text-xl font-bold ${getScoreColor(student.percentageScore)}`}>
                    {student.percentageScore.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Struggling Students */}
        {strugglingStudents.length > 0 && (
          <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${colors.border.light} flex items-center gap-2`}>
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Studenti in Difficoltà</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {strugglingStudents.map((student) => (
                <div key={student.resultId} className={`px-6 py-3 flex items-center gap-4 ${colors.background.hover}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${colors.text.primary} truncate`}>{student.studentName}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        {student.correctAnswers}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-3 h-3" />
                        {student.wrongAnswers}
                      </span>
                      <span className={`flex items-center gap-1 ${colors.text.muted}`}>
                        {student.blankAnswers} vuote
                      </span>
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${getScoreColor(student.percentageScore)}`}>
                    {student.percentageScore.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Completion Trend */}
      {completionTrend.length > 1 && (
        <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${colors.border.light} flex items-center gap-2`}>
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Trend Completamenti</h3>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-1 h-32">
              {completionTrend.map((item) => {
                const maxCount = Math.max(...completionTrend.map(t => t.count));
                const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                
                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-medium ${colors.text.primary}`}>
                      {item.count}
                    </span>
                    <div 
                      className="w-full rounded-t-md bg-blue-500 dark:bg-blue-600 transition-all"
                      style={{ height: `${heightPercent}%`, minHeight: item.count > 0 ? '4px' : '0' }}
                    />
                    <span className={`text-[10px] ${colors.text.muted} whitespace-nowrap`}>
                      {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateStatistics;
