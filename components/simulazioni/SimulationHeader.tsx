'use client';

import {
  Clock,
  CheckCircle,
  Send,
  Grid3X3,
  Shield,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { colors } from '@/lib/theme/colors';

interface SimulationHeaderProps {
  readonly simulationTitle: string;
  readonly currentQuestionIndex: number;
  readonly totalQuestions: number;
  readonly answeredCount: number;
  readonly showNavigation: boolean;
  readonly onToggleNavigation: () => void;
  readonly onSubmit: () => void;
  // Timer props
  readonly timeSpent: number;
  readonly timeRemaining: number | null;
  // Anti-cheat props
  readonly enableAntiCheat: boolean;
  readonly violationCount: number;
  // Section mode props (for TOLC-style)
  readonly hasSectionsMode?: boolean;
  readonly currentSection?: { name: string } | null;
  readonly sectionTimeRemaining?: number | null;
  readonly currentSectionQuestionIndex?: number;
  readonly currentSectionQuestionsLength?: number;
}

// Format time helper
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function SimulationHeader({
  simulationTitle,
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  showNavigation,
  onToggleNavigation,
  onSubmit,
  timeSpent,
  timeRemaining,
  enableAntiCheat,
  violationCount,
  hasSectionsMode = false,
  currentSection = null,
  sectionTimeRemaining = null,
  currentSectionQuestionIndex = 0,
  currentSectionQuestionsLength = 0,
}: SimulationHeaderProps) {
  // Render progress text
  const renderProgress = () => {
    if (hasSectionsMode && currentSection) {
      return (
        <>
          <span className="hidden sm:inline">{currentSection.name}: </span>
          {currentSectionQuestionIndex + 1}/{currentSectionQuestionsLength}
        </>
      );
    }
    return <>{currentQuestionIndex + 1}/{totalQuestions}</>;
  };

  // Render anti-cheat indicator
  const renderAntiCheatIndicator = () => {
    if (!enableAntiCheat) return null;
    
    const hasViolations = violationCount > 0;
    const indicatorClasses = hasViolations
      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    
    const title = hasViolations
      ? `${violationCount} violazioni rilevate`
      : 'Monitoraggio attivo';

    return (
      <div
        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg ${indicatorClasses}`}
        title={title}
      >
        {hasViolations ? (
          <ShieldAlert className="w-4 h-4" />
        ) : (
          <Shield className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {hasViolations ? `${violationCount}/10` : 'Protetto'}
        </span>
      </div>
    );
  };

  // Render timer
  const renderTimer = () => {
    if (hasSectionsMode && currentSection) {
      const isLowTime = sectionTimeRemaining !== null && sectionTimeRemaining < 60;
      const timerClasses = isLowTime
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';

      return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timerClasses}`}>
          <Layers className="w-4 h-4" />
          <span className="font-mono font-medium text-sm">
            {currentSection.name}: {sectionTimeRemaining === null ? '--:--' : formatTime(sectionTimeRemaining)}
          </span>
        </div>
      );
    }

    const isLowTime = timeRemaining !== null && timeRemaining < 300;
    const timerClasses = isLowTime
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      : 'bg-gray-100 dark:bg-slate-700';

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timerClasses}`}>
        <Clock className={`w-4 h-4 ${isLowTime ? '' : colors.icon.primary}`} />
        <span className={`font-mono font-medium ${isLowTime ? '' : colors.text.primary}`}>
          {timeRemaining === null ? formatTime(timeSpent) : formatTime(timeRemaining)}
        </span>
      </div>
    );
  };

  return (
    <div className={`sticky top-0 z-10 ${colors.background.card} border-b ${colors.border.light} px-4 py-3`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left side - Title and progress */}
        <div className="flex items-center gap-4">
          <h1 className={`font-semibold ${colors.text.primary} hidden sm:block`}>
            {simulationTitle}
          </h1>
          <span className={`text-sm ${colors.text.muted}`}>
            {renderProgress()}
          </span>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-4">
          {renderAntiCheatIndicator()}
          {renderTimer()}

          {/* Progress indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
            <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
            <span className={`text-sm font-medium ${colors.text.primary}`}>
              {answeredCount}/{totalQuestions}
            </span>
          </div>

          {/* Navigation toggle */}
          <button
            onClick={onToggleNavigation}
            className={`p-2 rounded-lg transition-colors ${
              showNavigation
                ? 'bg-gray-300 dark:bg-slate-600'
                : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <Grid3X3 className={`w-5 h-5 ${colors.icon.primary}`} />
          </button>

          {/* Submit button */}
          <button
            onClick={onSubmit}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90`}
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Concludi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
