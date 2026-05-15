'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { colors } from '@/lib/theme/colors';
import { sanitizeStudentOpenAnswerInput } from '@/lib/utils/studentOpenAnswer';
import { normalizeImageSrc } from '@/lib/utils/imageUrl';
import { TextareaWithSymbols } from '@/components/ui/SymbolKeyboard';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Menu,
  X,
  Clock,
  CheckCircle,
  Info,
  Minus,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any, sonarjs/redundant-type-aliases
type Question = any;

interface Answer {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  timeSpent: number;
  flagged: boolean;
}

interface TolcSimulationLayoutProps {
  readonly simulationTitle: string;
  readonly questions: Question[];
  readonly sections: SimulationSection[];
  readonly currentSectionIndex: number;
  readonly currentQuestionIndex: number;
  readonly answers: Answer[];
  readonly sectionTimeRemaining: number | null;
  readonly completedSections: Set<number>;
  readonly onAnswerSelect: (answerId: string) => void;
  readonly onOpenTextChange?: (text: string) => void;
  readonly onGoToQuestion: (index: number) => void;
  readonly onGoNext: () => void;
  readonly onGoPrev: () => void;
  readonly onCompleteSection: () => void;
  readonly onSubmit: () => void;
  readonly onToggleFlag: () => void;
  readonly onReportQuestion: () => void;
  readonly answeredCount: number;
  readonly totalQuestions: number;
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
  onGoToQuestion,
  onGoNext,
  onGoPrev,
  onCompleteSection,
  onToggleFlag,
  onReportQuestion,
  // Props available for future use
  // onSubmit - for final submission
  // answeredCount, totalQuestions - for progress display
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
    return Math.max(idx, 0); // Fallback to 0 if not found
  }, [questions, currentQuestionIndex, currentSectionQuestions]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion
    ? answers.find((answer) => answer.questionId === currentQuestion.questionId)
    : undefined;
  const currentQuestionImageSrc = normalizeImageSrc(currentQuestion?.question?.imageUrl);

  const hasResponse = useCallback(
    (questionId: string) => {
      const answer = answers.find(a => a.questionId === questionId);
      return answer?.answerId !== null || !!answer?.answerText?.trim();
    },
    [answers]
  );

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get question status
  const getQuestionStatus = useCallback((question: Question) => {
    const answer = answers.find((item) => item.questionId === question.questionId);
    if (answer?.flagged) return 'flagged';
    return hasResponse(question.questionId) ? 'answered' : 'unanswered';
  }, [answers, hasResponse]);

  // Get button class for question status
  const getQuestionButtonClass = (status: string, isActive: boolean) => {
    if (isActive) return 'bg-cyan-600 dark:bg-cyan-700 text-white shadow-lg';
    if (status === 'answered') return 'bg-green-500 dark:bg-green-600 text-white';
    if (status === 'flagged') return 'bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300';
    return 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600';
  };

  // Get button title for question status
  const getQuestionButtonTitle = (status: string) => {
    if (status === 'answered') return 'Risposta data';
    if (status === 'flagged') return 'Da rispondere dopo';
    return 'Risposta non data';
  };

  // Get section container class
  const getSectionContainerClass = (isActive: boolean, isCompleted: boolean, isLocked: boolean) => {
    if (isActive) return 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-400 dark:border-cyan-600 shadow-lg';
    if (isCompleted) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (isLocked) return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50';
    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  // Get section title class
  const getSectionTitleClass = (isActive: boolean, isCompleted: boolean) => {
    if (isActive) return 'text-cyan-700 dark:text-cyan-300';
    if (isCompleted) return 'text-green-700 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Get timer stroke class
  const getTimerStrokeClass = (isUrgent: boolean, isCritical: boolean) => {
    if (isCritical) return 'stroke-red-500';
    if (isUrgent) return 'stroke-yellow-500';
    return 'stroke-cyan-500';
  };

  // Get timer text class
  const getTimerTextClass = (isUrgent: boolean, isCritical: boolean) => {
    if (isCritical) return 'text-red-600 dark:text-red-400';
    if (isUrgent) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-cyan-600 dark:text-cyan-400';
  };

  // Navigation bounds - based on position within section
  const canGoNext = sectionQuestionIndex < currentSectionQuestions.length - 1;
  const canGoPrev = sectionQuestionIndex > 0;

  // Count answered in section
  const answeredInSection = currentSectionQuestions.filter(q => {
    return hasResponse(q.questionId);
  }).length;

  // Answer letters
  const answerLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  if (!currentQuestion) return null;

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 sm:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-10rem)]">
      {/* ===== HEADER ===== */}
      <header className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-8 py-4">
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

          {/* Right: Report button */}
          <div className="flex items-center gap-2">
            <button 
              onClick={onToggleFlag}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Evidenzia per rispondere dopo"
              aria-label="Evidenzia per rispondere dopo"
              aria-pressed={currentAnswer?.flagged === true}
            >
              <Flag className={`w-5 h-5 ${currentAnswer?.flagged ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`} />
            </button>
            <button
              onClick={onReportQuestion}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Segnala una domanda errata a tutor o admin"
              aria-label="Segnala una domanda errata a tutor o admin"
            >
              <AlertTriangle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        
        {/* ===== LEFT SIDEBAR - SECTIONS & NAVIGATION ===== */}
        <aside className="hidden lg:flex min-h-0 flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
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
                const buttonClass = isActive 
                  ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 ring-2 ring-offset-2 ring-gray-800 dark:ring-white' 
                  : getQuestionButtonClass(status, false);
                
                return (
                  <button
                    key={q.questionId}
                    onClick={() => onGoToQuestion(globalIdx)}
                    className={`
                      relative w-8 h-8 rounded text-sm font-medium transition-all
                      ${buttonClass}
                    `}
                    title={getQuestionButtonTitle(status)}
                  >
                    {idx + 1}
                    {status === 'flagged' && !isActive && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-100 text-amber-600 dark:border-gray-800 dark:bg-amber-900/70 dark:text-amber-300">
                        <Flag className="h-3 w-3" />
                      </span>
                    )}
                    {/* Unanswered marker */}
                    {status === 'unanswered' && !isActive && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-100 text-amber-600 dark:border-gray-800 dark:bg-amber-900/70 dark:text-amber-300">
                        <Minus className="h-3 w-3" />
                      </span>
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
              if (idx === currentSectionIndex) return null;

              const isCompleted = completedSections.has(idx);
              const isLocked = idx > currentSectionIndex && !isCompleted;
              const containerClass = getSectionContainerClass(false, isCompleted, isLocked);
              const titleClass = getSectionTitleClass(false, isCompleted);

              return (
                <div
                  key={section.name}
                  className={`py-3 px-4 mb-2 rounded-lg border transition-colors ${containerClass}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`flex-1 text-sm font-medium ${titleClass}`}>
                      {section.name}
                    </span>
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ===== CENTER - QUESTION CONTENT ===== */}
        <main className="flex-1 min-h-0 flex flex-col bg-white dark:bg-gray-800">
          {/* Question */}
          <div className="min-h-0 flex-1 p-6 lg:p-8 overflow-y-auto">
            {/* Question Number */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-3">
                <span className={`
                  inline-flex items-center justify-center w-10 h-10 rounded-full 
                  ${colors.primary.bg} text-white font-bold text-lg
                `}>
                  {String(sectionQuestionIndex + 1).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              {/* Question Image */}
              {currentQuestionImageSrc && (
                <div className="mb-4 flex justify-center">
                  <Image
                    src={currentQuestionImageSrc}
                    alt="Immagine domanda"
                    width={600}
                    height={400}
                    className="max-w-full h-auto rounded-lg"
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                </div>
              )}

              <RichTextRenderer
                text={currentQuestion.question?.text || ''}
                className={`text-lg leading-relaxed prose dark:prose-invert max-w-none ${colors.text.primary}`}
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
                <span className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Scrivi la tua risposta:
                </span>
                <TextareaWithSymbols
                  value={currentAnswer?.answerText || ''}
                  onChange={(text) => onOpenTextChange?.(sanitizeStudentOpenAnswerInput(text))}
                  placeholder="Inserisci la tua risposta... Usa i simboli dalla tastiera qui sopra"
                  rows={6}
                  showFormattingHelp={false}
                  showPreview={false}
                />
              </div>
            ) : (
              /* Multiple choice answers */
              <div className="space-y-3">
                {currentQuestion.question?.answers?.map((answer: { id: string; text: string; imageUrl?: string }, idx: number) => {
                  const isSelected = currentAnswer?.answerId === answer.id;
                  const letter = answerLetters[idx] || String(idx + 1);
                  const answerImageSrc = normalizeImageSrc(answer.imageUrl);

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
                        {answerImageSrc && (
                          <div className="mb-2">
                            <Image
                              src={answerImageSrc}
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
          </div>

          {/* Navigation Arrows - Mobile & Desktop */}
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
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
        <aside className="hidden lg:flex min-h-0 flex-col w-56 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6">
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
                {(() => {
                  const isCritical = sectionTimeRemaining !== null && sectionTimeRemaining < 60;
                  const isUrgent = sectionTimeRemaining !== null && sectionTimeRemaining < 300;
                  const strokeClass = getTimerStrokeClass(isUrgent, isCritical);
                  const progress = sectionTimeRemaining === null 
                    ? 1 
                    : sectionTimeRemaining / (currentSection?.durationMinutes || 1) / 60;
                  return (
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      className={`${strokeClass} transition-all duration-1000`}
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress)}`}
                    />
                  );
                })()}
              </svg>
              
              {/* Timer Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {(() => {
                  const isCritical = sectionTimeRemaining !== null && sectionTimeRemaining < 60;
                  const isUrgent = sectionTimeRemaining !== null && sectionTimeRemaining < 300;
                  const textClass = getTimerTextClass(isUrgent, isCritical);
                  const timeDisplay = sectionTimeRemaining === null ? '--:--' : formatTime(sectionTimeRemaining);
                  return (
                    <span className={`text-2xl font-bold ${textClass}`}>
                      {timeDisplay}
                    </span>
                  );
                })()}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {answeredInSection}/{currentSectionQuestions.length}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-gray-800 dark:bg-white ring-2 ring-gray-800 dark:ring-white shrink-0"></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Domanda corrente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-green-500 shrink-0"></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Risposta data</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex w-4 h-4 items-center justify-center rounded bg-amber-100 text-amber-600 dark:bg-amber-900/70 dark:text-amber-300 shrink-0">
                  <Flag className="w-3 h-3" />
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Da rispondere dopo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative w-4 h-4 rounded bg-white dark:bg-gray-700 shrink-0">
                  <span className="absolute inset-0 flex items-center justify-center text-amber-600 dark:text-amber-300">
                    <Minus className="w-3 h-3" />
                  </span>
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Non risposta</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== MOBILE MENU DRAWER ===== */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50 cursor-default"
            onClick={() => setShowMobileMenu(false)}
            aria-label="Chiudi menu"
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
              {(() => {
                const isCritical = sectionTimeRemaining !== null && sectionTimeRemaining < 60;
                const isUrgent = sectionTimeRemaining !== null && sectionTimeRemaining < 300;
                const iconClass = getTimerStrokeClass(isUrgent, isCritical).replace('stroke-', 'text-');
                const textClass = getTimerTextClass(isUrgent, isCritical);
                const timeDisplay = sectionTimeRemaining === null ? '--:--' : formatTime(sectionTimeRemaining);
                return (
                  <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700">
                    <Clock className={`w-6 h-6 ${iconClass}`} />
                    <span className={`text-2xl font-bold font-mono ${textClass}`}>
                      {timeDisplay}
                    </span>
                  </div>
                );
              })()}
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
                  const buttonClass = isActive 
                    ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 ring-2 ring-offset-2 ring-gray-800 dark:ring-white' 
                    : getQuestionButtonClass(status, false);
                  
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => {
                        onGoToQuestion(globalIdx);
                        setShowMobileMenu(false);
                      }}
                      className={`
                        relative w-10 h-10 rounded-lg text-sm font-medium transition-all
                        ${buttonClass}
                      `}
                      title={getQuestionButtonTitle(status)}
                    >
                      {idx + 1}
                      {status === 'flagged' && !isActive && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-100 text-amber-600 dark:border-gray-800 dark:bg-amber-900/70 dark:text-amber-300">
                          <Flag className="h-3 w-3" />
                        </span>
                      )}
                      {status === 'unanswered' && !isActive && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-100 text-amber-600 dark:border-gray-800 dark:bg-amber-900/70 dark:text-amber-300">
                          <Minus className="h-3 w-3" />
                        </span>
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
                Altre Sezioni
              </h3>
              {sections.map((section, idx) => {
                if (idx === currentSectionIndex) return null;

                const isCompleted = completedSections.has(idx);
                const containerClass = getSectionContainerClass(false, isCompleted, !isCompleted);

                return (
                  <div
                    key={section.name}
                    className={`py-3 px-4 mb-2 rounded-lg border ${containerClass}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`flex-1 text-sm font-medium ${
                        isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {section.name}
                      </span>
                      {isCompleted && <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-500" />}
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
