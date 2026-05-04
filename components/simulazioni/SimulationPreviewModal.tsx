'use client';

import { Monitor, X } from 'lucide-react';
import { useSimulationPreview } from '@/lib/hooks/useSimulationPreview';
import PreviewStartScreen from '@/components/simulazioni/preview/PreviewStartScreen';
import PreviewTolcLayout from '@/components/simulazioni/preview/PreviewTolcLayout';
import PreviewStandardLayout from '@/components/simulazioni/preview/PreviewStandardLayout';
import type { PreviewQuestion, PreviewSection } from '@/lib/hooks/useSimulationPreview';

interface SimulationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  simulationType: string;
  durationMinutes: number;
  questions: PreviewQuestion[];
  hasSections: boolean;
  sections: PreviewSection[];
  correctPoints: number;
  wrongPoints: number;
  blankPoints: number;
  showResults: boolean;
  showCorrectAnswers: boolean;
  isRepeatable: boolean;
  isOfficial: boolean;
  enableAntiCheat: boolean;
  forceFullscreen: boolean;
  randomizeOrder: boolean;
  randomizeAnswers: boolean;
}

const SIMULATION_TYPE_LABELS: Record<string, string> = {
  OFFICIAL: 'Simulazione Ufficiale',
  PRACTICE: 'Esercitazione',
  QUICK_QUIZ: 'Quiz Veloce',
};

export default function SimulationPreviewModal({
  isOpen,
  onClose,
  title,
  description,
  simulationType,
  durationMinutes,
  questions,
  hasSections,
  sections,
  correctPoints,
  wrongPoints,
  blankPoints,
  isOfficial,
  enableAntiCheat,
  forceFullscreen,
}: SimulationPreviewModalProps) {
  const {
    previewScreen, setPreviewScreen,
    currentQuestionIndex,
    currentSectionIndex,
    selectedAnswer, setSelectedAnswer,
    showNavigation, setShowNavigation,
    effectiveSections,
    currentSectionQuestions,
    currentQuestion,
    canGoNext, canGoPrev,
    sectionDuration,
    goNext, goPrev, goToQuestion, changeSection, handleClose, formatTime,
  } = useSimulationPreview({ hasSections, sections, questions, durationMinutes, onClose });

  if (!isOpen) return null;

  const typeLabel = SIMULATION_TYPE_LABELS[simulationType] ?? 'Personalizzata';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-7xl max-h-[95vh] mx-4 flex flex-col rounded-xl overflow-hidden shadow-2xl">
        {/* Preview Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Monitor className="w-4 h-4" />
              <span>Anteprima Studente - {typeLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewScreen(previewScreen === 'start' ? 'execution' : 'start')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                previewScreen === 'execution'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Durante il Test
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {previewScreen === 'start' ? (
            <PreviewStartScreen
              title={title}
              description={description}
              isOfficial={isOfficial}
              hasSections={hasSections}
              effectiveSections={effectiveSections}
              durationMinutes={durationMinutes}
              totalQuestions={questions.length}
              correctPoints={correctPoints}
              wrongPoints={wrongPoints}
              blankPoints={blankPoints}
              enableAntiCheat={enableAntiCheat}
              forceFullscreen={forceFullscreen}
            />
          ) : hasSections ? (
            <PreviewTolcLayout
              title={title}
              currentQuestion={currentQuestion}
              currentQuestionIndex={currentQuestionIndex}
              currentSectionQuestions={currentSectionQuestions}
              currentSectionIndex={currentSectionIndex}
              effectiveSections={effectiveSections}
              selectedAnswer={selectedAnswer}
              setSelectedAnswer={setSelectedAnswer}
              goToQuestion={goToQuestion}
              goPrev={goPrev}
              goNext={goNext}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              changeSection={changeSection}
              formatTime={formatTime}
              sectionDuration={sectionDuration}
            />
          ) : (
            <PreviewStandardLayout
              title={title}
              currentQuestion={currentQuestion}
              currentQuestionIndex={currentQuestionIndex}
              questions={questions}
              selectedAnswer={selectedAnswer}
              setSelectedAnswer={setSelectedAnswer}
              goToQuestion={goToQuestion}
              goPrev={goPrev}
              goNext={goNext}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              totalQuestions={questions.length}
              showNavigation={showNavigation}
              setShowNavigation={setShowNavigation}
              formatTime={formatTime}
              durationMinutes={durationMinutes}
            />
          )}
        </div>

        {/* Preview Info Banner */}
        <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center text-sm">
          <span className="font-medium">🔍 Modalità Anteprima</span>
          <span className="mx-2">•</span>
          <span>Questa è un&apos;anteprima interattiva di come gli studenti vedranno la simulazione</span>
        </div>
      </div>
    </div>
  );
}
