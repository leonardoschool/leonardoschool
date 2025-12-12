'use client';

import { use } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Target,
  Clock,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle,
  MinusCircle,
  BarChart3,
} from 'lucide-react';

export default function SimulationStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Fetch simulation with results
  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery({ id });

  if (isLoading) {
    return <PageLoader />;
  }

  if (!simulation) {
    return (
      <div className="p-6">
        <div className={`text-center py-12 ${colors.text.muted}`}>
          Simulazione non trovata
        </div>
      </div>
    );
  }

  const results = simulation.results;
  const completedResults = results.filter(r => r.completedAt !== null);

  // Calculate statistics
  const totalParticipants = results.length;
  const completedCount = completedResults.length;
  const inProgressCount = results.filter(r => r.completedAt === null).length;

  const avgScore = completedResults.length > 0
    ? completedResults.reduce((sum, r) => sum + (r.percentageScore ?? 0), 0) / completedResults.length
    : 0;

  const bestScore = completedResults.length > 0
    ? Math.max(...completedResults.map(r => r.percentageScore ?? 0))
    : 0;

  const worstScore = completedResults.length > 0
    ? Math.min(...completedResults.map(r => r.percentageScore ?? 0))
    : 0;

  const passedCount = simulation.passingScore
    ? completedResults.filter(r => (r.percentageScore ?? 0) >= (simulation.passingScore ?? 0)).length
    : null;

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/simulazioni/${id}`}
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla simulazione
        </Link>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Statistiche</h1>
            <p className={colors.text.muted}>{simulation.title}</p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Partecipanti</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>{totalParticipants}</p>
          <p className={`text-sm ${colors.text.muted}`}>
            {completedCount} completati, {inProgressCount} in corso
          </p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Punteggio Medio</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>{avgScore.toFixed(1)}%</p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Miglior Punteggio</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>{bestScore.toFixed(1)}%</p>
        </div>

        {passedCount !== null && (
          <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className={`text-sm ${colors.text.muted}`}>Superati</span>
            </div>
            <p className={`text-3xl font-bold ${colors.text.primary}`}>
              {passedCount}/{completedCount}
            </p>
            <p className={`text-sm ${colors.text.muted}`}>
              {completedCount > 0 ? ((passedCount / completedCount) * 100).toFixed(0) : 0}% tasso di successo
            </p>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${colors.border.light}`}>
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
            Tutti i risultati ({results.length})
          </h2>
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center">
            <Users className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted} opacity-50`} />
            <p className={colors.text.muted}>Nessun partecipante ancora</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={colors.background.secondary}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}>Studente</th>
                  <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Stato</th>
                  <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Punteggio</th>
                  <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Risposte</th>
                  <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Durata</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}>Completato</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${colors.border.light}`}>
                {results.map((result) => (
                  <tr key={result.id} className={colors.background.hover}>
                    <td className={`px-4 py-3 ${colors.text.primary}`}>
                      <div>
                        <p className="font-medium">{result.student?.user?.name || 'Studente'}</p>
                        <p className={`text-sm ${colors.text.muted}`}>{result.student?.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {result.completedAt !== null ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle className="w-3 h-3" />
                          Completato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          <Clock className="w-3 h-3" />
                          In corso
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {result.completedAt !== null ? (
                        <div>
                          <p className={`font-bold text-lg ${
                            (result.percentageScore ?? 0) >= 70
                              ? 'text-green-600 dark:text-green-400'
                              : (result.percentageScore ?? 0) >= 50
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {result.percentageScore?.toFixed(1)}%
                          </p>
                          <p className={`text-xs ${colors.text.muted}`}>
                            {result.totalScore?.toFixed(1)} punti
                          </p>
                        </div>
                      ) : (
                        <span className={colors.text.muted}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          {result.correctAnswers ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3 h-3" />
                          {result.wrongAnswers ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <MinusCircle className="w-3 h-3" />
                          {result.blankAnswers ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-center ${colors.text.secondary}`}>
                      {formatDuration(result.durationSeconds)}
                    </td>
                    <td className={`px-4 py-3 text-sm ${colors.text.muted}`}>
                      {result.completedAt ? formatDate(result.completedAt) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
