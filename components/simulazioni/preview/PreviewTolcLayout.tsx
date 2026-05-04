'use client';

import Image from 'next/image';
import { colors } from '@/lib/theme/colors';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  User,
  Settings,
  Info,
} from 'lucide-react';
import type { PreviewQuestion, PreviewSection } from '@/lib/hooks/useSimulationPreview';

const ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface PreviewTolcLayoutProps {
  title: string;
  currentQuestion: PreviewQuestion | undefined;
  currentQuestionIndex: number;
  currentSectionQuestions: PreviewQuestion[];
  currentSectionIndex: number;
  effectiveSections: PreviewSection[];
  selectedAnswer: string | null;
  setSelectedAnswer: (id: string | null) => void;
  goToQuestion: (index: number) => void;
  goPrev: () => void;
  goNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  changeSection: (index: number) => void;
  formatTime: (seconds: number) => string;
  sectionDuration: number;
}

export default function PreviewTolcLayout({
  title,
  currentQuestion,
  currentQuestionIndex,
  currentSectionQuestions,
  currentSectionIndex,
  effectiveSections,
  selectedAnswer,
  setSelectedAnswer,
  goToQuestion,
  goPrev,
  goNext,
  canGoPrev,
  canGoNext,
  changeSection,
  formatTime,
  sectionDuration,
}: PreviewTolcLayoutProps) {
  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700">
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          <h1 className="text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
            {title || 'Simulazione'}
          </h1>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
              <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-hidden">
        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${colors.primary.softBg} border-l-4 ${colors.primary.border}`}>
              <Info className={`w-5 h-5 ${colors.primary.text}`} />
              <span className={`font-semibold text-sm ${colors.primary.text} uppercase`}>
                {effectiveSections[currentSectionIndex]?.name || 'Sezione'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {currentSectionQuestions.map((_, idx) => {
                const isActive = idx === currentQuestionIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx)}
                    className={`relative w-8 h-8 rounded text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 ring-2 ring-offset-2 ring-gray-800 dark:ring-white'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-red-300 dark:border-red-500/50 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {idx + 1}
                    {!isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full border border-white dark:border-gray-800" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm uppercase ${colors.primary.bg} text-white opacity-75 cursor-not-allowed`}>
              Concludi Sezione
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {effectiveSections.map((section, idx) => {
              const isCurrent = idx === currentSectionIndex;
              return (
                <button
                  key={idx}
                  onClick={() => changeSection(idx)}
                  className={`w-full py-3 px-4 mb-2 rounded-lg border transition-colors text-left ${
                    isCurrent
                      ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    isCurrent ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {section.name}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center - Question Content */}
        <main className="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
          <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {currentQuestion ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${colors.primary.bg} text-white font-bold text-lg`}>
                    {String(currentQuestionIndex + 1).padStart(2, '0')}
                  </span>
                  <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-orange-500">
                    <Flag className="w-5 h-5" />
                  </button>
                </div>

                {currentQuestion.imageUrl && (
                  <div className="mb-4 flex justify-center">
                    <Image
                      src={currentQuestion.imageUrl}
                      alt="Immagine domanda"
                      width={600}
                      height={400}
                      className="max-w-full h-auto rounded-lg"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                    />
                  </div>
                )}

                <div className="mb-8">
                  <RichTextRenderer
                    text={currentQuestion.text}
                    className={`text-lg leading-relaxed prose dark:prose-invert max-w-none ${colors.text.primary}`}
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
                    {currentQuestion.answers?.sort((a, b) => a.order - b.order).map((answer, idx) => {
                      const isSelected = selectedAnswer === answer.id;
                      const letter = ANSWER_LETTERS[idx] || String(idx + 1);
                      return (
                        <button
                          key={answer.id}
                          onClick={() => setSelectedAnswer(isSelected ? null : answer.id)}
                          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? `${colors.primary.border} ${colors.primary.softBg} ring-2 ring-offset-2 ring-red-500`
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                          }`}
                        >
                          <span className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                            isSelected
                              ? `${colors.primary.bg} text-white`
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                            {letter}
                          </span>
                          <div className="flex-1">
                            {answer.imageUrl && (
                              <div className="mb-2">
                                <Image
                                  src={answer.imageUrl}
                                  alt={`Opzione ${letter}`}
                                  width={200}
                                  height={120}
                                  className="rounded-lg"
                                  style={{ maxHeight: '120px', objectFit: 'contain' }}
                                />
                              </div>
                            )}
                            <RichTextRenderer
                              text={answer.text}
                              className={`text-base ${isSelected ? colors.primary.text : colors.text.primary}`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={colors.text.muted}>Nessuna domanda disponibile</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                canGoPrev
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Precedente</span>
            </button>

            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentQuestionIndex + 1} / {currentSectionQuestions.length}
            </span>

            <button
              onClick={goNext}
              disabled={!canGoNext}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                canGoNext
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              <span className="hidden sm:inline">Successiva</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </main>

        {/* Right Sidebar - Timer */}
        <aside className="hidden lg:flex flex-col w-56 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className="stroke-gray-200 dark:stroke-gray-700"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className="stroke-cyan-500 transition-all"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset="0"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {formatTime(sectionDuration)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  0/{currentSectionQuestions.length}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Tempo sezione</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Risposta data</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-red-400 bg-white dark:bg-gray-700" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Senza risposta</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
