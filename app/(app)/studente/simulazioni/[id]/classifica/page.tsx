'use client';

import { use } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import Link from 'next/link';
import {
  ArrowLeft,
  Trophy,
  Medal,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Crown,
  User,
} from 'lucide-react';

export default function StudentLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Fetch leaderboard
  const { data, isLoading } = trpc.simulations.getLeaderboard.useQuery({ 
    simulationId: id,
    limit: 100,
  });

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get rank badge
  const getRankBadge = (rank: number, isCurrentUser: boolean) => {
    switch (rank) {
      case 1:
        return (
          <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg ${isCurrentUser ? 'ring-2 ring-red-500' : ''}`}>
            <Crown className="w-5 h-5 text-white" />
          </div>
        );
      case 2:
        return (
          <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-lg ${isCurrentUser ? 'ring-2 ring-red-500' : ''}`}>
            <Medal className="w-5 h-5 text-white" />
          </div>
        );
      case 3:
        return (
          <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg ${isCurrentUser ? 'ring-2 ring-red-500' : ''}`}>
            <Medal className="w-5 h-5 text-white" />
          </div>
        );
      default:
        return (
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${colors.background.secondary} ${isCurrentUser ? 'ring-2 ring-red-500' : ''}`}>
            <span className={`text-lg font-bold ${isCurrentUser ? 'text-red-600' : colors.text.primary}`}>{rank}</span>
          </div>
        );
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className={`text-center py-12 ${colors.background.card} rounded-xl`}>
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className={colors.text.muted}>Simulazione non trovata</p>
        </div>
      </div>
    );
  }

  const { simulation, leaderboard, totalParticipants } = data;
  
  // Find current user's position
  const myPosition = leaderboard.find(e => e.isCurrentUser);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/studente/simulazioni/${id}/risultato`}
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna al risultato
        </Link>

        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600`}>
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Classifica</h1>
            <p className={colors.text.muted}>
              {simulation.title}
              {simulation.isOfficial && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  <Award className="w-3 h-3" />
                  Ufficiale
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* My Position Highlight */}
      {myPosition && (
        <div className={`mb-6 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 border-2 border-red-500/30`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <User className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className={`font-semibold ${colors.text.primary}`}>La tua posizione</p>
                <p className={colors.text.muted}>Sei {myPosition.rank}° su {totalParticipants} partecipanti</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold text-red-600`}>{myPosition.totalScore.toFixed(1)}</p>
              <p className={`text-sm ${colors.text.muted}`}>{myPosition.percentageScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className={`mb-6 p-4 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{totalParticipants}</p>
            <p className={`text-sm ${colors.text.muted}`}>Partecipanti</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{simulation.totalQuestions}</p>
            <p className={`text-sm ${colors.text.muted}`}>Domande</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{simulation.maxScore?.toFixed(1) || '-'}</p>
            <p className={`text-sm ${colors.text.muted}`}>Punteggio Max</p>
          </div>
          {simulation.passingScore && (
            <div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{simulation.passingScore.toFixed(1)}</p>
              <p className={`text-sm ${colors.text.muted}`}>Soglia Superamento</p>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-4 items-end">
            {/* Second Place */}
            <div className={`text-center p-4 rounded-xl ${colors.background.card} border ${leaderboard[1].isCurrentUser ? 'border-red-500 border-2' : colors.border.light}`}>
              <div className={`flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-lg ${leaderboard[1].isCurrentUser ? 'ring-2 ring-red-500' : ''}`}>
                <Medal className="w-6 h-6 text-white" />
              </div>
              <p className={`font-semibold ${leaderboard[1].isCurrentUser ? 'text-red-600' : colors.text.primary} truncate`}>
                {leaderboard[1].studentName}
                {leaderboard[1].isCurrentUser && <span className="block text-xs">(Tu)</span>}
              </p>
              <p className={`text-2xl font-bold text-gray-600 dark:text-gray-300`}>
                {leaderboard[1].totalScore.toFixed(1)}
              </p>
              <p className={`text-xs ${colors.text.muted}`}>
                {leaderboard[1].percentageScore.toFixed(1)}%
              </p>
            </div>

            {/* First Place */}
            <div className={`text-center p-6 rounded-xl ${colors.background.card} shadow-lg transform scale-105 ${leaderboard[0].isCurrentUser ? 'border-2 border-red-500' : 'border-2 border-yellow-400'}`}>
              <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl ${leaderboard[0].isCurrentUser ? 'ring-2 ring-red-500' : ''}`}>
                <Crown className="w-8 h-8 text-white" />
              </div>
              <p className={`font-bold text-lg ${leaderboard[0].isCurrentUser ? 'text-red-600' : colors.text.primary} truncate`}>
                {leaderboard[0].studentName}
                {leaderboard[0].isCurrentUser && <span className="block text-xs font-normal">(Tu)</span>}
              </p>
              <p className={`text-3xl font-bold text-yellow-600 dark:text-yellow-400`}>
                {leaderboard[0].totalScore.toFixed(1)}
              </p>
              <p className={`text-sm ${colors.text.muted}`}>
                {leaderboard[0].percentageScore.toFixed(1)}%
              </p>
            </div>

            {/* Third Place */}
            <div className={`text-center p-4 rounded-xl ${colors.background.card} border ${leaderboard[2].isCurrentUser ? 'border-red-500 border-2' : colors.border.light}`}>
              <div className={`flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg ${leaderboard[2].isCurrentUser ? 'ring-2 ring-red-500' : ''}`}>
                <Medal className="w-6 h-6 text-white" />
              </div>
              <p className={`font-semibold ${leaderboard[2].isCurrentUser ? 'text-red-600' : colors.text.primary} truncate`}>
                {leaderboard[2].studentName}
                {leaderboard[2].isCurrentUser && <span className="block text-xs">(Tu)</span>}
              </p>
              <p className={`text-2xl font-bold text-amber-700 dark:text-amber-400`}>
                {leaderboard[2].totalScore.toFixed(1)}
              </p>
              <p className={`text-xs ${colors.text.muted}`}>
                {leaderboard[2].percentageScore.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${colors.border.light}`}>
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
            Classifica Completa
          </h2>
          <p className={`text-sm ${colors.text.muted}`}>
            I nomi degli altri partecipanti sono anonimi per privacy
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted} opacity-50`} />
            <p className={colors.text.muted}>Nessun partecipante ancora</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={colors.background.secondary}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase w-16`}>Pos.</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}>Partecipante</th>
                  <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Punteggio</th>
                  <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Risposte</th>
                  <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Tempo</th>
                  {simulation.passingScore && (
                    <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Esito</th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${colors.border.light}`}>
                {leaderboard.map((entry, index) => (
                  <tr 
                    key={entry.studentId || `anon-${index}`} 
                    className={`${colors.background.hover} ${
                      entry.isCurrentUser 
                        ? 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500 ring-inset' 
                        : entry.rank <= 3 
                          ? 'bg-yellow-50/50 dark:bg-yellow-900/10' 
                          : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      {getRankBadge(entry.rank, entry.isCurrentUser)}
                    </td>
                    <td className={`px-4 py-3 ${colors.text.primary}`}>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className={`font-medium ${entry.isCurrentUser ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {entry.studentName}
                            {entry.isCurrentUser && (
                              <span className="ml-2 text-xs font-normal text-red-500">(Tu)</span>
                            )}
                          </p>
                          {entry.className && (
                            <p className={`text-sm ${colors.text.muted}`}>{entry.className}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <p className={`font-bold text-lg ${
                          entry.percentageScore >= 70
                            ? 'text-green-600 dark:text-green-400'
                            : entry.percentageScore >= 50
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {entry.totalScore.toFixed(1)}
                        </p>
                        <p className={`text-xs ${colors.text.muted}`}>
                          {entry.percentageScore.toFixed(1)}%
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          {entry.correctAnswers}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3 h-3" />
                          {entry.wrongAnswers}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`flex items-center justify-center gap-1 ${colors.text.secondary}`}>
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.durationSeconds)}
                      </span>
                    </td>
                    {simulation.passingScore && (
                      <td className="px-4 py-3 text-center">
                        {entry.passed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle className="w-3 h-3" />
                            Superato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            <XCircle className="w-3 h-3" />
                            Non superato
                          </span>
                        )}
                      </td>
                    )}
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
