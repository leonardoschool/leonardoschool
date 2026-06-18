'use client';

import QuestionImage from '@/components/ui/QuestionImage';
import { colors } from '@/lib/theme/colors';
import { normalizeImageSrc } from '@/lib/utils/imageUrl';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  CheckCircle,
  Grid3X3,
  Send,
} from 'lucide-react';
import type { PreviewQuestion } from '@/lib/hooks/useSimulationPreview';

interface PreviewStandardLayoutProps {
  title: string;
  currentQuestion: PreviewQuestion | undefined;
  currentQuestionIndex: number;
  questions: PreviewQuestion[];
  selectedAnswer: string | null;
  setSelectedAnswer: (id: string | null) => void;
  goToQuestion: (index: number) => void;
  goPrev: () => void;
  goNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  totalQuestions: number;
  showNavigation: boolean;
  setShowNavigation: (v: boolean) => void;
  formatTime: (seconds: number) => string;
  durationMinutes: number;
}

export default function PreviewStandardLayout({
  title,
  currentQuestion,
  currentQuestionIndex,
  questions,
  selectedAnswer,
  setSelectedAnswer,
  goToQuestion,
  goPrev,
  goNext,
  canGoPrev,
  canGoNext,
  totalQuestions,
  showNavigation,
  setShowNavigation,
  formatTime,
  durationMinutes,
}: PreviewStandardLayoutProps) {
  const currentQuestionImageSrc = normalizeImageSrc(currentQuestion?.imageUrl);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className={`sticky top-0 z-10 ${colors.background.card} border-b ${colors.border.light} px-4 py-3`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className={`font-semibold ${colors.text.primary} hidden sm:block`}>{title || 'Simulazione'}</h1>
            <span className={`text-sm ${colors.text.muted}`}>
              {currentQuestionIndex + 1}/{totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
              <Clock className={`w-4 h-4 ${colors.icon.primary}`} />
              <span className={`font-mono font-medium ${colors.text.primary}`}>
                {formatTime(durationMinutes * 60)}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span className={`text-sm font-medium ${colors.text.primary}`}>0/{totalQuestions}</span>
            </div>

            <button
              onClick={() => setShowNavigation(!showNavigation)}
              className={`p-2 rounded-lg transition-colors ${
                showNavigation
                  ? 'bg-gray-300 dark:bg-slate-600'
                  : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Grid3X3 className={`w-5 h-5 ${colors.icon.primary}`} />
            </button>

            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} opacity-75 cursor-not-allowed`}>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Concludi</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {currentQuestion ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm font-medium ${colors.text.muted}`}>
                    Domanda {currentQuestionIndex + 1}
                  </span>
                  <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.background.hover} ${colors.text.secondary}`}>
                    <Flag className="w-4 h-4" />
                    Contrassegna
                  </button>
                </div>

                <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light} mb-6`}>
                  {currentQuestionImageSrc && (
                    <div className="mb-4 flex justify-center">
                      <QuestionImage
                        src={currentQuestionImageSrc}
                        alt="Immagine domanda"
                        width={600}
                        height={400}
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '200px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                  <RichTextRenderer
                    text={currentQuestion.text}
                    className={`prose prose-sm max-w-none ${colors.text.primary}`}
                  />
                  {currentQuestion.textLatex && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <LaTeXRenderer latex={currentQuestion.textLatex} className={colors.text.primary} />
                    </div>
                  )}
                </div>

                {currentQuestion.type === 'OPEN_TEXT' ? (
                  <div className="space-y-3">
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                      Scrivi la tua risposta:
                    </label>
                    <textarea
                      disabled
                      placeholder="Lo studente potrà scrivere qui la sua risposta..."
                      rows={4}
                      className={`w-full p-3 rounded-lg border ${colors.border.light} ${colors.background.secondary} ${colors.text.muted} resize-none`}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentQuestion.answers?.sort((a, b) => a.order - b.order).map((answer, index) => {
                      const isSelected = selectedAnswer === answer.id;
                      const label = String.fromCharCode(65 + index);
                      const answerImageSrc = normalizeImageSrc(answer.imageUrl);
                      return (
                        <button
                          key={answer.id}
                          onClick={() => setSelectedAnswer(isSelected ? null : answer.id)}
                          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : `border-transparent ${colors.background.card} hover:border-gray-300 dark:hover:border-gray-600`
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-medium ${
                            isSelected
                              ? 'bg-red-500 text-white'
                              : `${colors.background.secondary} ${colors.text.secondary}`
                          }`}>
                            {label}
                          </span>
                          <div className="flex-1">
                            {answerImageSrc && (
                              <div className="mb-2">
                                <QuestionImage
                                  src={answerImageSrc}
                                  alt={`Opzione ${label}`}
                                  width={200}
                                  height={120}
                                  className="rounded-lg"
                                  style={{ maxHeight: '120px', objectFit: 'contain' }}
                                />
                              </div>
                            )}
                            <RichTextRenderer
                              text={answer.text}
                              className={colors.text.primary}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={goPrev}
                    disabled={!canGoPrev}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Precedente
                  </button>
                  <button
                    onClick={goNext}
                    disabled={!canGoNext}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
                  >
                    Successiva
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className={colors.text.muted}>Nessuna domanda disponibile</p>
              </div>
            )}
          </div>
        </div>

        {showNavigation && (
          <div className={`w-full sm:w-80 lg:w-96 border-l ${colors.border.light} ${colors.background.secondary} overflow-y-auto`}>
            <div className="p-4">
              <h3 className={`font-medium ${colors.text.primary} mb-4`}>Navigazione</h3>

              <div className={`mb-4 text-xs space-y-1 ${colors.text.muted}`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-green-500" />
                  <span>Risposta data</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-yellow-500" />
                  <span>Contrassegnata</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-300 dark:bg-gray-600" />
                  <span>Non risposta</span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, index) => {
                  const isCurrent = index === currentQuestionIndex;
                  return (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      className={`w-full aspect-square rounded flex items-center justify-center text-sm font-medium transition-all bg-gray-200 dark:bg-gray-700 ${
                        isCurrent ? 'ring-2 ring-red-500 ring-offset-2' : ''
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className={`mt-6 pt-4 border-t ${colors.border.light}`}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={colors.text.muted}>Risposte date:</span>
                    <span className={`font-medium ${colors.text.primary}`}>0/{totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={colors.text.muted}>Contrassegnate:</span>
                    <span className={`font-medium ${colors.text.primary}`}>0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
