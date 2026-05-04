'use client';

import { useState, useMemo } from 'react';

export interface PreviewQuestion {
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

export interface PreviewSection {
  id: string;
  name: string;
  durationMinutes: number;
  questionIds: string[];
  order: number;
}

export type PreviewScreen = 'start' | 'execution';

interface UseSimulationPreviewOptions {
  hasSections: boolean;
  sections: PreviewSection[];
  questions: PreviewQuestion[];
  durationMinutes: number;
  onClose: () => void;
}

export function useSimulationPreview({
  hasSections,
  sections,
  questions,
  durationMinutes,
  onClose,
}: UseSimulationPreviewOptions) {
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(true);

  const effectiveSections = useMemo(() => {
    if (hasSections && sections.length === 0) {
      return [{
        id: 'placeholder-1',
        name: 'Sezione 1 (da configurare)',
        durationMinutes,
        questionIds: questions.map(q => q.id),
        order: 0,
      }];
    }
    return sections;
  }, [hasSections, sections, durationMinutes, questions]);

  const currentSectionQuestions = useMemo(() => {
    if (!hasSections || effectiveSections.length === 0) return questions;
    const currentSection = effectiveSections[currentSectionIndex];
    if (!currentSection) return questions;
    return questions.filter(q => currentSection.questionIds.includes(q.id));
  }, [questions, hasSections, effectiveSections, currentSectionIndex]);

  const currentQuestion = useMemo(() => {
    if (hasSections && effectiveSections.length > 0) return currentSectionQuestions[currentQuestionIndex];
    return questions[currentQuestionIndex];
  }, [questions, currentQuestionIndex, hasSections, effectiveSections, currentSectionQuestions]);

  const canGoNext = hasSections
    ? currentQuestionIndex < currentSectionQuestions.length - 1
    : currentQuestionIndex < questions.length - 1;
  const canGoPrev = currentQuestionIndex > 0;

  const sectionDuration = hasSections && effectiveSections[currentSectionIndex]
    ? effectiveSections[currentSectionIndex].durationMinutes * 60
    : durationMinutes * 60;

  const goNext = () => {
    if (canGoNext) { setCurrentQuestionIndex(p => p + 1); setSelectedAnswer(null); }
  };
  const goPrev = () => {
    if (canGoPrev) { setCurrentQuestionIndex(p => p - 1); setSelectedAnswer(null); }
  };
  const goToQuestion = (index: number) => { setCurrentQuestionIndex(index); setSelectedAnswer(null); };
  const changeSection = (index: number) => { setCurrentSectionIndex(index); setCurrentQuestionIndex(0); setSelectedAnswer(null); };
  const handleClose = () => {
    setPreviewScreen('start');
    setCurrentQuestionIndex(0);
    setCurrentSectionIndex(0);
    setSelectedAnswer(null);
    onClose();
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
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
  };
}
