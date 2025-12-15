'use client';

import { use, useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
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
} from 'lucide-react';

export default function SimulationResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: simulationId } = use(params);
  const searchParams = useSearchParams();
  const resultId = searchParams.get('resultId');

  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong' | 'blank'>('all');

  // Fetch result details - use resultId if available, otherwise use simulationId
  const { data: result, isLoading, error } = trpc.simulations.getResultDetails.useQuery(
    resultId ? { resultId } : { simulationId }
  );

  // Calculate statistics by subject
  const subjectStats = useMemo(() => {
    if (!result?.answers) return [];

    const stats: Record<string, { correct: number; wrong: number; blank: number; total: number; color: string | null }> = {};

    result.answers.forEach((answer: { question: { subject: string; subjectColor?: string | null }; isCorrect: boolean | null }) => {
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
    });

    return Object.entries(stats).map(([subject, data]) => ({
      subject,
      ...data,
      percentage: Math.round((data.correct / data.total) * 100),
    })).sort((a, b) => b.percentage - a.percentage);
  }, [result]);

  // Filter questions
  const filteredAnswers = useMemo(() => {
    if (!result?.answers) return [];
    
    switch (filterType) {
      case 'correct':
        return result.answers.filter((a: { isCorrect: boolean | null }) => a.isCorrect === true);
      case 'wrong':
        return result.answers.filter((a: { isCorrect: boolean | null }) => a.isCorrect === false);
      case 'blank':
        return result.answers.filter((a: { isCorrect: boolean | null }) => a.isCorrect === null);
      default:
        return result.answers;
    }
  }, [result, filterType]);

  if (isLoading) {
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
            href="/studente/simulazioni"
            className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alle simulazioni
          </Link>
        </div>
      </div>
    );
  }

  const { simulation, score, totalScore, correctAnswers, wrongAnswers, blankAnswers, timeSpent, passed } = result;
  const _scorePercentage = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/studente/simulazioni"
        className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-6`}
      >
        <ArrowLeft className="w-4 h-4" />
        Torna alle simulazioni
      </Link>

      {/* Main score card */}
      <div className={`rounded-xl overflow-hidden ${colors.background.card} border ${colors.border.light} mb-8`}>
        <div className={`p-6 sm:p-8 ${passed ? 'bg-green-500' : 'bg-red-500'} text-white text-center`}>
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
            <div className={`text-5xl sm:text-6xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {score.toFixed(2)} / {totalScore}
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              passed 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {passed ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Superata</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Non Superata</span>
                </>
              )}
            </div>
            {simulation.passingScore && (
              <p className={`text-sm ${colors.text.muted} mt-2`}>
                Soglia di sufficienza: {simulation.passingScore} punti
              </p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
            <div className={`p-4 rounded-lg ${colors.background.secondary} text-center`}>
              <Clock className="w-6 h-6 mx-auto text-blue-500 mb-2" />
              <p className={`text-xl font-bold ${colors.text.primary}`}>{formatTime(timeSpent)}</p>
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

          {/* Leaderboard link - only for official simulations */}
          {simulation.isOfficial && (
            <div className="mt-6">
              <Link
                href={`/studente/simulazioni/${simulationId}/classifica`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:opacity-80 transition-opacity border ${colors.border.light}`}
              >
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Vedi la Classifica</span>
              </Link>
            </div>
          )}
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
                    {subject.replace(/_/g, ' ')}
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
                { value: 'blank', label: 'Non date', count: blankAnswers },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value as typeof filterType)}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    filterType === filter.value
                      ? `${colors.primary.bg} text-white`
                      : `${colors.background.secondary} ${colors.text.secondary}`
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAnswers.map((answer: {
              id: string;
              question: {
                id: string;
                text: string;
                subject: string;
                subjectColor?: string | null;
                answers: { id: string; text: string; isCorrect: boolean }[];
                explanation?: string;
              };
              selectedAnswerId: string | null;
              isCorrect: boolean | null;
              timeSpent: number;
            }, index: number) => {
              const isExpanded = showAllQuestions || expandedQuestion === answer.id;
              const _correctAnswer = answer.question.answers.find((a: { isCorrect: boolean }) => a.isCorrect);
              // Use subject color from DB if available, otherwise fallback to getSubjectColor
              const subjectColor = answer.question.subjectColor;

              return (
                <div key={answer.id} className="p-4">
                  <button
                    onClick={() => !showAllQuestions && setExpandedQuestion(expandedQuestion === answer.id ? null : answer.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        answer.isCorrect === null
                          ? 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                          : answer.isCorrect
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30'
                      }`}>
                        {answer.isCorrect === null ? (
                          <MinusCircle className="w-4 h-4" />
                        ) : answer.isCorrect ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
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
                              {answer.question.subject.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {!showAllQuestions && (
                            isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={`text-sm ${colors.text.secondary} line-clamp-1 mt-1`}
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.question.text) }}
                        />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pl-11 space-y-3">
                      {/* Full question */}
                      <div
                        className={`p-3 rounded-lg ${colors.background.secondary} ${colors.text.primary}`}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.question.text) }}
                      />

                      {/* Answers */}
                      <div className="space-y-2">
                        {answer.question.answers.map((a: { id: string; text: string; isCorrect: boolean }, i: number) => {
                          const label = String.fromCharCode(65 + i);
                          const isSelected = answer.selectedAnswerId === a.id;
                          const isCorrectAnswer = a.isCorrect;

                          // Determine answer colors based on correctness
                          const bgColor = isCorrectAnswer 
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : isSelected 
                            ? 'bg-red-100 dark:bg-red-900/20'
                            : colors.background.secondary;
                          
                          const textColor = isCorrectAnswer 
                            ? 'text-green-700 dark:text-green-300'
                            : isSelected 
                            ? 'text-red-700 dark:text-red-300'
                            : colors.text.primary;

                          return (
                            <div
                              key={a.id}
                              className={`flex items-start gap-3 p-3 rounded-lg ${bgColor} ${textColor}`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                                isCorrectAnswer 
                                  ? 'bg-green-500 text-white' 
                                  : isSelected 
                                  ? 'bg-red-500 text-white' 
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}>
                                {label}
                              </span>
                              <div 
                                className="flex-1"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.text) }}
                              />
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
                          Tempo: {formatTime(answer.timeSpent)}
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
          href="/studente/simulazioni"
          className={`px-6 py-3 rounded-lg border ${colors.border.light} ${colors.text.secondary} ${colors.background.hover} text-center`}
        >
          Torna alle simulazioni
        </Link>
        {simulation.isRepeatable && (
          <Link
            href={`/studente/simulazioni/${simulationId}`}
            className={`px-6 py-3 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 text-center`}
          >
            Riprova la simulazione
          </Link>
        )}
      </div>
    </div>
  );
}
