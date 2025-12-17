'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
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
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';

// Helper per badge di posizione
function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20">
          <Crown className="w-5 h-5 text-yellow-500" />
        </div>
      );
    case 2:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300/20">
          <Medal className="w-5 h-5 text-gray-400" />
        </div>
      );
    case 3:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600/20">
          <Award className="w-5 h-5 text-amber-600" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-700/50">
          <span className="text-sm font-medium text-zinc-400">{rank}</span>
        </div>
      );
  }
}

// Helper per formattare la durata
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export default function ClassificaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  
  const assignmentId = searchParams.get('assignmentId') || undefined;
  const groupId = searchParams.get('groupId') || undefined;

  const { data, isLoading, error } = trpc.simulations.getLeaderboard.useQuery(
    { 
      simulationId: id, 
      assignmentId,
      groupId,
      limit: 100 
    },
    { enabled: !!id }
  );

  // Determine back navigation path
  const getBackPath = () => {
    if (assignmentId) {
      return `/simulazioni/${id}/statistiche-assegnazione?assignmentId=${assignmentId}`;
    }
    if (groupId) {
      return `/simulazioni/${id}/statistiche-assegnazione?groupId=${groupId}`;
    }
    return '/simulazioni';
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !data) {
    return (
      <div className={`min-h-screen ${colors.background.primary} p-6`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">
              {error?.message || 'Errore nel caricamento della classifica'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { simulation, leaderboard, totalParticipants, canSeeAllNames } = data;
  const myPosition = leaderboard.find((e) => e.isCurrentUser);

  // Top 3 per il podio
  const podium = leaderboard.slice(0, 3);
  // Resto della classifica
  const restOfLeaderboard = leaderboard.slice(3);

  return (
    <div className={`min-h-screen ${colors.background.primary}`}>
      {/* Header */}
      <div className={`${colors.background.secondary} border-b ${colors.border.primary}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push(getBackPath())}
            className={`flex items-center gap-2 ${colors.text.muted} hover:${colors.text.primary} transition-colors mb-4`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna indietro</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
                Classifica
              </h1>
              <p className={`mt-1 ${colors.text.muted}`}>{simulation.title}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className={`w-4 h-4 ${colors.text.muted}`} />
              <span className={colors.text.muted}>
                {totalParticipants} partecipanti
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* La tua posizione */}
        {myPosition && (
          <div
            className={`mb-8 p-6 rounded-xl ${colors.background.card} border ${colors.border.primary}`}
          >
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>
              La tua posizione
            </h2>
            <div className="flex items-center gap-4">
              {getRankBadge(myPosition.rank)}
              <div className="flex-1">
                <p className={`font-medium ${colors.text.primary}`}>
                  {myPosition.studentName}
                </p>
                <p className={`text-sm ${colors.text.muted}`}>
                  Posizione #{myPosition.rank} su {totalParticipants}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${colors.primary.text}`}>
                  {myPosition.totalScore?.toFixed(2)} punti
                </p>
                <div className="flex items-center gap-3 text-sm mt-1">
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {myPosition.correctAnswers}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    {myPosition.wrongAnswers}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {myPosition.blankAnswers}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Podio */}
        {podium.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-6`}>
              Podio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Secondo posto */}
              {podium[1] && (
                <div
                  className={`order-1 sm:order-1 p-6 rounded-xl ${colors.background.card} border ${colors.border.primary} ${
                    podium[1].isCurrentUser ? 'ring-2 ring-pink-500' : ''
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-300/20 flex items-center justify-center mb-3">
                      <Medal className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className={`font-medium ${colors.text.primary} mb-1`}>
                      {podium[1].studentName}
                    </p>
                    {canSeeAllNames && podium[1].studentMatricola && (
                      <p className={`text-xs ${colors.text.muted} mb-2`}>
                        Matricola: {podium[1].studentMatricola}
                      </p>
                    )}
                    <p className={`text-2xl font-bold ${colors.text.primary}`}>
                      {podium[1].totalScore?.toFixed(2)}
                    </p>
                    <p className={`text-xs ${colors.text.muted}`}>punti</p>
                  </div>
                </div>
              )}

              {/* Primo posto */}
              {podium[0] && (
                <div
                  className={`order-0 sm:order-2 p-6 rounded-xl bg-gradient-to-b from-yellow-500/20 to-transparent border border-yellow-500/30 ${
                    podium[0].isCurrentUser ? 'ring-2 ring-pink-500' : ''
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-yellow-400/20 flex items-center justify-center mb-3">
                      <Trophy className="w-10 h-10 text-yellow-500" />
                    </div>
                    <p className={`font-medium ${colors.text.primary} mb-1`}>
                      {podium[0].studentName}
                    </p>
                    {canSeeAllNames && podium[0].studentMatricola && (
                      <p className={`text-xs ${colors.text.muted} mb-2`}>
                        Matricola: {podium[0].studentMatricola}
                      </p>
                    )}
                    <p className="text-3xl font-bold text-yellow-500">
                      {podium[0].totalScore?.toFixed(2)}
                    </p>
                    <p className={`text-xs ${colors.text.muted}`}>punti</p>
                  </div>
                </div>
              )}

              {/* Terzo posto */}
              {podium[2] && (
                <div
                  className={`order-2 sm:order-3 p-6 rounded-xl ${colors.background.card} border ${colors.border.primary} ${
                    podium[2].isCurrentUser ? 'ring-2 ring-pink-500' : ''
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-600/20 flex items-center justify-center mb-3">
                      <Award className="w-8 h-8 text-amber-600" />
                    </div>
                    <p className={`font-medium ${colors.text.primary} mb-1`}>
                      {podium[2].studentName}
                    </p>
                    {canSeeAllNames && podium[2].studentMatricola && (
                      <p className={`text-xs ${colors.text.muted} mb-2`}>
                        Matricola: {podium[2].studentMatricola}
                      </p>
                    )}
                    <p className={`text-2xl font-bold ${colors.text.primary}`}>
                      {podium[2].totalScore?.toFixed(2)}
                    </p>
                    <p className={`text-xs ${colors.text.muted}`}>punti</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Classifica completa */}
        {restOfLeaderboard.length > 0 && (
          <div>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>
              Classifica completa
            </h2>
            <div
              className={`rounded-xl ${colors.background.card} border ${colors.border.primary} overflow-hidden`}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${colors.border.primary}`}>
                      <th
                        className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}
                      >
                        Pos.
                      </th>
                      <th
                        className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}
                      >
                        Studente
                      </th>
                      {canSeeAllNames && (
                        <th
                          className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden lg:table-cell`}
                        >
                          Matricola
                        </th>
                      )}
                      <th
                        className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}
                      >
                        Punteggio
                      </th>
                      <th
                        className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden sm:table-cell`}
                      >
                        <CheckCircle className="w-4 h-4 text-green-400 inline" />
                      </th>
                      <th
                        className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden sm:table-cell`}
                      >
                        <XCircle className="w-4 h-4 text-red-400 inline" />
                      </th>
                      <th
                        className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden md:table-cell`}
                      >
                        <Clock className="w-4 h-4 text-zinc-400 inline" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700/50">
                    {restOfLeaderboard.map((entry) => (
                      <tr
                        key={entry.rank}
                        className={`${
                          entry.isCurrentUser
                            ? 'bg-pink-500/10'
                            : 'hover:bg-zinc-700/30'
                        } transition-colors`}
                      >
                        <td className="px-4 py-3">
                          {getRankBadge(entry.rank)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                entry.isCurrentUser
                                  ? colors.primary.text
                                  : colors.text.primary
                              }`}
                            >
                              {entry.studentName}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
                                Tu
                              </span>
                            )}
                          </div>
                        </td>
                        {canSeeAllNames && (
                          <td className={`px-4 py-3 ${colors.text.muted} hidden lg:table-cell`}>
                            {entry.studentMatricola || '-'}
                          </td>
                        )}
                        <td
                          className={`px-4 py-3 text-center font-semibold ${colors.text.primary}`}
                        >
                          {entry.totalScore?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-green-400 hidden sm:table-cell">
                          {entry.correctAnswers}
                        </td>
                        <td className="px-4 py-3 text-center text-red-400 hidden sm:table-cell">
                          {entry.wrongAnswers}
                        </td>
                        <td
                          className={`px-4 py-3 text-center ${colors.text.muted} hidden md:table-cell`}
                        >
                          {entry.durationSeconds ? formatDuration(entry.durationSeconds) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {leaderboard.length === 0 && (
          <div
            className={`text-center py-12 rounded-xl ${colors.background.card} border ${colors.border.primary}`}
          >
            <Trophy className={`w-16 h-16 mx-auto ${colors.text.muted} mb-4`} />
            <h3 className={`text-lg font-medium ${colors.text.primary} mb-2`}>
              Nessun partecipante
            </h3>
            <p className={colors.text.muted}>
              Non ci sono ancora risultati per questa simulazione.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
