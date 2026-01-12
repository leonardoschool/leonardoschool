'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { colors } from '@/lib/theme/colors';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { TextareaWithSymbols } from '@/components/ui/SymbolKeyboard';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Flag,
  Menu,
  X,
  Clock,
  CheckCircle,
  Info,
  User,
} from 'lucide-react';

// Section type matching database schema
interface SimulationSection {
  name: string;
  durationMinutes: number;
  questionIds: string[];
  subjectId?: string;
}

// Generic question type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Question = any;

interface Answer {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  timeSpent: number;
  flagged: boolean;
}

interface TolcSimulationLayoutProps {
  simulationTitle: string;
  questions: Question[];
  sections: SimulationSection[];
  currentSectionIndex: number;
  currentQuestionIndex: number;
  answers: Answer[];
  sectionTimeRemaining: number | null;
  completedSections: Set<number>;
  onAnswerSelect: (answerId: string) => void;
  onOpenTextChange?: (text: string) => void;
  onToggleFlag: () => void;
  onGoToQuestion: (index: number) => void;
  onGoNext: () => void;
  onGoPrev: () => void;
  onCompleteSection: () => void;
  onSubmit: () => void;
  onReportQuestion: () => void;
  answeredCount: number;
  totalQuestions: number;
}

export default function TolcSimulationLayout({
  simulationTitle,
  questions,
  sections,
  currentSectionIndex,
  currentQuestionIndex,
  answers,
  sectionTimeRemaining,
  completedSections,
  onAnswerSelect,
  onOpenTextChange,
  onToggleFlag,
  onGoToQuestion,
  onGoNext,
  onGoPrev,
  onCompleteSection,
  onReportQuestion,
}: TolcSimulationLayoutProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Current section
  const currentSection = sections[currentSectionIndex];
  
  // Get questions for current section
  const currentSectionQuestions = useMemo(() => {
    if (!currentSection) return questions;
    const filtered = questions.filter(q => currentSection.questionIds.includes(q.questionId));
    // Debug log
    console.log('[TOLC Layout] Section questions:', {
      sectionName: currentSection.name,
      sectionQuestionIds: currentSection.questionIds,
      allQuestionIds: questions.map(q => q.questionId),
      filteredCount: filtered.length,
    });
    return filtered.length > 0 ? filtered : questions; // Fallback to all if filter fails
  }, [questions, currentSection]);

  // Current question index within section
  const sectionQuestionIndex = useMemo(() => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return 0;
    const idx = currentSectionQuestions.findIndex(q => q.questionId === currentQ.questionId);
    console.log('[TOLC Layout] Section question index:', {
      currentQuestionId: currentQ.questionId,
      sectionIndex: idx,
      totalInSection: currentSectionQuestions.length,
    });
    return idx >= 0 ? idx : 0; // Fallback to 0 if not found
  }, [questions, currentQuestionIndex, currentSectionQuestions]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.questionId);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get question status
  const getQuestionStatus = useCallback((question: Question) => {
    const answer = answers.find(a => a.questionId === question.questionId);
    if (!answer) return 'unanswered';
    if (answer.flagged) return 'flagged';
    if (answer.answerId) return 'answered';
    return 'unanswered';
  }, [answers]);

  // Navigation bounds - based on position within section
  const canGoNext = sectionQuestionIndex < currentSectionQuestions.length - 1;
  const canGoPrev = sectionQuestionIndex > 0;

  // Count answered in section
  const answeredInSection = currentSectionQuestions.filter(q => {
    const ans = answers.find(a => a.questionId === q.questionId);
    return ans?.answerId;
  }).length;

  // Answer letters
  const answerLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* ===== HEADER ===== */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left: User icon (mobile: menu) */}
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 rounded-full bg-gray-100 dark:bg-gray-700"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700">
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>

          {/* Center: Title */}
          <h1 className="text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
            {simulationTitle}
          </h1>

          {/* Right: Settings icon */}
          <div className="flex items-center gap-2">
            <button 
              onClick={onReportQuestion}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Segnala un problema con questa domanda"
            >
              <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        
        {/* ===== LEFT SIDEBAR - SECTIONS & NAVIGATION ===== */}
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Current Section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
              colors.primary.softBg
            } border-l-4 ${colors.primary.border}`}>
              <Info className={`w-5 h-5 ${colors.primary.text}`} />
              <span className={`font-semibold text-sm ${colors.primary.text} uppercase`}>
                {currentSection?.name || 'Sezione'}
              </span>
            </div>

            {/* Question Numbers Grid */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {currentSectionQuestions.map((q, idx) => {
                const globalIdx = questions.findIndex(gq => gq.questionId === q.questionId);
                const status = getQuestionStatus(q);
                const isActive = globalIdx === currentQuestionIndex;
                
                return (
                  <button
                    key={q.questionId}
                    onClick={() => onGoToQuestion(globalIdx)}
                    className={`
                      relative w-8 h-8 rounded text-sm font-medium transition-all
                      ${isActive 
                        ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 ring-2 ring-offset-2 ring-gray-800 dark:ring-white' 
                        : status === 'answered'
                          ? 'bg-green-500 dark:bg-green-600 text-white'
                          : status === 'flagged'
                            ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 border-2 border-orange-400 dark:border-orange-500'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-red-300 dark:border-red-500/50 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }
                    `}
                    title={
                      status === 'answered' 
                        ? 'Risposta data' 
                        : status === 'flagged'
                          ? 'Domanda segnalata'
                          : 'Nessuna risposta'
                    }
                  >
                    {idx + 1}
                    {/* Red dot for unanswered questions */}
                    {status === 'unanswered' && !isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full border border-white dark:border-gray-800" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Complete Section Button */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={onCompleteSection}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm uppercase transition-colors ${
                colors.primary.bg
              } text-white hover:opacity-90`}
            >
              Concludi Sezione
            </button>
          </div>

          {/* Other Sections */}
          <div className="flex-1 p-4 overflow-y-auto">
            {sections.map((section, idx) => {
              const isCompleted = completedSections.has(idx);
              const isCurrent = idx === currentSectionIndex;
              const isLocked = idx > currentSectionIndex && !isCompleted;

              return (
                <div
                  key={idx}
                  className={`
                    py-3 px-4 mb-2 rounded-lg border transition-colors
                    ${isCurrent 
                      ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                      : isCompleted
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : isLocked
                          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      isCurrent 
                        ? 'text-gray-800 dark:text-gray-100' 
                        : isCompleted
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {section.name}
                    </span>
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ===== CENTER - QUESTION CONTENT ===== */}
        <main className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {/* Question */}
          <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {/* Question Number & Flag */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-3">
                <span className={`
                  inline-flex items-center justify-center w-10 h-10 rounded-full 
                  ${colors.primary.bg} text-white font-bold text-lg
                `}>
                  {String(sectionQuestionIndex + 1).padStart(2, '0')}
                </span>
              </div>
              <button
                onClick={onToggleFlag}
                className={`p-2 rounded-lg transition-colors ${
                  currentAnswer?.flagged
                    ? 'bg-orange-100 dark:bg-orange-900 text-orange-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-orange-500'
                }`}
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              {/* Question Image */}
              {currentQuestion.question?.imageUrl && (
                <div className="mb-4 flex justify-center">
                  <Image
                    src={currentQuestion.question.imageUrl}
                    alt="Immagine domanda"
                    width={600}
                    height={400}
                    className="max-w-full h-auto rounded-lg"
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                </div>
              )}

              <div 
                className={`text-lg leading-relaxed prose dark:prose-invert max-w-none ${colors.text.primary}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentQuestion.question?.text || '') }}
              />
              {currentQuestion.question?.textLatex && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <LaTeXRenderer 
                    latex={currentQuestion.question.textLatex} 
                    className={colors.text.primary} 
                  />
                </div>
              )}
            </div>

            {/* Answers - conditional based on question type */}
            {currentQuestion.question?.type === 'OPEN_TEXT' ? (
              /* Open text answer input with symbol keyboard */
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Scrivi la tua risposta:
                </label>
                <TextareaWithSymbols
                  value={currentAnswer?.answerText || ''}
                  onChange={(text) => onOpenTextChange?.(text)}
                  placeholder="Inserisci la tua risposta... Puoi usare formule LaTeX ($x^2$) e HTML (<sub>2</sub>)"
                  rows={6}
                  showFormattingHelp={true}
                  showPreview={true}
                />
              </div>
            ) : (
              /* Multiple choice answers */
              <div className="space-y-3">
                {currentQuestion.question?.answers?.map((answer: { id: string; text: string; imageUrl?: string }, idx: number) => {
                  const isSelected = currentAnswer?.answerId === answer.id;
                  const letter = answerLetters[idx] || String(idx + 1);

                  return (
                    <button
                      key={answer.id}
                      onClick={() => onAnswerSelect(answer.id)}
                      className={`
                        w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left
                        ${isSelected
                          ? `${colors.primary.border} ${colors.primary.softBg} ring-2 ring-offset-2 ring-red-500`
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                        }
                      `}
                    >
                      {/* Letter Circle */}
                      <span className={`
                        flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full 
                        font-semibold text-sm
                        ${isSelected
                          ? `${colors.primary.bg} text-white`
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }
                      `}>
                        {letter}
                      </span>

                      {/* Answer Content */}
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
                        <span 
                          className={`text-base ${isSelected ? colors.primary.text : colors.text.primary}`}
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.text) }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation Arrows - Mobile & Desktop */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onGoPrev}
              disabled={!canGoPrev}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${canGoPrev
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }
              `}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Precedente</span>
            </button>

            {/* Mobile: Show question number */}
            <span className="lg:hidden text-sm text-gray-500 dark:text-gray-400">
              {sectionQuestionIndex + 1} / {currentSectionQuestions.length}
            </span>

            <button
              onClick={onGoNext}
              disabled={!canGoNext}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${canGoNext
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }
              `}
            >
              <span className="hidden sm:inline">Successiva</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </main>

        {/* ===== RIGHT SIDEBAR - TIMER ===== */}
        <aside className="hidden lg:flex flex-col w-56 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6">
          {/* Circular Timer */}
          <div className="flex flex-col items-center">
            {/* Timer Circle */}
            <div className="relative w-32 h-32">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className="stroke-gray-200 dark:stroke-gray-700"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className={`${
                    sectionTimeRemaining !== null && sectionTimeRemaining < 60
                      ? 'stroke-red-500'
                      : sectionTimeRemaining !== null && sectionTimeRemaining < 300
                        ? 'stroke-yellow-500'
                        : 'stroke-cyan-500'
                  } transition-all duration-1000`}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - (sectionTimeRemaining !== null ? sectionTimeRemaining / (currentSection?.durationMinutes || 1) / 60 : 1))}`}
                />
              </svg>
              
              {/* Timer Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${
                  sectionTimeRemaining !== null && sectionTimeRemaining < 60
                    ? 'text-red-600 dark:text-red-400'
                    : sectionTimeRemaining !== null && sectionTimeRemaining < 300
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-cyan-600 dark:text-cyan-400'
                }`}>
                  {sectionTimeRemaining !== null ? formatTime(sectionTimeRemaining) : '--:--'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {answeredInSection}/{currentSectionQuestions.length}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Tempo sezione</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Risposta data</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-red-400 bg-white dark:bg-gray-700"></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Senza risposta</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-orange-400 bg-orange-100 dark:bg-orange-900"></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Segnalata</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== MOBILE MENU DRAWER ===== */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowMobileMenu(false)} 
          />
          
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">Navigazione</h2>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Timer */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700">
                <Clock className={`w-6 h-6 ${
                  sectionTimeRemaining !== null && sectionTimeRemaining < 60
                    ? 'text-red-500'
                    : sectionTimeRemaining !== null && sectionTimeRemaining < 300
                      ? 'text-yellow-500'
                      : 'text-cyan-500'
                }`} />
                <span className={`text-2xl font-bold font-mono ${
                  sectionTimeRemaining !== null && sectionTimeRemaining < 60
                    ? 'text-red-600 dark:text-red-400'
                    : sectionTimeRemaining !== null && sectionTimeRemaining < 300
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-cyan-600 dark:text-cyan-400'
                }`}>
                  {sectionTimeRemaining !== null ? formatTime(sectionTimeRemaining) : '--:--'}
                </span>
              </div>
            </div>

            {/* Current Section */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-sm font-semibold mb-3 ${colors.primary.text} uppercase`}>
                {currentSection?.name || 'Sezione'}
              </h3>
              
              {/* Question Grid */}
              <div className="grid grid-cols-6 gap-2">
                {currentSectionQuestions.map((q, idx) => {
                  const globalIdx = questions.findIndex(gq => gq.questionId === q.questionId);
                  const status = getQuestionStatus(q);
                  const isActive = globalIdx === currentQuestionIndex;
                  
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => {
                        onGoToQuestion(globalIdx);
                        setShowMobileMenu(false);
                      }}
                      className={`
                        relative w-10 h-10 rounded-lg text-sm font-medium transition-all
                        ${isActive 
                          ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 ring-2 ring-offset-2 ring-gray-800 dark:ring-white' 
                          : status === 'answered'
                            ? 'bg-green-500 dark:bg-green-600 text-white'
                            : status === 'flagged'
                              ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 border-2 border-orange-400 dark:border-orange-500'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-red-300 dark:border-red-500/50'
                        }
                      `}
                      title={
                        status === 'answered' 
                          ? 'Risposta data' 
                          : status === 'flagged'
                            ? 'Domanda segnalata'
                            : 'Nessuna risposta'
                      }
                    >
                      {idx + 1}
                      {/* Red dot for unanswered questions */}
                      {status === 'unanswered' && !isActive && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 dark:bg-red-400 rounded-full border border-white dark:border-gray-800" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Complete Section */}
              <button
                onClick={() => {
                  onCompleteSection();
                  setShowMobileMenu(false);
                }}
                className={`w-full mt-4 py-3 rounded-lg font-semibold text-sm uppercase ${colors.primary.bg} text-white`}
              >
                Concludi Sezione
              </button>
            </div>

            {/* All Sections */}
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-500 dark:text-gray-400 uppercase">
                Tutte le Sezioni
              </h3>
              {sections.map((section, idx) => {
                const isCompleted = completedSections.has(idx);
                const isCurrent = idx === currentSectionIndex;

                return (
                  <div
                    key={idx}
                    className={`
                      py-3 px-4 mb-2 rounded-lg border
                      ${isCurrent 
                        ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                        : isCompleted
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {section.name}
                      </span>
                      {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
