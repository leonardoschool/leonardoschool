'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { colors } from '@/lib/theme/colors';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  Flag,
  AlertTriangle,
} from 'lucide-react';

// Section type matching database schema
interface SimulationSection {
  name: string;
  durationMinutes: number;
  questionIds: string[];
  subjectId?: string;
}

// Generic question type - flexible to match tRPC output
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
  onToggleFlag,
  onGoToQuestion,
  onGoNext,
  onGoPrev,
  onCompleteSection,
  onReportQuestion,
  answeredCount,
}: TolcSimulationLayoutProps) {
  const [showSettings, setShowSettings] = useState(false);

  // Current section
  const currentSection = sections[currentSectionIndex];
  
  // Get questions for current section
  const currentSectionQuestions = useMemo(() => {
    if (!currentSection) return questions;
    return questions.filter(q => currentSection.questionIds.includes(q.questionId));
  }, [questions, currentSection]);

  // Current question (within section)
  const sectionQuestionIndex = useMemo(() => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return 0;
    return currentSectionQuestions.findIndex(q => q.questionId === currentQ.questionId);
  }, [questions, currentQuestionIndex, currentSectionQuestions]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.questionId);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate timer progress (0-1)
  const timerProgress = useMemo(() => {
    if (!currentSection || sectionTimeRemaining === null) return 1;
    const totalSeconds = currentSection.durationMinutes * 60;
    return Math.max(0, sectionTimeRemaining / totalSeconds);
  }, [currentSection, sectionTimeRemaining]);

  // Get question status for dots
  const getQuestionStatus = useCallback((question: Question) => {
    const answer = answers.find(a => a.questionId === question.questionId);
    if (!answer) return 'unanswered';
    if (answer.flagged) return 'flagged';
    if (answer.answerId) return 'answered';
    return 'unanswered';
  }, [answers]);

  // Check if current question is in current section
  const isQuestionInCurrentSection = useCallback((globalIndex: number) => {
    const q = questions[globalIndex];
    if (!q || !currentSection) return false;
    return currentSection.questionIds.includes(q.questionId);
  }, [questions, currentSection]);

  // Navigate within section only
  const canGoNext = currentQuestionIndex < questions.length - 1 && isQuestionInCurrentSection(currentQuestionIndex + 1);
  const canGoPrev = currentQuestionIndex > 0 && isQuestionInCurrentSection(currentQuestionIndex - 1);

  // Count answered in current section
  const answeredInSection = currentSectionQuestions.filter(q => {
    const ans = answers.find(a => a.questionId === q.questionId);
    return ans?.answerId;
  }).length;

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Left Sidebar - Section Navigation */}
      <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Current Section Name */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text.muted}`}>
              {currentSection?.name || 'Sezione'}
            </span>
            <button className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Question Grid */}
        <div className="p-4 flex-1">
          <div className="grid grid-cols-5 gap-2">
            {currentSectionQuestions.map((q, idx) => {
              const globalIdx = questions.findIndex(gq => gq.questionId === q.questionId);
              const status = getQuestionStatus(q);
              const isActive = globalIdx === currentQuestionIndex;
              
              return (
                <button
                  key={q.questionId}
                  onClick={() => onGoToQuestion(globalIdx)}
                  className={`
                    w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center
                    transition-all duration-150
                    ${isActive 
                      ? 'ring-2 ring-offset-2 ring-green-500 dark:ring-offset-gray-800' 
                      : ''
                    }
                    ${status === 'answered' 
                      ? 'bg-green-500 text-white' 
                      : status === 'flagged'
                        ? 'bg-yellow-400 text-yellow-900'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }
                    hover:scale-110
                  `}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Complete Section Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCompleteSection}
            disabled={completedSections.has(currentSectionIndex)}
            className={`
              w-full py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wide
              transition-all duration-200
              ${completedSections.has(currentSectionIndex)
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
              }
            `}
          >
            Concludi Sezione
          </button>
        </div>

        {/* Other Sections List */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          {sections.map((section, idx) => {
            const isCompleted = completedSections.has(idx);
            const isCurrent = idx === currentSectionIndex;
            const isLocked = idx > currentSectionIndex && !completedSections.has(idx - 1);
            
            return (
              <div
                key={idx}
                className={`
                  px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0
                  ${isCurrent ? 'bg-green-50 dark:bg-green-900/20' : ''}
                  ${isCompleted ? 'opacity-50' : ''}
                  ${isLocked ? 'opacity-30' : ''}
                `}
              >
                <span className={`
                  text-sm font-medium
                  ${isCurrent ? 'text-green-700 dark:text-green-400' : colors.text.secondary}
                `}>
                  {section.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h1 className={`text-xl font-bold uppercase tracking-wide ${colors.text.primary}`}>
            {simulationTitle}
          </h1>
        </div>

        {/* Question Content */}
        <div className="flex-1 flex items-stretch">
          {/* Prev Arrow */}
          <button
            onClick={onGoPrev}
            disabled={!canGoPrev}
            className={`
              w-12 flex items-center justify-center
              ${canGoPrev 
                ? 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300' 
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }
            `}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Question Panel */}
          <div className="flex-1 bg-white dark:bg-gray-800 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              {/* Question Number and Text */}
              <div className="mb-8">
                <div className="flex items-start gap-4">
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {String(sectionQuestionIndex + 1).padStart(2, '0')}
                  </span>
                  <div 
                    className={`flex-1 text-lg leading-relaxed ${colors.text.primary}`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentQuestion.question.text) }}
                  />
                </div>
              </div>

              {/* Question Image (if any) */}
              {currentQuestion.question.imageUrl && (
                <div className="mb-8">
                  <Image 
                    src={currentQuestion.question.imageUrl} 
                    alt="Immagine domanda"
                    width={600}
                    height={400}
                    className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600"
                    unoptimized
                  />
                </div>
              )}

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.question.answers.map((answer, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = currentAnswer?.answerId === answer.id;
                  
                  return (
                    <button
                      key={answer.id}
                      onClick={() => onAnswerSelect(answer.id)}
                      className={`
                        w-full flex items-start gap-4 p-4 rounded-lg border-2 text-left
                        transition-all duration-150
                        ${isSelected
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }
                      `}
                    >
                      <span className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                        ${isSelected
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                        }
                      `}>
                        {letter}
                      </span>
                      <span 
                        className={`flex-1 ${colors.text.primary}`}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.text) }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Scroll hint */}
              <div className={`mt-6 text-center text-sm ${colors.text.muted} flex items-center justify-center gap-2`}>
                <span>scorri con il mouse per altri contenuti</span>
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* Next Arrow */}
          <button
            onClick={onGoNext}
            disabled={!canGoNext}
            className={`
              w-12 flex items-center justify-center
              ${canGoNext 
                ? 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300' 
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }
            `}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Right Sidebar - Timer and Info */}
      <div className="w-48 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col items-center py-6">
        {/* Circular Timer */}
        <div className="relative w-32 h-32 mb-6">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-gray-200 dark:text-gray-600"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${timerProgress * 283} 283`}
              className={`
                transition-all duration-1000
                ${sectionTimeRemaining !== null && sectionTimeRemaining < 60 
                  ? 'text-red-500' 
                  : sectionTimeRemaining !== null && sectionTimeRemaining < 300
                    ? 'text-yellow-500'
                    : 'text-green-500'
                }
              `}
            />
          </svg>
          {/* Time text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`
              text-2xl font-bold font-mono
              ${sectionTimeRemaining !== null && sectionTimeRemaining < 60 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-green-600 dark:text-green-400'
              }
            `}>
              {sectionTimeRemaining !== null ? formatTime(sectionTimeRemaining) : '--:--'}
            </span>
            <span className={`text-sm ${colors.text.muted}`}>
              {answeredInSection}/{currentSectionQuestions.length}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 mb-auto">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className={colors.text.secondary}>Tempo sezione</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className={colors.text.secondary}>Risposte date</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-lg border ${colors.border.light} ${colors.background.hover}`}
          >
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={onToggleFlag}
            className={`p-3 rounded-lg border ${
              currentAnswer?.flagged 
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                : `${colors.border.light} ${colors.background.hover}`
            }`}
          >
            <Flag className={`w-5 h-5 ${currentAnswer?.flagged ? 'text-yellow-600' : 'text-gray-500'}`} />
          </button>
          <button
            onClick={onReportQuestion}
            className={`p-3 rounded-lg border ${colors.border.light} ${colors.background.hover}`}
          >
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </button>
        </div>

        {/* Answered count */}
        <div className={`mt-6 text-center ${colors.text.muted} text-sm`}>
          <p>Totale: {answeredCount}/{questions.length}</p>
        </div>
      </div>
    </div>
  );
}
