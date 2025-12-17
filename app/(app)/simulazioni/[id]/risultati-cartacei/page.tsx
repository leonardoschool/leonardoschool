'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import Checkbox from '@/components/ui/Checkbox';
import { useAuth } from '@/lib/hooks/useAuth';
import { isStaff } from '@/lib/permissions';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  User,
  Search,
  RotateCcw,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldX,
} from 'lucide-react';

interface StudentAnswers {
  [questionId: string]: string | null; // answerId or null for blank
}

interface StudentEntry {
  studentId: string;
  name: string;
  email: string;
  hasResult: boolean;
  isExpanded: boolean;
  answers: StudentAnswers;
  wasPresent: boolean;
  isSaving: boolean;
  isSaved: boolean;
}

export default function PaperResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Check authorization
  const userRole = user?.role;
  const hasAccess = userRole && isStaff(userRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [studentEntries, setStudentEntries] = useState<Map<string, StudentEntry>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch data
  const { data, isLoading } = trpc.simulations.getPaperBasedStudents.useQuery(
    { simulationId: id },
    { enabled: hasAccess }
  );

  // Initialize student entries when data loads
  useEffect(() => {
    if (data && !isInitialized) {
      const entries = new Map<string, StudentEntry>();
      for (const student of data.students) {
        entries.set(student.id, {
          studentId: student.id,
          name: student.name,
          email: student.email,
          hasResult: student.hasResult,
          isExpanded: false,
          answers: {},
          wasPresent: true,
          isSaving: false,
          isSaved: student.hasResult,
        });
      }
      setStudentEntries(entries);
      setIsInitialized(true);
    }
  }, [data, isInitialized]);

  // Mutation
  const createPaperResult = trpc.simulations.createPaperResult.useMutation({
    onSuccess: (_data, variables) => {
      if (!variables) return;
      showSuccess('Salvato', 'Risultato registrato con successo');

      // Update local state
      setStudentEntries((prev) => {
        const updated = new Map(prev);
        const entry = updated.get(variables.studentId!);
        if (entry) {
          entry.isSaving = false;
          entry.isSaved = true;
          entry.hasResult = true;
          entry.isExpanded = false;
        }
        return updated;
      });

      // Invalidate queries
      utils.simulations.getPaperBasedStudents.invalidate({ simulationId: id });
      utils.simulations.getSimulation.invalidate({ id });
    },
    onError: (error, variables) => {
      handleMutationError(error);
      if (!variables) return;
      setStudentEntries((prev) => {
        const updated = new Map(prev);
        const entry = updated.get(variables.studentId!);
        if (entry) {
          entry.isSaving = false;
        }
        return updated;
      });
    },
  });

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!data) return [];

    return data.students.filter((student) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Pending filter
      const matchesPending = !showOnlyPending || !student.hasResult;

      return matchesSearch && matchesPending;
    });
  }, [data, searchQuery, showOnlyPending]);

  // Toggle student expansion
  const toggleStudent = (studentId: string) => {
    setStudentEntries((prev) => {
      const updated = new Map(prev);
      const entry = updated.get(studentId);
      if (entry && !entry.hasResult) {
        entry.isExpanded = !entry.isExpanded;
      }
      return updated;
    });
  };

  // Set answer for student
  const setAnswer = (studentId: string, questionId: string, answerId: string | null) => {
    setStudentEntries((prev) => {
      const updated = new Map(prev);
      const entry = updated.get(studentId);
      if (entry) {
        entry.answers[questionId] = answerId;
      }
      return updated;
    });
  };

  // Toggle presence
  const togglePresence = (studentId: string) => {
    setStudentEntries((prev) => {
      const updated = new Map(prev);
      const entry = updated.get(studentId);
      if (entry) {
        entry.wasPresent = !entry.wasPresent;
        if (!entry.wasPresent) {
          entry.answers = {}; // Clear answers if absent
        }
      }
      return updated;
    });
  };

  // Reset student answers
  const resetStudent = (studentId: string) => {
    setStudentEntries((prev) => {
      const updated = new Map(prev);
      const entry = updated.get(studentId);
      if (entry) {
        entry.answers = {};
        entry.wasPresent = true;
      }
      return updated;
    });
  };

  // Save student result
  const saveStudent = (studentId: string) => {
    const entry = studentEntries.get(studentId);
    if (!entry || !data) return;

    // Mark as saving
    setStudentEntries((prev) => {
      const updated = new Map(prev);
      const e = updated.get(studentId);
      if (e) e.isSaving = true;
      return updated;
    });

    // Build answers array
    const answers = data.questions.map((q) => ({
      questionId: q.id,
      answerId: entry.answers[q.id] ?? null,
    }));

    createPaperResult.mutate({
      simulationId: id,
      studentId,
      answers,
      wasPresent: entry.wasPresent,
    });
  };

  // Authorization check
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldX className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>Accesso negato</h2>
          <p className={colors.text.muted}>Non hai i permessi per inserire risultati cartacei.</p>
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

  if (!data.simulation.isPaperBased) {
    return (
      <div className="p-6">
        <div className={`text-center py-12 ${colors.background.card} rounded-xl`}>
          <AlertCircle className="w-12 h-12 mx-auto text-orange-400 mb-3" />
          <p className={colors.text.muted}>
            Questa funzione è disponibile solo per simulazioni cartacee
          </p>
          <Link
            href={`/simulazioni/${id}`}
            className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla simulazione
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/simulazioni/${id}`}
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla simulazione
        </Link>

        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
              Inserimento Risultati Cartacei
            </h1>
            <p className={colors.text.muted}>
              {data.simulation.title} • {data.simulation.totalQuestions} domande
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className={`mb-6 p-4 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={colors.text.secondary}>Progresso inserimento</span>
          <span className={`font-semibold ${colors.text.primary}`}>
            {data.completedCount} / {data.totalStudents} studenti
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${colors.primary.bg}`}
            style={{ width: `${(data.completedCount / data.totalStudents) * 100}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className={`mb-6 p-4 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca studente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.primary} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-red-500`}
            />
          </div>

          {/* Toggle pending only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={showOnlyPending}
              onChange={(e) => setShowOnlyPending(e.target.checked)}
            />
            <span className={colors.text.secondary}>Solo da inserire</span>
          </label>
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <div
            className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}
          >
            <User className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className={colors.text.muted}>
              {showOnlyPending
                ? 'Tutti i risultati sono stati inseriti!'
                : 'Nessuno studente trovato'}
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const entry = studentEntries.get(student.id);
            if (!entry) return null;

            return (
              <div
                key={student.id}
                className={`rounded-xl border ${colors.border.light} overflow-hidden ${
                  entry.hasResult ? 'opacity-60' : ''
                } ${colors.background.card}`}
              >
                {/* Student Header */}
                <button
                  onClick={() => toggleStudent(student.id)}
                  disabled={entry.hasResult}
                  className={`w-full flex items-center justify-between p-4 ${
                    entry.hasResult ? 'cursor-default' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        entry.hasResult
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      {entry.hasResult ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <User className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${colors.text.primary}`}>{student.name}</p>
                      <p className={`text-sm ${colors.text.muted}`}>{student.email}</p>
                    </div>
                  </div>

                  {entry.hasResult ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Inserito
                    </span>
                  ) : entry.isExpanded ? (
                    <ChevronUp className={`w-5 h-5 ${colors.text.muted}`} />
                  ) : (
                    <ChevronDown className={`w-5 h-5 ${colors.text.muted}`} />
                  )}
                </button>

                {/* Expanded Form */}
                {entry.isExpanded && !entry.hasResult && (
                  <div className={`border-t ${colors.border.light} p-4`}>
                    {/* Presence Toggle */}
                    <div className="mb-4 flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={entry.wasPresent}
                          onChange={() => togglePresence(student.id)}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className={colors.text.secondary}>Presente</span>
                      </label>
                      {!entry.wasPresent && (
                        <span className="text-sm text-orange-600 dark:text-orange-400">
                          Lo studente verrà registrato come assente
                        </span>
                      )}
                    </div>

                    {/* Answers Grid */}
                    {entry.wasPresent && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {data.questions.map((question) => (
                          <div
                            key={question.id}
                            className={`p-3 rounded-lg border ${colors.border.light} ${colors.background.secondary}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-medium ${colors.text.primary}`}>
                                D{question.order}
                              </span>
                              {question.subject && (
                                <span className={`text-xs ${colors.text.muted}`}>
                                  {question.subject}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {question.answers.map((answer) => {
                                const isSelected = entry.answers[question.id] === answer.id;
                                return (
                                  <button
                                    key={answer.id}
                                    onClick={() =>
                                      setAnswer(
                                        student.id,
                                        question.id,
                                        isSelected ? null : answer.id
                                      )
                                    }
                                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                                      isSelected
                                        ? `${colors.primary.bg} text-white`
                                        : `${colors.background.primary} border ${colors.border.light} ${colors.text.secondary} hover:border-red-300`
                                    }`}
                                  >
                                    {answer.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => resetStudent(student.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors.text.muted} hover:${colors.background.hover}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                      <button
                        onClick={() => saveStudent(student.id)}
                        disabled={entry.isSaving}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50`}
                      >
                        {entry.isSaving ? (
                          <Spinner size="sm" variant="white" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Salva risultato
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className={`mt-8 p-4 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <h3 className={`font-medium ${colors.text.primary} mb-2`}>Legenda</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className={colors.text.muted}>Risultato inserito</span>
          </span>
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className={colors.text.muted}>Da inserire</span>
          </span>
          <span className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-orange-500" />
            <span className={colors.text.muted}>Assente</span>
          </span>
        </div>
      </div>
    </div>
  );
}
