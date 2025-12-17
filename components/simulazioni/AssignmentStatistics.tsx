'use client';

import { useState } from 'react';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { trpc } from '@/lib/trpc/client';
import {
  Users,
  TrendingUp,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Percent,
  HelpCircle,
  User,
} from 'lucide-react';

interface AssignmentStatisticsProps {
  simulationId: string;
  assignmentId?: string;
  groupId?: string;
}

/**
 * Detailed statistics for a specific assignment
 * Shows per-student breakdown and which questions each student got wrong
 */
export function AssignmentStatistics({ simulationId, assignmentId, groupId }: AssignmentStatisticsProps) {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [showAllStudents, setShowAllStudents] = useState(false);

  const { data, isLoading, error } = trpc.simulations.getAssignmentStatistics.useQuery({
    simulationId,
    assignmentId,
    groupId,
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
          Nessun risultato disponibile
        </h3>
        <p className={colors.text.muted}>
          Le statistiche saranno disponibili dopo che almeno uno studente avrà completato la simulazione.
        </p>
      </div>
    );
  }

  const { overview, studentDetails, mostMissedQuestions } = data;

  // Format duration helper
  const formatDuration = (seconds: number | null) => {
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

  // Toggle student expansion
  const toggleStudent = (studentId: string) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  // Students to display (limited unless showing all)
  const displayedStudents = showAllStudents 
    ? studentDetails 
    : studentDetails.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Studenti Assegnati</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>{overview!.targetedStudents}</p>
          <p className={`text-sm ${colors.text.muted}`}>
            {overview!.completedCount} completati, {overview!.pendingCount} in attesa
          </p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Percent className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Completamento</span>
          </div>
          <p className={`text-3xl font-bold ${overview!.completionRate >= 80 ? 'text-green-600 dark:text-green-400' : overview!.completionRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
            {overview!.completionRate.toFixed(0)}%
          </p>
          <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                overview!.completionRate >= 80 
                  ? 'bg-green-500' 
                  : overview!.completionRate >= 50 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{ width: `${overview!.completionRate}%` }}
            />
          </div>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Punteggio Medio</span>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(overview!.averageScore)}`}>
            {overview!.averageScore.toFixed(1)}%
          </p>
          <p className={`text-sm ${colors.text.muted}`}>
            Max: {overview!.highestScore.toFixed(1)}% • Min: {overview!.lowestScore.toFixed(1)}%
          </p>
        </div>

        <div className={`p-5 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className={`text-sm ${colors.text.muted}`}>Domande Totali</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text.primary}`}>{data.simulation.totalQuestions}</p>
        </div>
      </div>

      {/* Most Missed Questions */}
      {mostMissedQuestions.length > 0 && (
        <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${colors.border.light} flex items-center gap-2`}>
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Domande Più Sbagliate</h3>
            <span className={`ml-auto text-sm ${colors.text.muted}`}>
              Tasso di errore più alto
            </span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {mostMissedQuestions.map((question) => (
              <div key={question.questionId} className={`px-6 py-4 ${colors.background.hover}`}>
                <div className="flex items-start gap-4">
                  <div 
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      question.missRate >= 60 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                        : question.missRate >= 40
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {question.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {question.subject && (
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: (question.subjectColor || '#6B7280') + '20',
                            color: question.subjectColor || '#6B7280'
                          }}
                        >
                          {question.subject}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${colors.text.primary} line-clamp-2`}>{question.text}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {question.wrongCount} errate
                      </span>
                      <span className={`${colors.text.muted} flex items-center gap-1`}>
                        <HelpCircle className="w-3 h-3" />
                        {question.blankCount} vuote
                      </span>
                      <span className={colors.text.muted}>
                        su {question.totalAnswers} risposte
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${
                      question.missRate >= 60 ? 'text-red-600' : question.missRate >= 40 ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {question.missRate.toFixed(0)}%
                    </p>
                    <p className={`text-xs ${colors.text.muted}`}>errore</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Details */}
      <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${colors.border.light} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Dettagli per Studente</h3>
            <span className={`text-sm ${colors.text.muted}`}>
              ({studentDetails.length} studenti)
            </span>
          </div>
          <p className={`text-sm ${colors.text.muted}`}>
            Clicca su uno studente per vedere le domande sbagliate
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {displayedStudents.map((student) => {
            const isExpanded = expandedStudent === student.studentId;
            const hasErrors = student.wrongQuestions.length > 0 || student.blankQuestions.length > 0;

            return (
              <div key={student.studentId}>
                <button
                  onClick={() => hasErrors && toggleStudent(student.studentId)}
                  className={`w-full px-6 py-4 flex items-center gap-4 text-left ${colors.background.hover} ${hasErrors ? 'cursor-pointer' : 'cursor-default'}`}
                  disabled={!hasErrors}
                >
                  {/* Rank/Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    student.percentageScore >= 80 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : student.percentageScore >= 60
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : student.percentageScore >= 40
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {student.studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${colors.text.primary} truncate`}>{student.studentName}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        {student.correctAnswers}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-3 h-3" />
                        {student.wrongAnswers}
                      </span>
                      <span className={`flex items-center gap-1 ${colors.text.muted}`}>
                        <HelpCircle className="w-3 h-3" />
                        {student.blankAnswers}
                      </span>
                      {student.durationSeconds && (
                        <span className={`flex items-center gap-1 ${colors.text.muted}`}>
                          <Clock className="w-3 h-3" />
                          {formatDuration(student.durationSeconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getScoreColor(student.percentageScore)}`}>
                      {student.percentageScore.toFixed(1)}%
                    </p>
                    <p className={`text-xs ${colors.text.muted}`}>
                      {student.totalScore.toFixed(1)} punti
                    </p>
                  </div>

                  {/* Expand indicator */}
                  {hasErrors && (
                    <div className={colors.text.muted}>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && hasErrors && (
                  <div className={`px-6 pb-4 ${colors.background.secondary} mx-4 mb-4 rounded-lg`}>
                    {/* Wrong Questions */}
                    {student.wrongQuestions.length > 0 && (
                      <div className="py-4">
                        <h4 className={`text-sm font-semibold ${colors.text.primary} mb-3 flex items-center gap-2`}>
                          <XCircle className="w-4 h-4 text-red-500" />
                          Risposte Errate ({student.wrongQuestions.length})
                        </h4>
                        <div className="space-y-3">
                          {student.wrongQuestions.map((q) => (
                            <div key={q.questionId} className={`p-4 rounded-lg ${colors.background.card} border ${colors.border.light}`}>
                              <div className="flex items-start gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400 flex-shrink-0">
                                  {q.order}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${colors.text.primary} mb-1`}>{q.text}</p>
                                  {q.subject && (
                                    <span className={`text-xs ${colors.text.muted}`}>{q.subject}</span>
                                  )}
                                </div>
                              </div>
                              <div className="ml-11 space-y-2">
                                {/* Student's Wrong Answer */}
                                <div className={`flex items-start gap-2 p-2 rounded ${colors.background.secondary}`}>
                                  <span className="text-red-600 font-bold text-sm flex-shrink-0 mt-0.5">{q.studentAnswer})</span>
                                  <div className="flex-1">
                                    <p className={`text-sm ${colors.text.primary}`}>{q.studentAnswerText}</p>
                                    <p className={`text-xs ${colors.text.muted} mt-0.5`}>Risposta dello studente</p>
                                  </div>
                                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                </div>
                                {/* Correct Answer */}
                                <div className={`flex items-start gap-2 p-2 rounded ${colors.background.secondary}`}>
                                  <span className="text-green-600 font-bold text-sm flex-shrink-0 mt-0.5">{q.correctAnswer})</span>
                                  <div className="flex-1">
                                    <p className={`text-sm ${colors.text.primary}`}>{q.correctAnswerText}</p>
                                    <p className={`text-xs ${colors.text.muted} mt-0.5`}>Risposta corretta</p>
                                  </div>
                                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blank Questions */}
                    {student.blankQuestions.length > 0 && (
                      <div className={`py-4 ${student.wrongQuestions.length > 0 ? `border-t ${colors.border.light}` : ''}`}>
                        <h4 className={`text-sm font-semibold ${colors.text.primary} mb-3 flex items-center gap-2`}>
                          <HelpCircle className="w-4 h-4 text-gray-500" />
                          Risposte Vuote ({student.blankQuestions.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {student.blankQuestions.map((q) => (
                            <div 
                              key={q.questionId} 
                              className={`px-3 py-1.5 rounded-lg ${colors.background.card} text-sm`}
                              title={q.text}
                            >
                              <span className={`font-medium ${colors.text.primary}`}>Q{q.order}</span>
                              {q.subject && (
                                <span className={`ml-2 ${colors.text.muted}`}>({q.subject})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show more button */}
        {studentDetails.length > 10 && (
          <div className={`px-6 py-3 border-t ${colors.border.light}`}>
            <button
              onClick={() => setShowAllStudents(!showAllStudents)}
              className={`w-full text-center ${colors.primary.text} text-sm font-medium hover:underline`}
            >
              {showAllStudents 
                ? 'Mostra meno' 
                : `Mostra tutti (${studentDetails.length - 10} altri)`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignmentStatistics;
