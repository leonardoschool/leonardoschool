'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { colors } from '@/lib/theme/colors';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  CheckCircle,
  User,
  Settings,
  Info,
  Layers,
  Play,
  Award,
  Shield,
  Maximize,
  Monitor,
  Grid3X3,
  Send,
  Target,
} from 'lucide-react';

// Types for preview
interface PreviewQuestion {
  id: string;
  text: string;
  textLatex?: string | null;
  type: string;
  difficulty: string;
  imageUrl?: string | null;
  subject?: { name: string; color?: string | null } | null;
  topic?: { name?: string | null } | null;
  answers: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    order: number;
    imageUrl?: string | null;
  }>;
}

interface PreviewSection {
  id: string;
  name: string;
  durationMinutes: number;
  questionIds: string[];
  order: number;
}

interface SimulationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Simulation data
  title: string;
  description?: string;
  simulationType: string;
  durationMinutes: number;
  questions: PreviewQuestion[];
  // Sections (for TOLC-style)
  hasSections: boolean;
  sections: PreviewSection[];
  // Configuration
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

type PreviewScreen = 'start' | 'execution';

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
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(true);

  // Answer letters
  const answerLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  // Create placeholder sections if hasSections is true but no sections defined yet
  // This allows preview of TOLC layout even before sections are configured
  const effectiveSections = useMemo(() => {
    if (hasSections && sections.length === 0) {
      return [{ id: 'placeholder-1', name: 'Sezione 1 (da configurare)', durationMinutes: durationMinutes, questionIds: questions.map(q => q.id), order: 0 }];
    }
    return sections;
  }, [hasSections, sections, durationMinutes, questions]);

  // Get questions for current section in TOLC mode
  const currentSectionQuestions = useMemo(() => {
    if (!hasSections || effectiveSections.length === 0) return questions;
    const currentSection = effectiveSections[currentSectionIndex];
    if (!currentSection) return questions;
    return questions.filter(q => currentSection.questionIds.includes(q.id));
  }, [questions, hasSections, effectiveSections, currentSectionIndex]);

  // Current question (section-aware)
  const currentQuestion = useMemo(() => {
    if (hasSections && effectiveSections.length > 0) {
      return currentSectionQuestions[currentQuestionIndex];
    }
    return questions[currentQuestionIndex];
  }, [questions, currentQuestionIndex, hasSections, effectiveSections, currentSectionQuestions]);

  // Navigation
  const canGoNext = hasSections
    ? currentQuestionIndex < currentSectionQuestions.length - 1
    : currentQuestionIndex < questions.length - 1;
  const canGoPrev = currentQuestionIndex > 0;

  const goNext = () => {
    if (canGoNext) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    }
  };

  const goPrev = () => {
    if (canGoPrev) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setSelectedAnswer(null);
  };

  // Reset state when closing
  const handleClose = () => {
    setPreviewScreen('start');
    setCurrentQuestionIndex(0);
    setCurrentSectionIndex(0);
    setSelectedAnswer(null);
    onClose();
  };

  // Change section
  const changeSection = (index: number) => {
    setCurrentSectionIndex(index);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
  };

  if (!isOpen) return null;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalQuestions = questions.length;
  
  const sectionDuration = hasSections && effectiveSections[currentSectionIndex]
    ? effectiveSections[currentSectionIndex].durationMinutes * 60
    : durationMinutes * 60;

  // Determine which layout to use - TOLC for simulations with hasSections=true
  // This shows TOLC layout even if sections aren't fully configured yet
  const useTolcLayout = hasSections;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Preview Container - simulates browser window */}
      <div className="relative w-full h-full max-w-7xl max-h-[95vh] mx-4 flex flex-col rounded-xl overflow-hidden shadow-2xl">
        {/* Preview Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {/* Window controls (decorative) */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Monitor className="w-4 h-4" />
              <span>Anteprima Studente - {simulationType === 'OFFICIAL' ? 'Simulazione Ufficiale' : simulationType === 'PRACTICE' ? 'Esercitazione' : simulationType === 'QUICK_QUIZ' ? 'Quiz Veloce' : 'Personalizzata'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Screen toggle */}
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
            // ===== START SCREEN PREVIEW =====
            <div className="h-full overflow-y-auto p-8">
              <div className="max-w-2xl mx-auto">
                <div className={`rounded-xl p-8 ${colors.background.card} border ${colors.border.light} text-center`}>
                  {/* Badges */}
                  <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                    {isOfficial && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">
                        <Award className="w-4 h-4" />
                        Simulazione Ufficiale
                      </div>
                    )}
                    {hasSections && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                        <Layers className="w-4 h-4" />
                        {effectiveSections.length} Sezioni
                      </div>
                    )}
                  </div>

                  <h1 className={`text-2xl font-bold ${colors.text.primary} mb-2`}>{title || 'Titolo Simulazione'}</h1>
                  {description && (
                    <p className={`${colors.text.secondary} mb-6`}>{description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
                      <Target className="w-6 h-6 mx-auto text-gray-500 mb-2" />
                      <p className={`text-2xl font-bold ${colors.text.primary}`}>{totalQuestions}</p>
                      <p className={`text-sm ${colors.text.muted}`}>Domande</p>
                    </div>
                    <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
                      <Clock className="w-6 h-6 mx-auto text-gray-500 mb-2" />
                      <p className={`text-2xl font-bold ${colors.text.primary}`}>
                        {durationMinutes > 0 ? `${durationMinutes} min` : '∞'}
                      </p>
                      <p className={`text-sm ${colors.text.muted}`}>Tempo</p>
                    </div>
                  </div>

                  {/* Scoring */}
                  <div className={`mb-8 text-left p-4 rounded-lg ${colors.background.secondary}`}>
                    <h3 className={`font-medium ${colors.text.primary} mb-3`}>Punteggio:</h3>
                    <ul className={`space-y-1 text-sm ${colors.text.secondary}`}>
                      <li>✓ Risposta corretta: <span className="font-medium text-green-600">+{correctPoints}</span></li>
                      <li>✗ Risposta errata: <span className="font-medium text-red-600">{wrongPoints}</span></li>
                      <li>○ Non risposta: <span className="font-medium">{blankPoints}</span></li>
                    </ul>
                  </div>

                  {/* Sections preview */}
                  {hasSections && effectiveSections.length > 0 && (
                    <div className={`mb-6 text-left p-4 rounded-lg ${colors.background.secondary}`}>
                      <h3 className={`font-medium ${colors.text.primary} mb-3 flex items-center gap-2`}>
                        <Layers className="w-4 h-4" />
                        Sezioni:
                      </h3>
                      <div className="space-y-2">
                        {effectiveSections.map((section, idx) => (
                          <div key={section.id} className={`flex items-center justify-between text-sm p-2 rounded ${colors.background.card} border ${colors.border.light}`}>
                            <span className={colors.text.primary}>{idx + 1}. {section.name}</span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={colors.text.muted}>{section.questionIds.length} domande</span>
                              <span className={colors.text.muted}>{section.durationMinutes} min</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Anti-cheat warning */}
                  {enableAntiCheat && (
                    <div className="mb-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-left">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-1">
                            Protezione Anti-Cheat Attiva
                          </h4>
                          <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
                            <li>• Cambio finestra/tab del browser</li>
                            <li>• Apertura strumenti sviluppatore</li>
                            <li>• Tentativi di copia/incolla</li>
                            {forceFullscreen && <li>• Uscita dalla modalità schermo intero</li>}
                          </ul>
                          {forceFullscreen && (
                            <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mt-3 flex items-center gap-2">
                              <Maximize className="w-4 h-4" />
                              Sarà richiesta la modalità schermo intero
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Start button (disabled in preview) */}
                  <button
                    disabled
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white ${colors.primary.bg} opacity-75 cursor-not-allowed text-lg font-medium`}
                  >
                    <Play className="w-5 h-5" />
                    Inizia Simulazione
                  </button>
                  <p className={`text-xs mt-2 ${colors.text.muted}`}>
                    (Questa è un&apos;anteprima - il pulsante non è attivo)
                  </p>
                </div>
              </div>
            </div>
          ) : useTolcLayout ? (
            // ===== TOLC LAYOUT (with sections) - IDENTICAL TO TolcSimulationLayout =====
            <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
              {/* TOLC Header */}
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

              {/* TOLC Main - 3 column layout */}
              <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-hidden">
                {/* Left Sidebar - Current Section & Navigation */}
                <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                  {/* Current Section */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${colors.primary.softBg} border-l-4 ${colors.primary.border}`}>
                      <Info className={`w-5 h-5 ${colors.primary.text}`} />
                      <span className={`font-semibold text-sm ${colors.primary.text} uppercase`}>
                        {effectiveSections[currentSectionIndex]?.name || 'Sezione'}
                      </span>
                    </div>

                    {/* Question Numbers Grid */}
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

                  {/* Complete Section Button */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <button className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm uppercase ${colors.primary.bg} text-white opacity-75 cursor-not-allowed`}>
                      Concludi Sezione
                    </button>
                  </div>

                  {/* Other Sections */}
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
                        {/* Question Number & Flag */}
                        <div className="flex items-start justify-between mb-6">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${colors.primary.bg} text-white font-bold text-lg`}>
                            {String(currentQuestionIndex + 1).padStart(2, '0')}
                          </span>
                          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-orange-500">
                            <Flag className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Question Image */}
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

                        {/* Question Text */}
                        <div className="mb-8">
                          <div
                            className={`text-lg leading-relaxed prose dark:prose-invert max-w-none ${colors.text.primary}`}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentQuestion.text) }}
                          />
                          {currentQuestion.textLatex && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <LaTeXRenderer latex={currentQuestion.textLatex} className={colors.text.primary} />
                            </div>
                          )}
                        </div>

                        {/* Answers */}
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
                              const letter = answerLetters[idx] || String(idx + 1);

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
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className={colors.text.muted}>Nessuna domanda disponibile</p>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
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
                  {/* Circular Timer */}
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

                    {/* Legend */}
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
          ) : (
            // ===== STANDARD LAYOUT (no sections) - IDENTICAL TO StudentSimulationExecutionContent =====
            <div className="h-full flex flex-col min-h-0">
              {/* Header - EXACT copy from StudentSimulationExecutionContent */}
              <div className={`sticky top-0 z-10 ${colors.background.card} border-b ${colors.border.light} px-4 py-3`}>
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h1 className={`font-semibold ${colors.text.primary} hidden sm:block`}>{title || 'Simulazione'}</h1>
                    <span className={`text-sm ${colors.text.muted}`}>
                      {currentQuestionIndex + 1}/{totalQuestions}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700`}>
                      <Clock className={`w-4 h-4 ${colors.icon.primary}`} />
                      <span className={`font-mono font-medium ${colors.text.primary}`}>
                        {formatTime(durationMinutes * 60)}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
                      <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                      <span className={`text-sm font-medium ${colors.text.primary}`}>0/{totalQuestions}</span>
                    </div>

                    {/* Navigation toggle */}
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

                    {/* Submit button */}
                    <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} opacity-75 cursor-not-allowed`}>
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Concludi</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main content - EXACT copy from StudentSimulationExecutionContent */}
              <div className="flex-1 flex overflow-hidden">
                {/* Question panel */}
                <div className="flex-1 px-4 py-6 overflow-y-auto">
                  <div className="max-w-3xl mx-auto">
                    {currentQuestion ? (
                      <>
                        {/* Question header */}
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-sm font-medium ${colors.text.muted}`}>
                            Domanda {currentQuestionIndex + 1}
                          </span>
                          <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.background.hover} ${colors.text.secondary}`}>
                            <Flag className="w-4 h-4" />
                            Contrassegna
                          </button>
                        </div>

                        {/* Question text */}
                        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light} mb-6`}>
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
                          <div
                            className={`prose prose-sm max-w-none ${colors.text.primary}`}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentQuestion.text) }}
                          />
                          {currentQuestion.textLatex && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <LaTeXRenderer latex={currentQuestion.textLatex} className={colors.text.primary} />
                            </div>
                          )}
                        </div>

                        {/* Answers */}
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
                                    {answer.imageUrl && (
                                      <div className="mb-2">
                                        <Image
                                          src={answer.imageUrl}
                                          alt={`Opzione ${label}`}
                                          width={200}
                                          height={120}
                                          className="rounded-lg"
                                          style={{ maxHeight: '120px', objectFit: 'contain' }}
                                        />
                                      </div>
                                    )}
                                    <div
                                      className={`${colors.text.primary}`}
                                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.text) }}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Navigation buttons */}
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

                {/* Navigation sidebar - EXACT copy */}
                {showNavigation && (
                  <div className={`w-full sm:w-80 lg:w-96 border-l ${colors.border.light} ${colors.background.secondary} overflow-y-auto`}>
                    <div className="p-4">
                      <h3 className={`font-medium ${colors.text.primary} mb-4`}>Navigazione</h3>

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

                      {/* Stats */}
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
