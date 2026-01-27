'use client';

import {
  CheckCircle,
  ChevronRight,
  Layers,
  Lock,
} from 'lucide-react';
import { colors } from '@/lib/theme/colors';

interface SimulationSection {
  name: string;
  durationMinutes: number;
  questionIds: string[];
}

interface Question {
  questionId?: string;
}

interface AnswerState {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  flagged: boolean;
}

interface NavigationSidebarProps {
  readonly questions: Question[];
  readonly answers: AnswerState[];
  readonly currentQuestionIndex: number;
  readonly answeredCount: number;
  readonly flaggedCount: number;
  readonly totalQuestions: number;
  readonly onGoToQuestion: (index: number) => void;
  // Section mode props (optional for TOLC-style)
  readonly hasSectionsMode?: boolean;
  readonly sections?: SimulationSection[];
  readonly currentSectionIndex?: number;
  readonly completedSections?: Set<number>;
  readonly onSectionChange?: (index: number) => void;
  readonly onCompleteSection?: () => void;
}

export default function NavigationSidebar({
  questions,
  answers,
  currentQuestionIndex,
  answeredCount,
  flaggedCount,
  totalQuestions,
  onGoToQuestion,
  hasSectionsMode = false,
  sections = [],
  currentSectionIndex = 0,
  completedSections = new Set(),
  onSectionChange,
  onCompleteSection,
}: NavigationSidebarProps) {
  return (
    <div className={`w-full sm:w-80 lg:w-96 border-l ${colors.border.light} ${colors.background.secondary} overflow-y-auto`}>
      <div className="p-4">
        <h3 className={`font-medium ${colors.text.primary} mb-4`}>Navigazione</h3>

        {/* Section tabs for TOLC-style */}
        {hasSectionsMode && sections.length > 0 && (
          <SectionTabs
            sections={sections}
            currentSectionIndex={currentSectionIndex}
            completedSections={completedSections}
            onSectionChange={onSectionChange}
            onCompleteSection={onCompleteSection}
          />
        )}

        {/* Legend */}
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

        {/* Question grid */}
        <QuestionGrid
          questions={questions}
          answers={answers}
          currentQuestionIndex={currentQuestionIndex}
          onGoToQuestion={onGoToQuestion}
        />

        {/* Stats */}
        <div className={`mt-6 pt-4 border-t ${colors.border.light}`}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={colors.text.muted}>Risposte date:</span>
              <span className={`font-medium ${colors.text.primary}`}>
                {answeredCount}/{totalQuestions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={colors.text.muted}>Contrassegnate:</span>
              <span className={`font-medium ${colors.text.primary}`}>{flaggedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components

interface SectionTabsProps {
  readonly sections: SimulationSection[];
  readonly currentSectionIndex: number;
  readonly completedSections: Set<number>;
  readonly onSectionChange?: (index: number) => void;
  readonly onCompleteSection?: () => void;
}

function SectionTabs({
  sections,
  currentSectionIndex,
  completedSections,
  onSectionChange,
  onCompleteSection,
}: SectionTabsProps) {
  return (
    <div className="mb-4 space-y-2">
      <p className={`text-xs font-medium ${colors.text.muted} uppercase`}>Sezioni</p>
      {sections.map((section, index) => (
        <SectionButton
          key={`section-${section.name}-${index}`}
          section={section}
          isCurrent={index === currentSectionIndex}
          isCompleted={completedSections.has(index)}
          isLocked={index !== currentSectionIndex && !completedSections.has(index) && index > currentSectionIndex}
          onClick={() => onSectionChange?.(index)}
        />
      ))}

      {/* Complete section button */}
      {currentSectionIndex < sections.length - 1 && (
        <button
          onClick={onCompleteSection}
          className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 text-sm`}
        >
          Completa Sezione
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface SectionButtonProps {
  readonly section: SimulationSection;
  readonly isCurrent: boolean;
  readonly isCompleted: boolean;
  readonly isLocked: boolean;
  readonly onClick: () => void;
}

function SectionButton({
  section,
  isCurrent,
  isCompleted,
  isLocked,
  onClick,
}: SectionButtonProps) {
  const getButtonStyle = (): string => {
    if (isCurrent) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-500';
    if (isCompleted) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (isLocked) return 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed';
    return colors.background.card;
  };

  const renderIcon = () => {
    if (isLocked) return <Lock className="w-4 h-4 flex-shrink-0" />;
    if (isCompleted) return <CheckCircle className="w-4 h-4 flex-shrink-0" />;
    return <Layers className="w-4 h-4 flex-shrink-0" />;
  };

  return (
    <button
      disabled={isLocked}
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${getButtonStyle()}`}
    >
      {renderIcon()}
      <span className="flex-1 truncate">{section.name}</span>
      <span className="text-xs opacity-70">{section.durationMinutes}m</span>
    </button>
  );
}

interface QuestionGridProps {
  readonly questions: Question[];
  readonly answers: AnswerState[];
  readonly currentQuestionIndex: number;
  readonly onGoToQuestion: (index: number) => void;
}

function QuestionGrid({
  questions,
  answers,
  currentQuestionIndex,
  onGoToQuestion,
}: QuestionGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {questions.map((sq, index) => {
        const answer = answers.find((a) => a.questionId === sq.questionId);
        const isCurrent = index === currentQuestionIndex;
        const isAnswered = answer?.answerId !== null || (answer?.answerText && answer.answerText.trim().length > 0);
        const isFlagged = answer?.flagged;

        let bgColor = 'bg-gray-200 dark:bg-gray-700';
        if (isAnswered) bgColor = 'bg-green-500 text-white';
        if (isFlagged) bgColor = 'bg-yellow-500 text-white';

        return (
          <button
            key={sq.questionId}
            onClick={() => onGoToQuestion(index)}
            className={`w-full aspect-square rounded flex items-center justify-center text-sm font-medium transition-all ${bgColor} ${
              isCurrent ? 'ring-2 ring-red-500 ring-offset-2' : ''
            }`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
