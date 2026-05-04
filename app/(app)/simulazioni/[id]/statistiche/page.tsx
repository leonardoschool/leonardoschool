'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { stripHtml } from '@/lib/utils/sanitizeHtml';
import { PageLoader } from '@/components/ui/loaders';
import { useAuth } from '@/lib/hooks/useAuth';
import { isStaff } from '@/lib/permissions';
import { TemplateStatistics } from '@/components/simulazioni';
import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ShieldX,
} from 'lucide-react';

type TabType = 'overview' | 'questions' | 'subjects' | 'students';

export default function SimulationStatsPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // Check authorization
  const userRole = user?.role;
  const hasAccess = userRole && isStaff(userRole);

  // Fetch simulation with results
  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery(
    { id },
    { enabled: hasAccess }
  );

  // Fetch detailed question analysis
  const { data: questionAnalysis, isLoading: analysisLoading } =
    trpc.simulations.getQuestionAnalysis.useQuery({ simulationId: id }, { enabled: !!simulation });

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Authorization check
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldX className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>Accesso negato</h2>
          <p className={colors.text.muted}>Non hai i permessi per visualizzare questa pagina.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className={`mt-4 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white`}
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (!simulation) {
    return (
      <div className="p-6">
        <div className={`text-center py-12 ${colors.text.muted}`}>Simulazione non trovata</div>
      </div>
    );
  }

  // Get results for students tab
  const results = simulation.results;

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
          href={`/simulazioni/${id}`}
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla simulazione
        </Link>
        <div className="flex items-center justify-between">
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
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div
          className={`flex gap-1 p-1 rounded-lg ${colors.background.card} border ${colors.border.light} w-fit`}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? `${colors.primary.bg} text-white`
                : `${colors.text.muted} hover:${colors.text.primary}`
            }`}
          >
            Panoramica
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'questions'
                ? `${colors.primary.bg} text-white`
                : `${colors.text.muted} hover:${colors.text.primary}`
            }`}
          >
            Analisi Domande
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'subjects'
                ? `${colors.primary.bg} text-white`
                : `${colors.text.muted} hover:${colors.text.primary}`
            }`}
          >
            Per Materia
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'students'
                ? `${colors.primary.bg} text-white`
                : `${colors.text.muted} hover:${colors.text.primary}`
            }`}
          >
            Studenti
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <TemplateStatistics simulationId={id} />
      )}

      {/* Questions Analysis Tab */}
      {activeTab === 'questions' && (
        <div
          className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}
        >
          <div className={`px-6 py-4 border-b ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
              Analisi Dettagliata Domande
            </h2>
            <p className={`text-sm ${colors.text.muted} mt-1`}>
              Clicca su una domanda per vedere la distribuzione delle risposte
            </p>
          </div>

          {analysisLoading ? (
            <div className="p-12 text-center">
              <PageLoader />
            </div>
          ) : (() => {
              if (!questionAnalysis || questionAnalysis.questionAnalysis.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <p className={colors.text.muted}>Nessuna analisi disponibile</p>
                  </div>
                );
              }
              
              return (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {questionAnalysis.questionAnalysis.map((q) => {
                const isExpanded = expandedQuestions.has(q.questionId);
                const isProblematic = q.correctRate < 40;

                return (
                  <div key={q.questionId} className={`${colors.background.hover}`}>
                    <button onClick={() => toggleQuestion(q.questionId)} className="w-full px-6 py-4 text-left">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            isProblematic
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {q.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {q.subject && (
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: q.subject.color + '20',
                                  color: q.subject.color,
                                }}
                              >
                                {q.subject.name}
                              </span>
                            )}
                            {q.topic && (
                              <span className={`text-xs ${colors.text.muted}`}>{q.topic.name}</span>
                            )}
                            {isProblematic && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                <AlertTriangle className="w-3 h-3" />
                                Critica
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${colors.text.primary} line-clamp-2`}>
                            {stripHtml(q.text)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-4">
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${(() => {
                                if (q.correctRate >= 70) return 'text-green-600 dark:text-green-400';
                                if (q.correctRate >= 40) return 'text-yellow-600 dark:text-yellow-400';
                                return 'text-red-600 dark:text-red-400';
                              })()}`}
                            >
                              {q.correctRate.toFixed(0)}%
                            </p>
                            <p className={`text-xs ${colors.text.muted}`}>corrette</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className={`w-5 h-5 ${colors.text.muted}`} />
                          ) : (
                            <ChevronDown className={`w-5 h-5 ${colors.text.muted}`} />
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        className={`px-6 pb-6 pt-0 ml-14 ${colors.background.secondary} mx-6 mb-4 rounded-lg`}
                      >
                        <div className="py-4">
                          {/* Stats row */}
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{q.correctCount}</p>
                              <p className={`text-xs ${colors.text.muted}`}>Corrette</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-red-600">{q.wrongCount}</p>
                              <p className={`text-xs ${colors.text.muted}`}>Errate</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-500">{q.blankCount}</p>
                              <p className={`text-xs ${colors.text.muted}`}>Vuote</p>
                            </div>
                            <div className="text-center">
                              <p className={`text-2xl font-bold ${colors.text.primary}`}>
                                {q.averageTimeSpent > 0 ? `${Math.round(q.averageTimeSpent)}s` : '-'}
                              </p>
                              <p className={`text-xs ${colors.text.muted}`}>Tempo medio</p>
                            </div>
                          </div>

                          {/* Answer distribution */}
                          <h4 className={`text-sm font-medium ${colors.text.primary} mb-2`}>
                            Distribuzione risposte
                          </h4>
                          <div className="space-y-2">
                            {(q.answers && q.answers.length > 0 ? q.answers : ['A', 'B', 'C', 'D', 'E'].map(l => ({ label: l, text: '', isCorrect: l === q.correctAnswer }))).map((answer) => {
                              const letter = typeof answer === 'string' ? answer : answer.label;
                              const answerText = typeof answer === 'string' ? '' : answer.text;
                              const isCorrect = typeof answer === 'string' ? letter === q.correctAnswer : answer.isCorrect;
                              const count = q.answerDistribution[letter] || 0;
                              const percentage = q.totalAnswers > 0 ? (count / q.totalAnswers) * 100 : 0;

                              return (
                                <div key={letter} className="flex items-center gap-3">
                                  <span
                                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                      isCorrect
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    {answerText && (
                                      <p className={`text-sm ${colors.text.secondary} truncate mb-1`} title={answerText}>
                                        {answerText}
                                      </p>
                                    )}
                                    <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                      <div
                                        className={`h-full transition-all ${
                                          isCorrect ? 'bg-green-500' : 'bg-red-400'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className={`text-sm ${colors.text.secondary} w-16 text-right flex-shrink-0`}>
                                    {count} ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                              );
                            })}
                            {/* Blank answers */}
                            {q.blankCount > 0 && (
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400">
                                  —
                                </span>
                                <div className="flex-1 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                  <div
                                    className="h-full bg-gray-400"
                                    style={{ width: `${q.blankRate}%` }}
                                  />
                                </div>
                                <span className={`text-sm ${colors.text.secondary} w-16 text-right`}>
                                  {q.blankCount} ({q.blankRate.toFixed(0)}%)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              );
            })()}
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && questionAnalysis && (
        <div className="space-y-6">
          {questionAnalysis.subjectBreakdown.map((subject) => {
            const subjectQuestions = questionAnalysis.questionAnalysis.filter(
              (q) => q.subject?.id === subject.subject.id
            );

            return (
              <div
                key={subject.subject.id}
                className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}
              >
                <div
                  className={`px-6 py-4 border-b ${colors.border.light}`}
                  style={{ borderLeftWidth: 4, borderLeftColor: subject.subject.color }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5" style={{ color: subject.subject.color }} />
                      <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                        {subject.subject.name}
                      </h2>
                      <span className={`text-sm ${colors.text.muted}`}>
                        {subject.totalQuestions} domande
                      </span>
                    </div>
                    <div
                      className={`text-2xl font-bold ${(() => {
                        if (subject.correctRate >= 70) return 'text-green-600 dark:text-green-400';
                        if (subject.correctRate >= 50) return 'text-yellow-600 dark:text-yellow-400';
                        return 'text-red-600 dark:text-red-400';
                      })()}`}
                    >
                      {subject.correctRate.toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <table className="w-full">
                    <thead>
                      <tr className={colors.text.muted}>
                        <th className="text-left text-xs font-medium uppercase py-2">#</th>
                        <th className="text-left text-xs font-medium uppercase py-2">Domanda</th>
                        <th className="text-center text-xs font-medium uppercase py-2">Corrette</th>
                        <th className="text-center text-xs font-medium uppercase py-2">Errate</th>
                        <th className="text-center text-xs font-medium uppercase py-2">Tempo</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${colors.border.light}`}>
                      {subjectQuestions.map((q) => (
                        <tr key={q.questionId}>
                          <td className={`py-3 ${colors.text.secondary}`}>{q.order}</td>
                          <td className={`py-3 ${colors.text.primary} max-w-md`}>
                            <p className="line-clamp-1">{stripHtml(q.text)}</p>
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`font-medium ${(() => {
                                if (q.correctRate >= 70) return 'text-green-600';
                                if (q.correctRate >= 40) return 'text-yellow-600';
                                return 'text-red-600';
                              })()}`}
                            >
                              {q.correctRate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 text-center text-red-600">{q.wrongRate.toFixed(0)}%</td>
                          <td className={`py-3 text-center ${colors.text.muted}`}>
                            {q.averageTimeSpent > 0 ? `${Math.round(q.averageTimeSpent)}s` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div
          className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}
        >
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
                    <th
                      className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}
                    >
                      Studente
                    </th>
                    <th
                      className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}
                    >
                      Stato
                    </th>
                    <th
                      className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}
                    >
                      Punteggio
                    </th>
                    <th
                      className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}
                    >
                      Risposte
                    </th>
                    <th
                      className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}
                    >
                      Durata
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}
                    >
                      Completato
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${colors.border.light}`}>
                  {results.map((result) => (
                    <tr key={result.id} className={colors.background.hover}>
                      <td className={`px-4 py-3 ${colors.text.primary}`}>
                        <div>
                          <p className="font-medium">{result.student?.user?.name || 'Studente'}</p>
                          <p className={`text-sm ${colors.text.muted}`}>
                            {result.student?.user?.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!result.completedAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <Clock className="w-3 h-3" />
                            In corso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle className="w-3 h-3" />
                            Completato
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!result.completedAt ? (
                          <span className={colors.text.muted}>-</span>
                        ) : (
                          <div>
                            <p
                              className={`font-bold text-lg ${(() => {
                                const score = result.percentageScore ?? 0;
                                if (score >= 70) return 'text-green-600 dark:text-green-400';
                                if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
                                return 'text-red-600 dark:text-red-400';
                              })()}`}
                            >
                              {result.percentageScore?.toFixed(1)}%
                            </p>
                            <p className={`text-xs ${colors.text.muted}`}>
                              {result.totalScore?.toFixed(1)} punti
                            </p>
                          </div>
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
      )}
    </div>
  );
}
