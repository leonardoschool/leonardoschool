'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import Button from '@/components/ui/Button';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Grid3X3,
  List,
} from 'lucide-react';

interface StudyModeContentProps {
  questionIds: string[];
}

// Mapping difficoltà -> label
const difficultyLabels: Record<string, { label: string; color: string }> = {
  EASY: { label: 'Facile', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  MEDIUM: { label: 'Media', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  HARD: { label: 'Difficile', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

// Subject colors
const subjectColors: Record<string, string> = {
  'Biologia': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Chimica': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Fisica': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Matematica': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Logica': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Cultura Generale': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

export default function StudyModeContent({ questionIds }: StudyModeContentProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');

  // Fetch questions by IDs
  const { data: questions, isLoading } = trpc.questions.getByIds.useQuery(
    { ids: questionIds },
    { enabled: questionIds.length > 0 }
  );

  if (isLoading) {
    return <PageLoader />;
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600" />
        <p className={colors.text.muted}>Nessuna domanda trovata</p>
        <Button onClick={() => router.push('/simulazioni')}>
          Torna alle simulazioni
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Render question text (LaTeX or plain)
  const renderQuestionText = (text: string, textLatex?: string | null) => {
    if (textLatex) {
      return <LaTeXRenderer latex={textLatex} className={colors.text.primary} />;
    }
    return <p>{text}</p>;
  };

  // Render a single question card with answers
  const renderQuestionCard = (question: typeof questions[0], index: number, showIndex = true) => {
    const difficulty = difficultyLabels[question.difficulty] || { label: question.difficulty, color: 'bg-gray-100 text-gray-700' };
    const subjectColor = subjectColors[question.subject?.name || ''] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    
    return (
      <div
        key={question.id}
        className={`${colors.background.card} rounded-xl border ${colors.border.light} overflow-hidden`}
      >
        {/* Question Header */}
        <div className={`p-4 border-b ${colors.border.light} ${colors.background.secondary}`}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {showIndex && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.primary.softBg} ${colors.primary.text}`}>
                Domanda {index + 1}
              </span>
            )}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${subjectColor}`}>
              {question.subject?.name || 'N/A'}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficulty.color}`}>
              {difficulty.label}
            </span>
            {question.topic && (
              <span className={`px-2 py-1 rounded-full text-xs ${colors.background.tertiary} ${colors.text.muted}`}>
                {question.topic.name}
              </span>
            )}
          </div>
        </div>

        {/* Question Text */}
        <div className="p-4 sm:p-6">
          <div className={`text-base sm:text-lg ${colors.text.primary} mb-6`}>
            {renderQuestionText(question.text, question.textLatex)}
          </div>

          {/* Answers */}
          <div className="space-y-3">
            {question.answers?.map((answer, answerIndex) => {
              const isCorrect = answer.isCorrect;
              const letterLabel = String.fromCharCode(65 + answerIndex); // A, B, C, D...

              return (
                <div
                  key={answer.id}
                  className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'
                  }`}
                >
                  {/* Letter badge */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200'
                    }`}
                  >
                    {letterLabel}
                  </div>

                  {/* Answer text */}
                  <div className="flex-1 min-w-0">
                    <div className={`${colors.text.primary}`}>
                      <p>{answer.text}</p>
                    </div>
                  </div>

                  {/* Correct/Wrong icon */}
                  <div className="flex-shrink-0">
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation if available */}
          {question.generalExplanation && (
            <div className={`mt-4 p-4 rounded-xl ${colors.status.info.bgLight} border ${colors.status.info.border}`}>
              <p className={`text-sm font-medium ${colors.status.info.text} mb-2`}>
                💡 Spiegazione
              </p>
              <div className={colors.text.secondary}>
                <p>{question.generalExplanation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/simulazioni')}
            className={`p-2 rounded-lg ${colors.background.hover} ${colors.text.secondary}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${colors.text.primary}`}>
              📖 Modalità Studio
            </h1>
            <p className={`text-sm ${colors.text.muted}`}>
              {questions.length} domande da studiare
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className={`flex items-center gap-2 p-1 rounded-lg ${colors.background.secondary}`}>
          <button
            onClick={() => setViewMode('single')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'single'
                ? `${colors.background.card} shadow-sm ${colors.text.primary}`
                : colors.text.muted
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Singola</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'list'
                ? `${colors.background.card} shadow-sm ${colors.text.primary}`
                : colors.text.muted
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
        </div>
      </div>

      {/* Single view mode */}
      {viewMode === 'single' && (
        <>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${colors.text.muted}`}>
                Domanda {currentIndex + 1} di {questions.length}
              </span>
              <span className={`text-sm font-medium ${colors.text.primary}`}>
                {Math.round(((currentIndex + 1) / questions.length) * 100)}%
              </span>
            </div>
            <div className={`h-2 rounded-full ${colors.background.tertiary}`}>
              <div
                className={`h-full rounded-full ${colors.primary.bg} transition-all duration-300`}
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          {renderQuestionCard(currentQuestion, currentIndex, false)}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              onClick={goPrev}
              disabled={currentIndex === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Precedente</span>
            </Button>

            {/* Quick navigation dots for mobile */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
              {questions.length <= 20 && questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? `${colors.primary.bg} w-4`
                      : colors.background.tertiary
                  }`}
                />
              ))}
              {questions.length > 20 && (
                <span className={`text-sm ${colors.text.muted}`}>
                  {currentIndex + 1} / {questions.length}
                </span>
              )}
            </div>

            <Button
              onClick={goNext}
              disabled={currentIndex === questions.length - 1}
              variant="primary"
              className="flex items-center gap-2"
            >
              <span className="hidden sm:inline">Successiva</span>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}

      {/* List view mode */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {questions.map((question, index) => renderQuestionCard(question, index, true))}
        </div>
      )}
    </div>
  );
}
