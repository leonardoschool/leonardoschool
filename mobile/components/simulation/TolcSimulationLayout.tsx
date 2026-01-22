/**
 * Leonardo School Mobile - TOLC Simulation Layout
 * 
 * Layout per simulazioni TOLC-style con supporto sezioni,
 * timer per sezione, e navigazione domande.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, Button, Card } from '../ui';
import { RichTextWithLaTeX } from '../ui/LaTeXRenderer';
import { colors } from '../../lib/theme/colors';
import { spacing } from '../../lib/theme/spacing';
import { useTheme } from '../../contexts/ThemeContext';

// ==================== TYPES ====================

interface SimulationSection {
  name: string;
  durationMinutes: number;
  questionIds: string[];
  subjectId?: string;
}

interface Question {
  questionId: string;
  question?: {
    text?: string;
    textLatex?: string;
    imageUrl?: string;
    type?: string;
    answers?: Array<{
      id: string;
      text: string;
      textLatex?: string;
      imageUrl?: string;
    }>;
  };
}

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

// ==================== HELPER FUNCTIONS ====================

const formatTime = (seconds: number) => {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const answerLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ==================== QUESTION NAVIGATOR MODAL ====================

interface QuestionNavigatorProps {
  visible: boolean;
  onClose: () => void;
  questions: Question[];
  answers: Answer[];
  currentQuestionIndex: number;
  onGoToQuestion: (index: number) => void;
  onCompleteSection: () => void;
  sectionName: string;
}

function QuestionNavigator({
  visible,
  onClose,
  questions,
  answers,
  currentQuestionIndex,
  onGoToQuestion,
  onCompleteSection,
  sectionName,
}: QuestionNavigatorProps) {
  const { themed } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const buttonSize = Math.floor((screenWidth - spacing[8] - spacing[2] * 4) / 5);

  const getQuestionStatus = (question: Question) => {
    const answer = answers.find((a) => a.questionId === question.questionId);
    if (!answer) return 'unanswered';
    if (answer.flagged) return 'flagged';
    if (answer.answerId) return 'answered';
    return 'unanswered';
  };

  const answeredCount = questions.filter((q) => {
    const ans = answers.find((a) => a.questionId === q.questionId);
    return ans?.answerId;
  }).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: themed(colors.background.card),
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
            padding: spacing[4],
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing[4],
            }}
          >
            <View>
              <Text variant="h5">{sectionName}</Text>
              <Text variant="caption" color="muted">
                {answeredCount} / {questions.length} risposte
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: spacing[2] }}>
              <Ionicons name="close" size={24} color={themed(colors.text.secondary)} />
            </TouchableOpacity>
          </View>

          {/* Questions Grid */}
          <ScrollView style={{ maxHeight: 300 }}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing[2],
              }}
            >
              {questions.map((q, idx) => {
                const status = getQuestionStatus(q);
                const isActive = idx === currentQuestionIndex;

                return (
                  <TouchableOpacity
                    key={q.questionId}
                    onPress={() => {
                      onGoToQuestion(idx);
                      onClose();
                    }}
                    style={{
                      width: buttonSize,
                      height: buttonSize,
                      borderRadius: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isActive
                        ? colors.neutral[800]
                        : status === 'answered'
                          ? colors.status.success.main
                          : status === 'flagged'
                            ? colors.status.warning.light
                            : themed(colors.background.secondary),
                      borderWidth: status === 'flagged' || status === 'unanswered' ? 2 : 0,
                      borderColor:
                        status === 'flagged'
                          ? colors.status.warning.main
                          : status === 'unanswered'
                            ? colors.status.error.light
                            : 'transparent',
                    }}
                  >
                    <Text
                      variant="body"
                      style={{
                        fontWeight: '600',
                        color: isActive
                          ? '#fff'
                          : status === 'answered'
                            ? '#fff'
                            : status === 'flagged'
                              ? colors.status.warning.main
                              : themed(colors.text.primary),
                      }}
                    >
                      {idx + 1}
                    </Text>
                    {/* Red dot for unanswered */}
                    {status === 'unanswered' && !isActive && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.status.error.main,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Legend */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing[4],
              marginTop: spacing[4],
              paddingTop: spacing[4],
              borderTopWidth: 1,
              borderTopColor: themed(colors.border.primary),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.status.success.main,
                }}
              />
              <Text variant="caption" color="muted">
                Risposta
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.status.warning.main,
                }}
              />
              <Text variant="caption" color="muted">
                Segnalata
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: colors.status.error.light,
                }}
              />
              <Text variant="caption" color="muted">
                Da fare
              </Text>
            </View>
          </View>

          {/* Complete Section Button */}
          <Button
            onPress={() => {
              onCompleteSection();
              onClose();
            }}
            style={{ marginTop: spacing[4] }}
          >
            Concludi Sezione
          </Button>
        </View>
      </View>
    </Modal>
  );
}

