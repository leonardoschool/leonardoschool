/**
 * Leonardo School Mobile - Question Feedback Modal
 * 
 * Modale per segnalare problemi con le domande durante le simulazioni.
 * Permette di selezionare il tipo di problema e aggiungere una descrizione.
 */

import React, { useState } from 'react';
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, Button } from '../ui';
import { colors } from '../../lib/theme/colors';
import { spacing } from '../../lib/theme/spacing';
import { useTheme } from '../../contexts/ThemeContext';
import { trpc } from '../../lib/trpc';
import { showSuccessAlert, showErrorAlert } from '../../lib/errorHandler';

// ==================== TYPES ====================

type FeedbackType = 
  | 'ERROR_IN_QUESTION' 
  | 'ERROR_IN_ANSWER' 
  | 'UNCLEAR' 
  | 'SUGGESTION' 
  | 'OTHER';

interface FeedbackOption {
  value: FeedbackType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface QuestionFeedbackModalProps {
  readonly visible: boolean;
  readonly questionId: string;
  readonly questionText?: string;
  readonly onClose: () => void;
}

// ==================== CONSTANTS ====================

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  { value: 'ERROR_IN_QUESTION', label: 'Errore nel testo della domanda', icon: 'alert-circle' },
  { value: 'ERROR_IN_ANSWER', label: 'Errore nelle risposte', icon: 'close-circle' },
  { value: 'UNCLEAR', label: 'Domanda poco chiara', icon: 'help-circle' },
  { value: 'SUGGESTION', label: 'Suggerimento miglioramento', icon: 'bulb' },
  { value: 'OTHER', label: 'Altro', icon: 'ellipsis-horizontal-circle' },
];

const MIN_MESSAGE_LENGTH = 10;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ==================== COMPONENT ====================

export function QuestionFeedbackModal({ 
  visible, 
  questionId, 
  questionText,
  onClose,
}: QuestionFeedbackModalProps) {
  const { themed } = useTheme();
  
  // State
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('ERROR_IN_QUESTION');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Mutation
  const submitFeedbackMutation = trpc.questions.submitFeedback.useMutation({
    onSuccess: () => {
      showSuccessAlert('Segnalazione inviata', 'Grazie per la tua segnalazione!');
      resetAndClose();
    },
    onError: (error: { message?: string }) => {
      showErrorAlert('Errore', error.message || 'Impossibile inviare la segnalazione');
    },
  });

  // Handlers
  const resetAndClose = () => {
    setFeedbackType('ERROR_IN_QUESTION');
    setFeedbackMessage('');
    onClose();
  };

  const handleSubmit = () => {
    if (feedbackMessage.length < MIN_MESSAGE_LENGTH) {
      showErrorAlert('Messaggio troppo breve', `Inserisci almeno ${MIN_MESSAGE_LENGTH} caratteri`);
      return;
    }

    submitFeedbackMutation.mutate({
      questionId,
      type: feedbackType,
      message: feedbackMessage,
    });
  };

  const isValid = feedbackMessage.length >= MIN_MESSAGE_LENGTH;

  // Dynamic styles
  const cardBg = themed({
    light: colors.background.card.light,
    dark: colors.background.card.dark,
  });
  const borderColor = themed({
    light: colors.border.primary.light,
    dark: colors.border.primary.dark,
  });
  const textPrimary = themed({
    light: colors.text.primary.light,
    dark: colors.text.primary.dark,
  });
  const textSecondary = themed({
    light: colors.text.secondary.light,
    dark: colors.text.secondary.dark,
  });
  const inputBg = themed({
    light: colors.background.secondary.light,
    dark: colors.background.secondary.dark,
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={resetAndClose} />
        
        {/* Modal Content */}
        <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerTitle}>
              <Ionicons 
                name="flag" 
                size={22} 
                color={colors.status.warning.main} 
              />
              <Text variant="h3" style={{ marginLeft: spacing[2] }}>
                Segnala Problema
              </Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Question preview */}
            {questionText && (
              <View style={[styles.questionPreview, { backgroundColor: inputBg }]}>
                <Text variant="bodySmall" color="muted" numberOfLines={2}>
                  {questionText}
                </Text>
              </View>
            )}

            {/* Feedback type label */}
            <Text variant="body" style={styles.sectionLabel}>
              Tipo di problema
            </Text>
            
            {/* Feedback options */}
            {FEEDBACK_OPTIONS.map((option) => {
              const isSelected = feedbackType === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: isSelected ? `${colors.primary.main}15` : inputBg,
                      borderColor: isSelected ? colors.primary.main : borderColor,
                    },
                  ]}
                  onPress={() => setFeedbackType(option.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={isSelected ? colors.primary.main : textSecondary}
                  />
                  <Text
                    variant="body"
                    style={[
                      styles.optionText,
                      { color: isSelected ? colors.primary.main : textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Description label */}
            <Text variant="body" style={[styles.sectionLabel, { marginTop: spacing[4] }]}>
              Descrizione del problema
            </Text>
            
            {/* Text input */}
            <TextInput
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              placeholder="Descrivi il problema in dettaglio..."
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={4}
              style={[
                styles.textInput,
                {
                  backgroundColor: inputBg,
                  borderColor: borderColor,
                  color: textPrimary,
                },
              ]}
              textAlignVertical="top"
            />
            
            {/* Character count */}
            <Text variant="caption" color="muted" style={styles.charCount}>
              Minimo {MIN_MESSAGE_LENGTH} caratteri ({feedbackMessage.length}/{MIN_MESSAGE_LENGTH})
            </Text>
          </ScrollView>

          {/* Footer buttons */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <Button
              onPress={resetAndClose}
              variant="outline"
              style={styles.footerButton}
            >
              Annulla
            </Button>
            <Button
              onPress={handleSubmit}
              variant="primary"
              disabled={!isValid || submitFeedbackMutation.isPending}
              style={styles.footerButton}
              loading={submitFeedbackMutation.isPending}
            >
              Invia Segnalazione
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  questionPreview: {
    padding: spacing[3],
    borderRadius: 12,
    marginBottom: spacing[4],
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: spacing[2],
  },
  optionText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  textInput: {
    padding: spacing[4],
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 120,
    fontSize: 16,
    lineHeight: 22,
  },
  charCount: {
    marginTop: spacing[2],
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[4],
    borderTopWidth: 1,
    gap: spacing[3],
  },
  footerButton: {
    flex: 1,
  },
});

export default QuestionFeedbackModal;
