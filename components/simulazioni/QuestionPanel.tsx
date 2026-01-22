'use client';

import {
  Flag,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { TextareaWithSymbols } from '@/components/ui/SymbolKeyboard';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';

interface Answer {
  id: string;
  text: string;
}

interface Question {
  questionId: string;
  question: {
    text: string;
    textLatex?: string | null;
    type: string;
    answers: Answer[];
  };
}

interface AnswerState {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  flagged: boolean;
}

interface QuestionPanelProps {
  readonly currentQuestionIndex: number;
  readonly totalQuestions: number;
  readonly question: Question | { questionId?: string; question?: { text?: string; textLatex?: string | null; type?: string; answers?: Answer[] } };
  readonly answer: AnswerState | undefined;
  readonly onAnswerSelect: (answerId: string) => void;
  readonly onOpenTextChange: (text: string) => void;
  readonly onToggleFlag: () => void;
  readonly onReport: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly canGoPrevious: boolean;
  readonly canGoNext: boolean;
}

export default function QuestionPanel({
  currentQuestionIndex,
  totalQuestions,
  question,
  answer,
  onAnswerSelect,
  onOpenTextChange,
  onToggleFlag,
  onReport,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: QuestionPanelProps) {
  const isOpenText = question.question.type === 'OPEN_TEXT';
  const isFlagged = answer?.flagged ?? false;

  return (
    <div className="flex-1 px-4 py-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        {/* Question header */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm font-medium ${colors.text.muted}`}>
            Domanda {currentQuestionIndex + 1} di {totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onReport}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.background.hover} ${colors.text.secondary} hover:text-orange-500`}
              title="Segnala problema con la domanda"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Segnala</span>
            </button>
            <button
              onClick={onToggleFlag}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                isFlagged
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  : `${colors.background.hover} ${colors.text.secondary}`
              }`}
            >
              <Flag className="w-4 h-4" />
              {isFlagged ? 'Contrassegnata' : 'Contrassegna'}
            </button>
          </div>
        </div>

        {/* Question text */}
        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light} mb-6`}>
          <div
            className={`prose prose-sm max-w-none ${colors.text.primary}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.question.text) }}
          />
          {question.question.textLatex && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <LaTeXRenderer
                latex={question.question.textLatex}
                className={colors.text.primary}
              />
            </div>
          )}
        </div>

        {/* Answers */}
        {isOpenText ? (
          <OpenTextAnswer
            value={answer?.answerText || ''}
            onChange={onOpenTextChange}
          />
        ) : (
          <MultipleChoiceAnswers
            answers={question.question.answers}
            selectedAnswerId={answer?.answerId ?? null}
            onSelect={onAnswerSelect}
          />
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
          >
            <ChevronLeft className="w-4 h-4" />
            Precedente
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
          >
            Successiva
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-components

interface OpenTextAnswerProps {
  readonly value: string;
  readonly onChange: (text: string) => void;
}

function OpenTextAnswer({ value, onChange }: OpenTextAnswerProps) {
  return (
    <div className="space-y-3">
      <span className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
        Scrivi la tua risposta:
      </span>
      <TextareaWithSymbols
        value={value}
        onChange={onChange}
        placeholder="Inserisci la tua risposta... Puoi usare formule LaTeX ($x^2$) e HTML (<sub>2</sub>)"
        rows={6}
        showFormattingHelp={true}
        showPreview={true}
      />
    </div>
  );
}

interface MultipleChoiceAnswersProps {
  readonly answers: Answer[];
  readonly selectedAnswerId: string | null;
  readonly onSelect: (answerId: string) => void;
}

function MultipleChoiceAnswers({
  answers,
  selectedAnswerId,
  onSelect,
}: MultipleChoiceAnswersProps) {
  return (
    <div className="space-y-3">
      {answers.map((answerOption, index) => {
        const isSelected = selectedAnswerId === answerOption.id;
        const label = String.fromCodePoint(65 + index); // A, B, C, D...

        return (
          <button
            key={answerOption.id}
            onClick={() => onSelect(answerOption.id)}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              isSelected
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : `border-transparent ${colors.background.card} hover:border-gray-300 dark:hover:border-gray-600`
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-medium ${
                isSelected
                  ? 'bg-red-500 text-white'
                  : `${colors.background.secondary} ${colors.text.secondary}`
              }`}
            >
              {label}
            </span>
            <div
              className={`flex-1 ${colors.text.primary}`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(answerOption.text) }}
            />
          </button>
        );
      })}
    </div>
  );
}
