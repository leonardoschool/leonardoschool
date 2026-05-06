'use client';

import { Fragment, useState } from 'react';
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
  Download,
  ChevronDown,
  ChevronUp,
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

type BreakdownItem = {
  name: string;
  color?: string | null;
  correct: number;
  wrong: number;
  blank: number;
  score: number;
};

function BreakdownList({ title, items }: { title: string; items?: BreakdownItem[] }) {
  if (!items?.length) return null;

  return (
    <div>
      <p className={`mb-2 text-xs font-semibold ${colors.text.secondary}`}>{title}</p>
      <div className={`max-h-56 overflow-y-auto rounded-lg border ${colors.border.light} divide-y ${colors.border.light}`}>
        {items.map((item) => (
          <div key={`${title}-${item.name}`} className={`flex items-center justify-between gap-3 px-3 py-2 ${colors.background.card}`}>
            <span className={`min-w-0 truncate text-xs font-medium ${colors.text.primary}`}>
              {item.color && (
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              )}
              {item.name}
            </span>
            <div className="shrink-0 text-right">
              <span className={`text-xs font-semibold ${colors.primary.text}`}>{item.score.toFixed(2)} pt</span>
              <p className={`text-xs ${colors.text.muted}`}>
                {item.correct} / {item.wrong} / {item.blank}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownPreview({ title, items }: { title: string; items?: BreakdownItem[] }) {
  if (!items?.length) return null;

  const visibleItems = items.slice(0, 2);
  const remainingCount = items.length - visibleItems.length;

  return (
    <div className="w-full text-left">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold ${colors.text.secondary}`}>{title}</p>
        <span className={`text-xs ${colors.text.muted}`}>{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <div key={`${title}-${item.name}`} className={`flex items-center justify-between gap-2 rounded-lg ${colors.background.secondary} px-2.5 py-1.5`}>
            <span className={`min-w-0 truncate text-xs font-medium ${colors.text.primary}`}>
              {item.color && (
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              )}
              {item.name}
            </span>
            <span className={`shrink-0 text-xs font-semibold ${colors.primary.text}`}>{item.score.toFixed(2)} pt</span>
          </div>
        ))}
      </div>
      {remainingCount > 0 && (
        <p className={`mt-1.5 text-xs ${colors.text.muted}`}>+{remainingCount} altri dettagli</p>
      )}
    </div>
  );
}

function exportLeaderboardCsv(
  simulationTitle: string,
  leaderboard: Array<{
    rank?: number;
    studentName?: string | null;
    studentEmail?: string | null;
    studentMatricola?: string | null;
    totalScore?: number;
    percentageScore?: number;
    correctAnswers?: number;
    wrongAnswers?: number;
    blankAnswers?: number;
    durationSeconds?: number | null;
    completedAt?: string | Date | null;
    subjectBreakdown?: BreakdownItem[];
    sectionBreakdown?: BreakdownItem[];
  }>
) {
  const escapeCsv = (value: string | number | null | undefined) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const formatItems = (items?: BreakdownItem[]) =>
    items?.map((item) => `${item.name}: ${item.score.toFixed(2)} (${item.correct}/${item.wrong}/${item.blank})`).join(' | ') ?? '';
  const rows = [
    ['Posizione', 'Studente', 'Email', 'Matricola', 'Punteggio', 'Percentuale', 'Corrette', 'Errate', 'Vuote', 'Durata', 'Completata il', 'Punteggi materia', 'Punteggi sezione'],
    ...leaderboard.map((entry) => [
      entry.rank,
      entry.studentName,
      entry.studentEmail,
      entry.studentMatricola,
      (entry.totalScore ?? 0).toFixed(2),
      (entry.percentageScore ?? 0).toFixed(2),
      entry.correctAnswers ?? 0,
      entry.wrongAnswers ?? 0,
      entry.blankAnswers ?? 0,
      entry.durationSeconds ? formatDuration(entry.durationSeconds) : '',
      entry.completedAt ? new Date(entry.completedAt).toLocaleString('it-IT') : '',
      formatItems(entry.subjectBreakdown),
      formatItems(entry.sectionBreakdown),
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `classifica-${simulationTitle.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ClassificaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  
  const assignmentId = searchParams.get('assignmentId') || undefined;
  const groupId = searchParams.get('groupId') || undefined;

  const { data, isLoading, error } = trpc.simulations.getLeaderboard.useQuery(
    { 
      simulationId: id, 
      assignmentId,
      groupId,
      limit: 1000
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
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${colors.text.muted}`} />
                <span className={colors.text.muted}>
                  {totalParticipants} partecipanti
                </span>
              </div>
              {canSeeAllNames && leaderboard.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportLeaderboardCsv(simulation.title, leaderboard)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
                >
                  <Download className="w-4 h-4" />
                  Esporta CSV
                </button>
              )}
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
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BreakdownList title="Punteggi per materia" items={myPosition.subjectBreakdown as BreakdownItem[]} />
                <BreakdownList title="Punteggi per sezione" items={myPosition.sectionBreakdown as BreakdownItem[]} />
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
                    <div className="mt-4 w-full space-y-3">
                      <BreakdownPreview title="Materie" items={podium[1].subjectBreakdown as BreakdownItem[]} />
                      <BreakdownPreview title="Sezioni" items={podium[1].sectionBreakdown as BreakdownItem[]} />
                    </div>
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
                    <div className="mt-4 w-full space-y-3">
                      <BreakdownPreview title="Materie" items={podium[0].subjectBreakdown as BreakdownItem[]} />
                      <BreakdownPreview title="Sezioni" items={podium[0].sectionBreakdown as BreakdownItem[]} />
                    </div>
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
                    <div className="mt-4 w-full space-y-3">
                      <BreakdownPreview title="Materie" items={podium[2].subjectBreakdown as BreakdownItem[]} />
                      <BreakdownPreview title="Sezioni" items={podium[2].sectionBreakdown as BreakdownItem[]} />
                    </div>
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
                      <th
                        className={`px-4 py-3 text-right text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}
                      >
                        Dettagli
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700/50">
                    {restOfLeaderboard.map((entry) => {
                      const entryKey = `${entry.rank}-${entry.studentName}`;
                      const isExpanded = expandedEntry === entryKey;
                      return (
                      <Fragment key={entryKey}>
                      <tr
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
                        <td className="px-4 py-3 text-right">
                          {(entry.subjectBreakdown?.length || entry.sectionBreakdown?.length) ? (
                            <button
                              type="button"
                              onClick={() => setExpandedEntry(isExpanded ? null : entryKey)}
                              className={`inline-flex items-center gap-1 text-sm ${colors.primary.text} hover:underline`}
                            >
                              Vedi
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          ) : (
                            <span className={colors.text.muted}>-</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${entryKey}-details`}>
                          <td colSpan={canSeeAllNames ? 8 : 7} className={`px-4 py-4 ${colors.background.secondary}`}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <BreakdownList title="Punteggi per materia" items={entry.subjectBreakdown as BreakdownItem[]} />
                              <BreakdownList title="Punteggi per sezione" items={entry.sectionBreakdown as BreakdownItem[]} />
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                    })}
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