// ==================== MAIN COMPONENT ====================

export default function TolcSimulationLayout({
  simulationTitle: _simulationTitle,
  questions,
  sections,
  currentSectionIndex,
  currentQuestionIndex,
  answers,
  sectionTimeRemaining,
  completedSections: _completedSections,
  onAnswerSelect,
  onToggleFlag,
  onGoToQuestion,
  onGoNext,
  onGoPrev,
  onCompleteSection,
  onReportQuestion,
}: TolcSimulationLayoutProps) {
  const { themed } = useTheme();
  const [showNavigator, setShowNavigator] = useState(false);

  // Current section
  const currentSection = sections[currentSectionIndex];

  // Get questions for current section
  const currentSectionQuestions = useMemo(() => {
    if (!currentSection) return questions;
    const filtered = questions.filter((q) =>
      currentSection.questionIds.includes(q.questionId)
    );
    return filtered.length > 0 ? filtered : questions;
  }, [questions, currentSection]);

  // Current question index within section
  const sectionQuestionIndex = useMemo(() => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return 0;
    const idx = currentSectionQuestions.findIndex(
      (q) => q.questionId === currentQ.questionId
    );
    return idx >= 0 ? idx : 0;
  }, [questions, currentQuestionIndex, currentSectionQuestions]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(
    (a) => a.questionId === currentQuestion?.questionId
  );

  // Navigation bounds
  const canGoNext = sectionQuestionIndex < currentSectionQuestions.length - 1;
  const canGoPrev = sectionQuestionIndex > 0;

  // Get question status
  const _getQuestionStatus = useCallback(
    (question: Question) => {
      const answer = answers.find((a) => a.questionId === question.questionId);
      if (!answer) return 'unanswered';
      if (answer.flagged) return 'flagged';
      if (answer.answerId) return 'answered';
      return 'unanswered';
    },
    [answers]
  );

  // Answered in section
  const answeredInSection = currentSectionQuestions.filter((q) => {
    const ans = answers.find((a) => a.questionId === q.questionId);
    return ans?.answerId;
  }).length;

  // Timer color
  const getTimerColor = () => {
    if (sectionTimeRemaining === null) return colors.status.info.main;
    if (sectionTimeRemaining < 60) return colors.status.error.main;
    if (sectionTimeRemaining < 300) return colors.status.warning.main;
    return colors.status.info.main;
  };

  if (!currentQuestion) return null;

  return (
    <View style={{ flex: 1, backgroundColor: themed(colors.background.primary) }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: themed(colors.background.card),
          borderBottomWidth: 1,
          borderBottomColor: themed(colors.border.primary),
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Section Info */}
          <TouchableOpacity
            onPress={() => setShowNavigator(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <View
              style={{
                backgroundColor: colors.primary.main,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[1],
                borderRadius: 8,
              }}
            >
              <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
                {currentSection?.name || 'Sezione'}
              </Text>
            </View>
            <Ionicons name="grid-outline" size={20} color={themed(colors.text.muted)} />
          </TouchableOpacity>

          {/* Timer */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[2],
              backgroundColor: themed(colors.background.secondary),
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[2],
              borderRadius: 8,
            }}
          >
            <Ionicons name="time-outline" size={18} color={getTimerColor()} />
            <Text variant="h6" style={{ color: getTimerColor() }}>
              {sectionTimeRemaining !== null ? formatTime(sectionTimeRemaining) : '--:--'}
            </Text>
          </View>

          {/* Report button */}
          <TouchableOpacity
            onPress={onReportQuestion}
            style={{
              padding: spacing[2],
              backgroundColor: themed(colors.background.secondary),
              borderRadius: 8,
            }}
          >
            <Ionicons name="settings-outline" size={20} color={themed(colors.text.muted)} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View
          style={{
            marginTop: spacing[3],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          <View
            style={{
              flex: 1,
              height: 4,
              backgroundColor: themed(colors.background.secondary),
              borderRadius: 2,
            }}
          >
            <View
              style={{
                width: `${(answeredInSection / currentSectionQuestions.length) * 100}%`,
                height: '100%',
                backgroundColor: colors.status.success.main,
                borderRadius: 2,
              }}
            />
          </View>
          <Text variant="caption" color="muted">
            {answeredInSection}/{currentSectionQuestions.length}
          </Text>
        </View>
      </View>

      {/* Question Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4] }}
      >
        {/* Question Number & Flag */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing[4],
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary.main,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>
              {String(sectionQuestionIndex + 1).padStart(2, '0')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onToggleFlag}
            style={{
              padding: spacing[2],
              borderRadius: 8,
              backgroundColor: currentAnswer?.flagged
                ? colors.status.warning.light
                : themed(colors.background.secondary),
            }}
          >
            <Ionicons
              name={currentAnswer?.flagged ? 'flag' : 'flag-outline'}
              size={24}
              color={
                currentAnswer?.flagged
                  ? colors.status.warning.main
                  : themed(colors.text.muted)
              }
            />
          </TouchableOpacity>
        </View>

        {/* Question Text */}
        <Card style={{ padding: spacing[4], marginBottom: spacing[4] }}>
          <RichTextWithLaTeX 
            content={currentQuestion.question?.textLatex || currentQuestion.question?.text || ''} 
            fontSize={16}
          />
        </Card>

        {/* Answers */}
        <View style={{ gap: spacing[3] }}>
          {currentQuestion.question?.answers?.map((answer, idx) => {
            const isSelected = currentAnswer?.answerId === answer.id;
            const letter = answerLetters[idx] || String(idx + 1);

            return (
              <TouchableOpacity
                key={answer.id}
                onPress={() => onAnswerSelect(answer.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: spacing[4],
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? colors.primary.light
                    : themed(colors.background.card),
                  borderWidth: 2,
                  borderColor: isSelected
                    ? colors.primary.main
                    : themed(colors.border.primary),
                }}
              >
                {/* Letter Circle */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isSelected
                      ? colors.primary.main
                      : themed(colors.background.secondary),
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing[3],
                  }}
                >
                  <Text
                    variant="body"
                    style={{
                      fontWeight: '600',
                      color: isSelected ? '#fff' : themed(colors.text.primary),
                    }}
                  >
                    {letter}
                  </Text>
                </View>

                {/* Answer Text */}
                <View style={{ flex: 1 }}>
                  <RichTextWithLaTeX 
                    content={answer.textLatex || answer.text || ''} 
                    fontSize={15}
                  />
                </View>

                {/* Check icon */}
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.primary.main}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation Footer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing[4],
          backgroundColor: themed(colors.background.card),
          borderTopWidth: 1,
          borderTopColor: themed(colors.border.primary),
        }}
      >
        <TouchableOpacity
          onPress={onGoPrev}
          disabled={!canGoPrev}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            borderRadius: 12,
            backgroundColor: canGoPrev
              ? themed(colors.background.secondary)
              : themed(colors.background.primary),
            opacity: canGoPrev ? 1 : 0.5,
          }}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={themed(colors.text.primary)}
          />
          <Text variant="body">Prec</Text>
        </TouchableOpacity>

        {/* Question indicator */}
        <Text variant="body" color="muted">
          {sectionQuestionIndex + 1} / {currentSectionQuestions.length}
        </Text>

        <TouchableOpacity
          onPress={onGoNext}
          disabled={!canGoNext}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            borderRadius: 12,
            backgroundColor: canGoNext
              ? themed(colors.background.secondary)
              : themed(colors.background.primary),
            opacity: canGoNext ? 1 : 0.5,
          }}
        >
          <Text variant="body">Succ</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themed(colors.text.primary)}
          />
        </TouchableOpacity>
      </View>

      {/* Question Navigator Modal */}
      <QuestionNavigator
        visible={showNavigator}
        onClose={() => setShowNavigator(false)}
        questions={currentSectionQuestions}
        answers={answers}
        currentQuestionIndex={sectionQuestionIndex}
        onGoToQuestion={(idx) => {
          // Convert section index to global index
          const question = currentSectionQuestions[idx];
          if (question) {
            const globalIdx = questions.findIndex(
              (q) => q.questionId === question.questionId
            );
            if (globalIdx >= 0) {
              onGoToQuestion(globalIdx);
            }
          }
        }}
        onCompleteSection={onCompleteSection}
        sectionName={currentSection?.name || 'Sezione'}
      />
    </View>
  );
}
