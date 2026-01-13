'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Check,
  MessageSquare,
  Lightbulb,
  Send,
} from 'lucide-react';

interface ScoreInput {
  openAnswerId: string;
  manualScore: number;
  validatorNotes: string;
}

type CorrectionMode = 'percentage' | 'simple';

export default function ReviewResultPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const [scores, setScores] = useState<Record<string, ScoreInput>>({});
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>('percentage');

  const { data: result, isLoading, error } = trpc.simulations.getOpenAnswersForResult.useQuery(
    { resultId },
    { enabled: !!resultId }
  );

  const validateSingleMutation = trpc.simulations.validateOpenAnswer.useMutation({
    onSuccess: () => {
      showSuccess('Salvato', 'Risposta valutata con successo');
      utils.simulations.getOpenAnswersForResult.invalidate({ resultId });
      utils.simulations.getResultsWithPendingReviews.invalidate();
    },
    onError: handleMutationError,
  });

  const validateBatchMutation = trpc.simulations.validateOpenAnswersBatch.useMutation({
    onSuccess: (data) => {
      if (data.remainingPending === 0) {
        showSuccess('Completato', 'Tutte le risposte sono state valutate. Punteggio ricalcolato.');
        router.push('/simulazioni/risposte-aperte');
      } else {
        showSuccess('Salvato', `Risposte salvate. ${data.remainingPending} ancora da valutare.`);
      }
      utils.simulations.getOpenAnswersForResult.invalidate({ resultId });
      utils.simulations.getResultsWithPendingReviews.invalidate();
    },
    onError: handleMutationError,
  });

  const handleScoreChange = (openAnswerId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [openAnswerId]: {
        ...prev[openAnswerId],
        openAnswerId,
        manualScore: score,
        validatorNotes: prev[openAnswerId]?.validatorNotes || '',
      },
    }));
  };

  const handleSimpleModeChange = (
    openAnswerId: string, 
    mode: 'correct' | 'wrong' | 'blank',
    simulationScoring: { correctPoints: number; wrongPoints: number; blankPoints: number }
  ) => {
    // Use the simulation's scoring configuration
    let score: number;
    
    if (mode === 'correct') {
      score = 1; // 100% - always normalize to 1 for correct
    } else if (mode === 'wrong') {
      // Normalize wrongPoints to a score (usually negative)
      // wrongPoints is typically -0.4, correctPoints is 1.5
      // Score as percentage: -0.4 / 1.5 = -0.267 (but we'll store the raw wrong value)
      score = simulationScoring.wrongPoints / simulationScoring.correctPoints;
    } else {
      // blank - usually 0
      score = simulationScoring.blankPoints / simulationScoring.correctPoints;
    }
    
    setScores(prev => ({
      ...prev,
      [openAnswerId]: {
        ...prev[openAnswerId],
        openAnswerId,
        manualScore: score,
        validatorNotes: prev[openAnswerId]?.validatorNotes || '',
      },
    }));
  };

  const handleNotesChange = (openAnswerId: string, notes: string) => {
    setScores(prev => ({
      ...prev,
      [openAnswerId]: {
        ...prev[openAnswerId],
        openAnswerId,
        manualScore: prev[openAnswerId]?.manualScore ?? 0,
        validatorNotes: notes,
      },
    }));
  };

  const handleValidateSingle = (openAnswerId: string) => {
    const score = scores[openAnswerId];
    if (score === undefined) return;

    validateSingleMutation.mutate({
      openAnswerId,
      manualScore: score.manualScore,
      validatorNotes: score.validatorNotes || undefined,
    });
  };

  const handleValidateAll = () => {
    const validations = result?.openAnswers
      .filter(oa => !oa.isValidated)
      .map(oa => ({
        openAnswerId: oa.id,
        manualScore: scores[oa.id]?.manualScore ?? (oa.autoScore ?? 0),
        validatorNotes: scores[oa.id]?.validatorNotes,
      })) || [];

    if (validations.length === 0) return;

    validateBatchMutation.mutate({
      resultId,
      validations,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 0.5) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  if (isLoading) return <PageLoader />;

  if (error || !result) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
          <p className={`font-medium ${colors.text.primary}`}>
            {error?.message || 'Risultato non trovato'}
          </p>
          <Link
            href="/simulazioni/risposte-aperte"
            className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla lista
          </Link>
        </div>
      </div>
    );
  }

  const pendingAnswers = result.openAnswers.filter(oa => !oa.isValidated);
  const validatedAnswers = result.openAnswers.filter(oa => oa.isValidated);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/simulazioni/risposte-aperte"
            className={`p-2 rounded-lg ${colors.background.hover} ${colors.text.secondary} hover:${colors.text.primary}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
              Correzione Risposte Aperte
            </h1>
            <p className={`text-sm ${colors.text.muted} mt-1`}>
              {result.simulation.title}
            </p>
          </div>
        </div>

        {/* Student info card */}
        <div className={`${colors.background.card} rounded-xl p-4 border ${colors.border.light}`}>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <User className={`w-4 h-4 ${colors.text.muted}`} />
              <span className={`font-medium ${colors.text.primary}`}>{result.student.name}</span>
              <span className={`text-sm ${colors.text.muted}`}>({result.student.email})</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${colors.text.muted}`} />
              <span className={`text-sm ${colors.text.secondary}`}>
                {result.completedAt 
                  ? format(new Date(result.completedAt), 'dd MMM yyyy, HH:mm', { locale: it })
                  : '-'}
              </span>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(result.percentageScore / 100)} ${getScoreColor(result.percentageScore / 100)}`}>
              Punteggio parziale: {result.totalScore.toFixed(1)} ({result.percentageScore.toFixed(0)}%)
            </div>
            {result.pendingOpenAnswers > 0 && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                {result.pendingOpenAnswers} da correggere
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pending Answers */}
      {pendingAnswers.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
              Risposte da Valutare ({pendingAnswers.length})
            </h2>
            <div className="flex items-center gap-4">
              {/* Correction Mode Toggle */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.background.card} border ${colors.border.light}`}>
                <button
                  onClick={() => setCorrectionMode('percentage')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    correctionMode === 'percentage'
                      ? `${colors.primary.bg} text-white`
                      : `${colors.text.muted} hover:${colors.text.primary}`
                  }`}
                >
                  Percentuale
                </button>
                <button
                  onClick={() => setCorrectionMode('simple')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    correctionMode === 'simple'
                      ? `${colors.primary.bg} text-white`
                      : `${colors.text.muted} hover:${colors.text.primary}`
                  }`}
                >
                  Semplice
                </button>
              </div>
              <button
                onClick={handleValidateAll}
                disabled={validateBatchMutation.isPending}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50`}
              >
                {validateBatchMutation.isPending ? (
                  <Spinner size="sm" variant="white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Salva Tutte le Valutazioni
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {pendingAnswers.map((oa, idx) => (
              <div
                key={oa.id}
                className={`${colors.background.card} rounded-xl p-6 border ${colors.border.light}`}
              >
                {/* Question */}
                <div className="mb-4">
                  <span className={`text-xs font-medium ${colors.text.muted} uppercase`}>
                    Domanda {idx + 1}
                  </span>
                  <div className={`mt-1 ${colors.text.primary}`}>
                    <RichTextRenderer text={oa.question.text} />
                  </div>
                  {oa.question.textLatex && (
                    <div className="mt-2">
                      <LaTeXRenderer latex={oa.question.textLatex} className={colors.text.primary} />
                    </div>
                  )}
                  {oa.question.correctExplanation && (
                    <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5" />
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <RichTextRenderer text={oa.question.correctExplanation} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Student Answer */}
                <div className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <span className={`text-xs font-medium ${colors.text.muted} uppercase`}>
                    Risposta dello Studente
                  </span>
                  <div className={`mt-1 ${colors.text.primary} whitespace-pre-wrap`}>
                    <RichTextRenderer text={oa.answerText} />
                  </div>
                </div>

                {/* Keywords Match (if any) */}
                {(oa.keywordsMatched.length > 0 || oa.keywordsMissed.length > 0) && (
                  <div className="mb-4 flex flex-wrap gap-4">
                    {oa.keywordsMatched.length > 0 && (
                      <div>
                        <span className={`text-xs font-medium ${colors.text.muted}`}>
                          Keywords trovate:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {oa.keywordsMatched.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {oa.keywordsMissed.length > 0 && (
                      <div>
                        <span className={`text-xs font-medium ${colors.text.muted}`}>
                          Keywords mancanti (required):
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {oa.keywordsMissed.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {oa.autoScore !== null && (
                      <div>
                        <span className={`text-xs font-medium ${colors.text.muted}`}>
                          Punteggio auto:
                        </span>
                        <span className={`ml-1 font-medium ${getScoreColor(oa.autoScore)}`}>
                          {(oa.autoScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Scoring Controls */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    {correctionMode === 'percentage' ? (
                      <>
                        <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                          Punteggio (0-100%)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={(scores[oa.id]?.manualScore ?? oa.autoScore ?? 0) * 100}
                            onChange={(e) => handleScoreChange(oa.id, parseInt(e.target.value) / 100)}
                            className="flex-1 h-2 rounded-lg appearance-none bg-gray-200 dark:bg-gray-700 cursor-pointer"
                          />
                          <span className={`w-12 text-center font-medium ${getScoreColor(scores[oa.id]?.manualScore ?? oa.autoScore ?? 0)}`}>
                            {Math.round((scores[oa.id]?.manualScore ?? oa.autoScore ?? 0) * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <button
                            onClick={() => handleScoreChange(oa.id, 0)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Errata
                          </button>
                          <button
                            onClick={() => handleScoreChange(oa.id, 0.5)}
                            className="text-xs text-yellow-600 hover:underline"
                          >
                            Parziale
                          </button>
                          <button
                            onClick={() => handleScoreChange(oa.id, 1)}
                            className="text-xs text-green-500 hover:underline"
                          >
                            Corretta
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                          Valutazione
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleSimpleModeChange(oa.id, 'correct', {
                              correctPoints: result.simulation.correctPoints,
                              wrongPoints: result.simulation.wrongPoints,
                              blankPoints: result.simulation.blankPoints,
                            })}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              scores[oa.id]?.manualScore === 1
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                                : `border-gray-200 dark:border-gray-700 ${colors.text.secondary} hover:border-green-400`
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>✓ Corretta</span>
                              <span className="text-xs mt-0.5">+{result.simulation.correctPoints} pt</span>
                            </div>
                          </button>
                          <button
                            onClick={() => handleSimpleModeChange(oa.id, 'wrong', {
                              correctPoints: result.simulation.correctPoints,
                              wrongPoints: result.simulation.wrongPoints,
                              blankPoints: result.simulation.blankPoints,
                            })}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              scores[oa.id]?.manualScore !== undefined && 
                              scores[oa.id]?.manualScore !== 0 &&
                              scores[oa.id]?.manualScore !== 1
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium'
                                : `border-gray-200 dark:border-gray-700 ${colors.text.secondary} hover:border-red-400`
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>✗ Sbagliata</span>
                              <span className="text-xs mt-0.5">
                                {result.simulation.wrongPoints} pt
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => handleSimpleModeChange(oa.id, 'blank', {
                              correctPoints: result.simulation.correctPoints,
                              wrongPoints: result.simulation.wrongPoints,
                              blankPoints: result.simulation.blankPoints,
                            })}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              scores[oa.id]?.manualScore === 0
                                ? 'border-gray-400 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium'
                                : `border-gray-200 dark:border-gray-700 ${colors.text.secondary} hover:border-gray-400`
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>− Non Data</span>
                              <span className="text-xs mt-0.5">
                                {result.simulation.blankPoints} pt
                              </span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Notes toggle */}
                  <button
                    onClick={() => setExpandedNotes(prev => {
                      const next = new Set(prev);
                      if (next.has(oa.id)) next.delete(oa.id);
                      else next.add(oa.id);
                      return next;
                    })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${colors.background.hover} ${colors.text.secondary}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Note
                  </button>

                  {/* Save single */}
                  <button
                    onClick={() => handleValidateSingle(oa.id)}
                    disabled={scores[oa.id] === undefined || validateSingleMutation.isPending}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50`}
                  >
                    {validateSingleMutation.isPending ? (
                      <Spinner size="xs" variant="white" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Salva
                  </button>
                </div>

                {/* Notes input (expandable) */}
                {expandedNotes.has(oa.id) && (
                  <div className="mt-4">
                    <textarea
                      value={scores[oa.id]?.validatorNotes || ''}
                      onChange={(e) => handleNotesChange(oa.id, e.target.value)}
                      placeholder="Note per lo studente (opzionale)..."
                      rows={2}
                      className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm resize-y`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Already Validated Answers */}
      {validatedAnswers.length > 0 && (
        <div>
          <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>
            Risposte Già Valutate ({validatedAnswers.length})
          </h2>

          <div className="space-y-4">
            {validatedAnswers.map((oa) => (
              <div
                key={oa.id}
                className={`${colors.background.card} rounded-xl p-4 border ${colors.border.light} opacity-75`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`text-sm ${colors.text.primary} line-clamp-2`}>
                      <RichTextRenderer text={oa.question.text} />
                    </div>
                    <div className={`mt-2 text-sm ${colors.text.muted} line-clamp-2`}>
                      Risposta: <RichTextRenderer text={oa.answerText} />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium ${getScoreBg(oa.finalScore ?? 0)} ${getScoreColor(oa.finalScore ?? 0)}`}>
                      <CheckCircle className="w-3 h-3" />
                      {((oa.finalScore ?? 0) * 100).toFixed(0)}%
                    </span>
                    {oa.validatedAt && (
                      <p className={`text-xs ${colors.text.muted} mt-1`}>
                        {format(new Date(oa.validatedAt), 'dd/MM/yy HH:mm', { locale: it })}
                      </p>
                    )}
                  </div>
                </div>
                {oa.validatorNotes && (
                  <p className={`mt-2 text-sm ${colors.text.muted} italic`}>
                    Note: {oa.validatorNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All done message */}
      {pendingAnswers.length === 0 && validatedAnswers.length > 0 && (
        <div className={`mt-8 text-center py-8 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
          <h3 className={`text-lg font-medium ${colors.text.primary} mb-2`}>
            Tutte le risposte sono state valutate
          </h3>
          <p className={`${colors.text.muted} mb-4`}>
            Il punteggio finale è stato ricalcolato automaticamente.
          </p>
          <Link
            href="/simulazioni/risposte-aperte"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.text} hover:underline`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla lista
          </Link>
        </div>
      )}
    </div>
  );
}
