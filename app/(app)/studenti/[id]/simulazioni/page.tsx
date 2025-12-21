'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import {
  ArrowLeft,
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  AreaChart,
} from 'recharts';

type TabType = 'details' | 'charts';

export default function StudentSimulationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [expandedSimulation, setExpandedSimulation] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const { data, isLoading } = trpc.students.getStudentSimulations.useQuery({ studentId });

  if (isLoading) {
    return <PageLoader />;
  }

  if (!data) {
    return (
      <div className={`min-h-screen ${colors.background.primary} p-6`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">Impossibile caricare i dati</p>
          </div>
        </div>
      </div>
    );
  }

  const { student, statistics, simulations } = data;

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`min-h-screen ${colors.background.primary}`}>
      {/* Header */}
      <div className={`${colors.background.secondary} border-b ${colors.border.primary} rounded-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-2 ${colors.text.muted} hover:${colors.text.primary} transition-colors mb-4`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna indietro</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
                Simulazioni di {student.name}
              </h1>
              <p className={`mt-1 ${colors.text.muted} flex items-center gap-2`}>
                <span>{student.email}</span>
                {student.matricola && (
                  <>
                    <span>•</span>
                    <span>Matricola: {student.matricola}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-blue-500" />
              <span className={`text-sm ${colors.text.muted}`}>Simulazioni</span>
            </div>
            <p className={`text-3xl font-bold ${colors.text.primary}`}>{statistics.totalSimulations}</p>
          </div>

          <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-500" />
              <span className={`text-sm ${colors.text.muted}`}>Domande Totali</span>
            </div>
            <p className={`text-3xl font-bold ${colors.text.primary}`}>{statistics.totalQuestions}</p>
          </div>

          <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className={`text-sm ${colors.text.muted}`}>Corrette</span>
            </div>
            <p className={`text-3xl font-bold text-green-600 dark:text-green-400`}>{statistics.totalCorrect}</p>
            <p className={`text-xs ${colors.text.muted} mt-1`}>{statistics.correctPercentage}%</p>
          </div>

          <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className={`text-sm ${colors.text.muted}`}>Errate</span>
            </div>
            <p className={`text-3xl font-bold text-red-600 dark:text-red-400`}>{statistics.totalWrong}</p>
          </div>

          <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-2 mb-2">
              <MinusCircle className="w-5 h-5 text-gray-500" />
              <span className={`text-sm ${colors.text.muted}`}>Non Date</span>
            </div>
            <p className={`text-3xl font-bold ${colors.text.muted}`}>{statistics.totalBlank}</p>
          </div>

          <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <span className={`text-sm ${colors.text.muted}`}>Media</span>
            </div>
            <p className={`text-3xl font-bold ${getScoreColor(statistics.avgScore)}`}>
              {statistics.avgScore.toFixed(1)}%
            </p>
          </div>

          <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-green-500" />
              <span className={`text-sm ${colors.text.muted}`}>Superate</span>
            </div>
            <p className={`text-3xl font-bold text-green-600 dark:text-green-400`}>{statistics.passedCount}</p>
            <p className={`text-xs ${colors.text.muted} mt-1`}>
              su {statistics.totalSimulations}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
          <div className="flex items-start gap-3">
            <BarChart3 className={`w-5 h-5 ${colors.text.muted} flex-shrink-0 mt-0.5`} />
            <p className={`text-sm ${colors.text.secondary}`}>
              Vengono mostrate solo le simulazioni completate. Per ogni simulazione viene considerato l&apos;ultimo tentativo effettuato.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'details'
                ? `text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400`
                : `${colors.text.muted} hover:${colors.text.primary}`
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dettagli Simulazioni
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'charts'
                ? `text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400`
                : `${colors.text.muted} hover:${colors.text.primary}`
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Grafici Andamento
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'charts' ? (
          <ChartsSection simulations={simulations} statistics={statistics} />
        ) : (
          /* Simulations List */
          <>
            {simulations.length === 0 ? (
              <div className={`text-center py-12 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
                <Trophy className={`w-16 h-16 mx-auto ${colors.text.muted} mb-4`} />
                <h3 className={`text-lg font-medium ${colors.text.primary} mb-2`}>
                  Nessuna simulazione completata
                </h3>
                <p className={colors.text.muted}>
                  Lo studente non ha ancora completato nessuna simulazione
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {simulations.map((sim) => {
                  const isExpanded = expandedSimulation === sim.resultId;
                  const typeColors = {
                    PRACTICE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
                EXAM: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
                QUIZ: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
              };
              const typeColor = typeColors[sim.simulationType as keyof typeof typeColors] || typeColors.PRACTICE;

              return (
                <div
                  key={sim.resultId}
                  className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}
                >
                  {/* Simulation Header */}
                  <div
                    className={`p-6 cursor-pointer ${colors.background.hover}`}
                    onClick={() => setExpandedSimulation(isExpanded ? null : sim.resultId)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                            {sim.simulationTitle}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${typeColor.bg} ${typeColor.text} uppercase font-medium`}>
                            {sim.simulationType}
                          </span>
                          {sim.passed !== null && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              sim.passed 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {sim.passed ? 'Superata' : 'Non Superata'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className={`flex items-center gap-1 ${colors.text.muted}`}>
                            <Calendar className="w-4 h-4" />
                            {formatDate(sim.completedAt)}
                          </span>
                          <span className={`flex items-center gap-1 ${colors.text.muted}`}>
                            <Clock className="w-4 h-4" />
                            {formatDuration(sim.durationSeconds)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Score */}
                        <div className="text-right">
                          <p className={`text-3xl font-bold ${getScoreColor(sim.percentageScore || 0)}`}>
                            {sim.percentageScore?.toFixed(1)}%
                          </p>
                          <p className={`text-sm ${colors.text.muted}`}>
                            {sim.totalScore?.toFixed(2)}/{sim.maxScore} punti
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {sim.correctAnswers}
                            </p>
                            <p className={`text-xs ${colors.text.muted}`}>Corrette</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                              {sim.wrongAnswers}
                            </p>
                            <p className={`text-xs ${colors.text.muted}`}>Errate</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-lg font-bold ${colors.text.muted}`}>
                              {sim.blankAnswers}
                            </p>
                            <p className={`text-xs ${colors.text.muted}`}>Vuote</p>
                          </div>
                        </div>

                        {/* Expand Icon */}
                        {isExpanded ? (
                          <ChevronUp className={`w-5 h-5 ${colors.text.muted}`} />
                        ) : (
                          <ChevronDown className={`w-5 h-5 ${colors.text.muted}`} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className={`p-6 border-t ${colors.border.primary} space-y-6`}>
                      {/* Subject Stats */}
                      <div>
                        <h4 className={`text-md font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                          <BarChart3 className="w-5 h-5" />
                          Performance per Materia
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sim.subjectStats.map((subject) => (
                            <div
                              key={subject.code}
                              className={`p-4 rounded-lg ${colors.background.secondary}`}
                              style={{ borderLeft: `4px solid ${subject.color || '#6B7280'}` }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`font-medium ${colors.text.primary}`}>
                                  {subject.name}
                                </span>
                                <span className={`text-sm font-semibold ${getScoreColor(subject.percentage)}`}>
                                  {subject.percentage}%
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-green-600 dark:text-green-400">
                                  ✓ {subject.correct}
                                </span>
                                <span className="text-red-600 dark:text-red-400">
                                  ✗ {subject.wrong}
                                </span>
                                <span className={colors.text.muted}>
                                  − {subject.blank}
                                </span>
                                <span className={colors.text.muted}>
                                  / {subject.total}
                                </span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                                <div
                                  className="bg-green-500"
                                  style={{ width: `${(subject.correct / subject.total) * 100}%` }}
                                />
                                <div
                                  className="bg-red-400"
                                  style={{ width: `${(subject.wrong / subject.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Wrong Answers by Subject */}
                      {sim.wrongAnswersBySubject.length > 0 && (
                        <div>
                          <h4 className={`text-md font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Domande Errate ({sim.wrongAnswers} totali)
                          </h4>
                          <div className="space-y-4">
                            {sim.wrongAnswersBySubject.map((subjectGroup) => {
                              const isSubjectExpanded = expandedSubject === `${sim.resultId}-${subjectGroup.subjectCode}`;
                              
                              return (
                                <div
                                  key={subjectGroup.subjectCode}
                                  className={`rounded-lg border ${colors.border.light} overflow-hidden`}
                                >
                                  <div
                                    className={`p-4 ${colors.background.secondary} cursor-pointer flex items-center justify-between`}
                                    onClick={() => setExpandedSubject(
                                      isSubjectExpanded ? null : `${sim.resultId}-${subjectGroup.subjectCode}`
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <BookOpen className={`w-5 h-5 ${colors.text.muted}`} />
                                      <span className={`font-medium ${colors.text.primary}`}>
                                        {subjectGroup.subjectName}
                                      </span>
                                      <span className={`text-sm px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}>
                                        {subjectGroup.count} errate
                                      </span>
                                    </div>
                                    {isSubjectExpanded ? (
                                      <ChevronUp className={`w-5 h-5 ${colors.text.muted}`} />
                                    ) : (
                                      <ChevronDown className={`w-5 h-5 ${colors.text.muted}`} />
                                    )}
                                  </div>

                                  {isSubjectExpanded && (
                                    <div className="p-4 space-y-4">
                                      {subjectGroup.questions.map((question, idx) => (
                                        <div
                                          key={question.questionId}
                                          className={`p-4 rounded-lg ${colors.background.tertiary} border ${colors.border.light}`}
                                        >
                                          <div className="flex items-start gap-3 mb-3">
                                            <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center text-sm font-medium`}>
                                              {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                              <div
                                                className={`${colors.text.primary} mb-3`}
                                                dangerouslySetInnerHTML={{ __html: question.questionText }}
                                              />
                                              {question.topicName && (
                                                <span className={`text-xs px-2 py-1 rounded-full ${colors.background.secondary} ${colors.text.muted}`}>
                                                  {question.topicName}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="space-y-2 ml-9">
                                            {question.selectedAnswerText && (
                                              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                                                <div className="flex items-start gap-2">
                                                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                                  <div>
                                                    <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                                                      Tua risposta (Errata)
                                                    </p>
                                                    <p className="text-sm text-red-900 dark:text-red-300">
                                                      {question.selectedAnswerText}
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                                              <div className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                                                    Risposta Corretta
                                                  </p>
                                                  <p className="text-sm text-green-900 dark:text-green-300">
                                                    {question.correctAnswerText}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>

                                            {question.explanation && (
                                              <div className={`p-3 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}>
                                                <div className="flex items-start gap-2">
                                                  <BookOpen className={`w-4 h-4 ${colors.text.muted} flex-shrink-0 mt-0.5`} />
                                                  <div>
                                                    <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>
                                                      Spiegazione
                                                    </p>
                                                    <div
                                                      className={`text-sm ${colors.text.secondary}`}
                                                      dangerouslySetInnerHTML={{ __html: question.explanation }}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Link to full result */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          href={`/simulazioni/${sim.simulationId}/risultato?resultId=${sim.resultId}`}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white hover:opacity-90 transition-opacity`}
                        >
                          <Trophy className="w-4 h-4" />
                          Vedi Risultato Completo
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==================== CHARTS SECTION ====================

interface ChartsSectionProps {
  simulations: Array<{
    resultId?: string;
    simulationId?: string;
    simulationTitle?: string;
    simulationType?: string;
    completedAt?: Date | string | null;
    totalScore?: number | null;
    percentageScore?: number | null;
    correctAnswers?: number | null;
    wrongAnswers?: number | null;
    blankAnswers?: number | null;
    durationSeconds?: number | null;
    passed?: boolean | null;
    maxScore?: number | null;
    passingScore?: number | null;
    subjectStats?: Array<{
      code: string;
      name: string;
      color: string | null;
      correct: number;
      wrong: number;
      blank: number;
      total: number;
      percentage: number;
    }>;
    wrongAnswersBySubject?: Array<{
      subjectCode: string;
      subjectName: string;
      count: number;
      questions: Array<{
        questionId: string;
        questionText: string;
        selectedAnswerText: string | null;
        correctAnswerText: string;
        explanation: string | null;
        topicName: string | null;
      }>;
    }>;
  }>;
  statistics: {
    totalSimulations: number;
    totalQuestions: number;
    totalCorrect: number;
    totalWrong: number;
    totalBlank: number;
    avgScore: number;
    passedCount: number;
    correctPercentage: number;
  };
}

function ChartsSection({ simulations, statistics }: ChartsSectionProps) {
  // Prepare data for time-based trend chart (sorted by date)
  const trendData = useMemo(() => {
    return [...simulations]
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
      .map((sim, index) => ({
        index: index + 1,
        date: new Date(sim.completedAt!).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        percentageScore: sim.percentageScore || 0,
        title: sim.simulationTitle,
        correct: sim.correctAnswers || 0,
        wrong: sim.wrongAnswers || 0,
        blank: sim.blankAnswers || 0,
      }));
  }, [simulations]);

  // Prepare data for subject performance (aggregated)
  const subjectData = useMemo(() => {
    const subjectMap = new Map<string, { name: string; color: string; correct: number; wrong: number; blank: number; total: number }>();
    
    simulations.forEach(sim => {
      sim.subjectStats.forEach(subject => {
        const existing = subjectMap.get(subject.code);
        if (existing) {
          existing.correct += subject.correct;
          existing.wrong += subject.wrong;
          existing.blank += subject.blank;
          existing.total += subject.total;
        } else {
          subjectMap.set(subject.code, {
            name: subject.name,
            color: subject.color || '#6B7280',
            correct: subject.correct,
            wrong: subject.wrong,
            blank: subject.blank,
            total: subject.total,
          });
        }
      });
    });

    return Array.from(subjectMap.entries()).map(([code, data]) => ({
      code,
      name: data.name,
      color: data.color,
      correct: data.correct,
      wrong: data.wrong,
      blank: data.blank,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));
  }, [simulations]);

  // Prepare data for pie chart (overall distribution)
  const pieData = [
    { name: 'Corrette', value: statistics.totalCorrect, color: '#22C55E' },
    { name: 'Errate', value: statistics.totalWrong, color: '#EF4444' },
    { name: 'Non date', value: statistics.totalBlank, color: '#9CA3AF' },
  ];

  // Radar data for subject comparison
  const radarData = subjectData.map(subject => ({
    subject: subject.name.length > 12 ? subject.name.substring(0, 10) + '...' : subject.name,
    fullName: subject.name,
    percentage: subject.percentage,
  }));

  // Calculate moving average for trend
  const trendWithAverage = trendData.map((item, index) => {
    const windowSize = Math.min(3, index + 1);
    const startIndex = Math.max(0, index - windowSize + 1);
    const sum = trendData.slice(startIndex, index + 1).reduce((acc, curr) => acc + curr.percentageScore, 0);
    return {
      ...item,
      movingAvg: Math.round(sum / windowSize),
    };
  });

  if (simulations.length === 0) {
    return (
      <div className={`text-center py-12 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <TrendingUp className={`w-16 h-16 mx-auto ${colors.text.muted} mb-4`} />
        <h3 className={`text-lg font-medium ${colors.text.primary} mb-2`}>
          Nessun dato disponibile
        </h3>
        <p className={colors.text.muted}>
          Lo studente non ha ancora completato simulazioni per generare grafici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Score Trend Over Time */}
      <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <h3 className={`text-lg font-semibold ${colors.text.primary} mb-6 flex items-center gap-2`}>
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Andamento Punteggio nel Tempo
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendWithAverage} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#4B5563' }}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#4B5563' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(31, 41, 55, 0.95)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'percentageScore') return [`${value.toFixed(1)}%`, 'Punteggio'];
                  if (name === 'movingAvg') return [`${value}%`, 'Media Mobile'];
                  return [value, name];
                }}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="percentageScore"
                stroke="#EC4899"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorScore)"
                name="Punteggio"
              />
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Media Mobile"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Answer Distribution */}
        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <h3 className={`text-lg font-semibold ${colors.text.primary} mb-6 flex items-center gap-2`}>
            <PieChartIcon className="w-5 h-5 text-purple-500" />
            Distribuzione Risposte Totali
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(31, 41, 55, 0.95)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [value, 'Risposte']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className={`text-sm ${colors.text.muted}`}>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart - Subject Performance */}
        {radarData.length > 0 && (
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h3 className={`text-lg font-semibold ${colors.text.primary} mb-6 flex items-center gap-2`}>
              <Target className="w-5 h-5 text-amber-500" />
              Performance per Materia
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#4B5563" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Radar
                    name="Percentuale Corrette"
                    dataKey="percentage"
                    stroke="#EC4899"
                    fill="#EC4899"
                    fillOpacity={0.3}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(31, 41, 55, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [
                      `${value}%`, 
                      props.payload.fullName
                    ]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Subject Bar Chart */}
      <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <h3 className={`text-lg font-semibold ${colors.text.primary} mb-6 flex items-center gap-2`}>
          <BarChart3 className="w-5 h-5 text-green-500" />
          Dettaglio Performance per Materia
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                type="number" 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#4B5563' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#4B5563' }}
                width={90}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(31, 41, 55, 0.95)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'correct') return [value, 'Corrette'];
                  if (name === 'wrong') return [value, 'Errate'];
                  if (name === 'blank') return [value, 'Non date'];
                  return [value, name];
                }}
              />
              <Legend 
                formatter={(value) => {
                  if (value === 'correct') return 'Corrette';
                  if (value === 'wrong') return 'Errate';
                  if (value === 'blank') return 'Non date';
                  return value;
                }}
              />
              <Bar dataKey="correct" stackId="a" fill="#22C55E" name="correct" />
              <Bar dataKey="wrong" stackId="a" fill="#EF4444" name="wrong" />
              <Bar dataKey="blank" stackId="a" fill="#9CA3AF" name="blank" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Progress Summary */}
      <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <h3 className={`text-lg font-semibold ${colors.text.primary} mb-6 flex items-center gap-2`}>
          <Award className="w-5 h-5 text-amber-500" />
          Riepilogo Progressi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* First vs Last comparison */}
          {trendData.length >= 2 && (
            <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
              <h4 className={`text-sm font-medium ${colors.text.muted} mb-3`}>Prima vs Ultima Simulazione</h4>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${colors.text.primary}`}>
                    {trendData[0].percentageScore.toFixed(0)}%
                  </p>
                  <p className={`text-xs ${colors.text.muted}`}>Prima</p>
                </div>
                <div className="flex-shrink-0 px-4">
                  {trendData[trendData.length - 1].percentageScore > trendData[0].percentageScore ? (
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  ) : trendData[trendData.length - 1].percentageScore < trendData[0].percentageScore ? (
                    <TrendingUp className="w-8 h-8 text-red-500 rotate-180" />
                  ) : (
                    <MinusCircle className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${colors.text.primary}`}>
                    {trendData[trendData.length - 1].percentageScore.toFixed(0)}%
                  </p>
                  <p className={`text-xs ${colors.text.muted}`}>Ultima</p>
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className={`text-sm font-medium ${
                  trendData[trendData.length - 1].percentageScore > trendData[0].percentageScore
                    ? 'text-green-600 dark:text-green-400'
                    : trendData[trendData.length - 1].percentageScore < trendData[0].percentageScore
                    ? 'text-red-600 dark:text-red-400'
                    : colors.text.muted
                }`}>
                  {trendData[trendData.length - 1].percentageScore > trendData[0].percentageScore
                    ? `+${(trendData[trendData.length - 1].percentageScore - trendData[0].percentageScore).toFixed(0)}%`
                    : trendData[trendData.length - 1].percentageScore < trendData[0].percentageScore
                    ? `${(trendData[trendData.length - 1].percentageScore - trendData[0].percentageScore).toFixed(0)}%`
                    : 'Nessun cambiamento'}
                </span>
              </div>
            </div>
          )}

          {/* Best Performance */}
          <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
            <h4 className={`text-sm font-medium ${colors.text.muted} mb-3`}>Miglior Performance</h4>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {Math.max(...trendData.map(t => t.percentageScore)).toFixed(0)}%
              </p>
              <p className={`text-sm ${colors.text.muted} mt-2`}>
                {trendData.find(t => t.percentageScore === Math.max(...trendData.map(t => t.percentageScore)))?.title}
              </p>
            </div>
          </div>

          {/* Subject with most errors */}
          {subjectData.length > 0 && (
            <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
              <h4 className={`text-sm font-medium ${colors.text.muted} mb-3`}>Materia da Migliorare</h4>
              <div className="text-center">
                {(() => {
                  const worstSubject = subjectData.reduce((prev, curr) => 
                    curr.percentage < prev.percentage ? curr : prev
                  );
                  return (
                    <>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {worstSubject.name}
                      </p>
                      <p className={`text-sm ${colors.text.muted} mt-2`}>
                        {worstSubject.percentage}% corrette ({worstSubject.wrong} errori su {worstSubject.total})
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
