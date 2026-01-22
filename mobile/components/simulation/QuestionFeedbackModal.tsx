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
  visible: boolean;
  questionId: string;
  questionText?: string;
  onClose: () => void;
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
  const dynamicStyles = {
    container: themed({
      light: colors.background.primary.light,
      dark: colors.background.primary.dark,
    }),
    card: themed({
      light: colors.background.card.light,
      dark: colors.background.card.dark,
    }),
    border: themed({
      light: colors.border.primary.light,
      dark: colors.border.primary.dark,
    }),
    textPrimary: themed({
      light: colors.text.primary.light,
      dark: colors.text.primary.dark,
    }),
    textSecondary: themed({
      light: colors.text.secondary.light,
      dark: colors.text.secondary.dark,
    }),
    inputBg: themed({
      light: colors.background.secondary.light,
      dark: colors.background.secondary.dark,
    }),
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={resetAndClose}
        />
        
        <View style={[styles.modal, { backgroundColor: dynamicStyles.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: dynamicStyles.border }]}>
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
            <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
              <Ionicons 
                name="close" 
                size={24} 
                color={dynamicStyles.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Question preview (optional) */}
            {questionText && (
              <View style={[styles.questionPreview, { backgroundColor: dynamicStyles.inputBg }]}>
                <Text variant="bodySmall" color="muted" numberOfLines={2}>
                  {questionText}
                </Text>
              </View>
            )}

            {/* Feedback type selection */}
            <Text variant="body" style={{ fontWeight: '600', marginBottom: spacing[2] }}>
              Tipo di problema
            </Text>
            <View style={styles.optionsContainer}>
              {FEEDBACK_OPTIONS.map((option) => {
                const isSelected = feedbackType === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor: isSelected 
                          ? colors.primary.light 
                          : dynamicStyles.inputBg,
                        borderColor: isSelected 
                          ? colors.primary.main 
                          : dynamicStyles.border,
                      },
                    ]}
                    onPress={() => setFeedbackType(option.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? colors.primary.main : dynamicStyles.textSecondary}
                    />
                    <Text
                      variant="body"
                      style={{
                        flex: 1,
                        marginLeft: spacing[2],
                        color: isSelected ? colors.primary.main : dynamicStyles.textPrimary,
                      }}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary.main}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Message input */}
            <Text 
              variant="body" 
              style={{ fontWeight: '600', marginTop: spacing[4], marginBottom: spacing[2] }}
            >
              Descrizione
            </Text>
            <TextInput
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              placeholder="Descrivi il problema in dettaglio..."
              placeholderTextColor={dynamicStyles.textSecondary}
              multiline
              numberOfLines={4}
              style={[
                styles.textInput,
                {
                  backgroundColor: dynamicStyles.inputBg,
                  borderColor: dynamicStyles.border,
                  color: dynamicStyles.textPrimary,
                },
              ]}
              textAlignVertical="top"
            />
            <Text 
              variant="caption" 
              color="muted"
              style={{ marginTop: spacing[1] }}
            >
              Minimo {MIN_MESSAGE_LENGTH} caratteri ({feedbackMessage.length}/{MIN_MESSAGE_LENGTH})
            </Text>
          </ScrollView>

          {/* Footer buttons */}
          <View style={[styles.footer, { borderTopColor: dynamicStyles.border }]}>
            <Button
              onPress={resetAndClose}
              variant="outline"
              style={{ flex: 1, marginRight: spacing[2] }}
            >
              Annulla
            </Button>
            <Button
              onPress={handleSubmit}
              variant="primary"
              disabled={!isValid || submitFeedbackMutation.isPending}
              style={{ flex: 1 }}
              loading={submitFeedbackMutation.isPending}
            >
              Invia
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
  },
  questionPreview: {
    padding: spacing[3],
    borderRadius: 12,
    marginBottom: spacing[4],
  },
  optionsContainer: {
    gap: spacing[2],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
  },
  textInput: {
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 100,
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[4],
    borderTopWidth: 1,
  },
});

export default QuestionFeedbackModal;
