/**
 * Leonardo School Mobile - Self Practice Screen
 * 
 * Schermata per creare un quiz di autoesercitazione.
 * Replica la logica del SelfPracticeModal della webapp.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text, Caption } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { useThemedColors } from '../contexts/ThemeContext';
import { colors } from '../lib/theme/colors';
import { AppHeader } from '../components/navigation';
import { trpc } from '../lib/trpc';
import { spacing, layout } from '../lib/theme/spacing';

// Types matching API
type SmartRandomPreset = 'PROPORTIONAL' | 'BALANCED' | 'SINGLE_SUBJECT';
type DifficultyMix = 'BALANCED' | 'EASY_FOCUS' | 'MEDIUM_ONLY' | 'HARD_FOCUS';
type QuizMode = 'quiz' | 'reading';

interface Subject {
  id: string;
  name: string;
}

export default function SelfPracticeScreen() {
  const themedColors = useThemedColors();
  
  // State
  const [quizMode, setQuizMode] = useState<QuizMode>('quiz');
  const [questionCount, setQuestionCount] = useState('20');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [preset, setPreset] = useState<SmartRandomPreset>('PROPORTIONAL');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [difficultyMix, setDifficultyMix] = useState<DifficultyMix>('BALANCED');
  const [showSubjects, setShowSubjects] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const { data: subjectsData } = trpc.questions.getSubjects.useQuery();
  const subjects: Subject[] = (subjectsData || []) as Subject[];

  // Mutations
  const generateSmartQuestions = trpc.questions.generateSmartRandomQuestions.useMutation();

  const handleGenerate = async () => {
    try {
      const count = Number.parseInt(questionCount, 10);
      if (Number.isNaN(count) || count < 5) {
        Alert.alert('Errore', 'Inserisci un numero minimo di 5 domande.');
        return;
      }

      if (preset === 'SINGLE_SUBJECT' && !selectedSubjectId) {
        Alert.alert('Errore', 'Seleziona una materia.');
        return;
      }

      setIsCreating(true);

      const result = await generateSmartQuestions.mutateAsync({
        totalQuestions: count,
        preset,
        difficultyMix,
        maximizeTopicCoverage: true,
        avoidRecentlyUsed: true,
        focusSubjectId: preset === 'SINGLE_SUBJECT' ? selectedSubjectId : undefined,
      });

      if (!result || result.questions.length === 0) {
        Alert.alert('Nessuna domanda', 'Non ci sono domande disponibili con i criteri selezionati.');
        setIsCreating(false);
        return;
      }

      // Modalità lettura: naviga alla pagina di studio
      if (quizMode === 'reading') {
        setIsCreating(false);
        return;
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Errore', 'Impossibile creare il quiz.');
    } finally {
      setIsCreating(false);
    }
  };

  const getSelectedSubjectName = () => {
    const subject = subjects.find((s) => s.id === selectedSubjectId);
    return subject?.name || 'Seleziona materia...';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader
        title="Autoesercitazione"
        showBackButton
        onMenuPress={() => router.back()}
        rightActions={
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isCreating}
            style={[
              styles.createButton,
              { backgroundColor: isCreating ? themedColors.border : colors.primary.main },
            ]}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="flash" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Modalità Quiz vs Lettura */}
          <View style={styles.section}>
            <Text variant="body" style={[styles.sectionTitle, { color: themedColors.text }]}>
              Come vuoi esercitarti?
            </Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: quizMode === 'quiz' ? `${colors.primary.main}15` : themedColors.card,
                    borderColor: quizMode === 'quiz' ? colors.primary.main : themedColors.border,
                  },
                ]}
                onPress={() => setQuizMode('quiz')}
              >
                <Ionicons
                  name="create-outline"
                  size={28}
                  color={quizMode === 'quiz' ? colors.primary.main : themedColors.textMuted}
                />
                <Text
                  variant="body"
                  style={{
                    fontWeight: '600',
                    color: quizMode === 'quiz' ? colors.primary.main : themedColors.text,
                    marginTop: spacing[2],
                  }}
                >
                  Quiz
                </Text>
                <Caption style={{ textAlign: 'center' }}>Rispondi e verifica</Caption>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: quizMode === 'reading' ? `${colors.primary.main}15` : themedColors.card,
                    borderColor: quizMode === 'reading' ? colors.primary.main : themedColors.border,
                  },
                ]}
                onPress={() => setQuizMode('reading')}
              >
                <Ionicons
                  name="book-outline"
                  size={28}
                  color={quizMode === 'reading' ? colors.primary.main : themedColors.textMuted}
                />
                <Text
                  variant="body"
                  style={{
                    fontWeight: '600',
                    color: quizMode === 'reading' ? colors.primary.main : themedColors.text,
                    marginTop: spacing[2],
                  }}
                >
                  Lettura
                </Text>
                <Caption style={{ textAlign: 'center' }}>Studia domande e risposte</Caption>
              </TouchableOpacity>
            </View>
          </View>

          {/* Numero domande */}
          <View style={styles.section}>
            <Text variant="body" style={[styles.sectionTitle, { color: themedColors.text }]}>
              Numero di domande
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themedColors.card,
                  borderColor: themedColors.border,
                  color: themedColors.text,
                },
              ]}
              placeholder="Minimo 5 domande"
              placeholderTextColor={themedColors.textMuted}
              value={questionCount}
              onChangeText={setQuestionCount}
              keyboardType="number-pad"
            />
            <Caption style={{ marginTop: spacing[1] }}>Minimo 5 domande</Caption>
          </View>

          {/* Durata (solo quiz) */}
          {quizMode === 'quiz' && (
            <View style={styles.section}>
              <Text variant="body" style={[styles.sectionTitle, { color: themedColors.text }]}>
                Durata quiz (minuti)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themedColors.card,
                    borderColor: themedColors.border,
                    color: themedColors.text,
                  },
                ]}
                placeholder="0 = tempo illimitato"
                placeholderTextColor={themedColors.textMuted}
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
              />
              <Caption style={{ marginTop: spacing[1] }}>0 minuti = tempo illimitato</Caption>
            </View>
          )}

          {/* Distribuzione materie */}
          <View style={styles.section}>
            <Text variant="body" style={[styles.sectionTitle, { color: themedColors.text }]}>
              Materie
            </Text>
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[
                  styles.presetCard,
                  {
                    backgroundColor: preset === 'PROPORTIONAL' ? `${colors.primary.main}15` : themedColors.card,
                    borderColor: preset === 'PROPORTIONAL' ? colors.primary.main : themedColors.border,
                  },
                ]}
                onPress={() => {
                  setPreset('PROPORTIONAL');
                  setSelectedSubjectId('');
                }}
              >
                <Text style={{ fontSize: 20 }}>📊</Text>
                <Text
                  variant="caption"
                  style={{
                    fontWeight: '600',
                    color: preset === 'PROPORTIONAL' ? colors.primary.main : themedColors.text,
                    marginTop: 4,
                  }}
                >
                  Tutte
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetCard,
                  {
                    backgroundColor: preset === 'BALANCED' ? `${colors.primary.main}15` : themedColors.card,
                    borderColor: preset === 'BALANCED' ? colors.primary.main : themedColors.border,
                  },
                ]}
                onPress={() => {
                  setPreset('BALANCED');
                  setSelectedSubjectId('');
                }}
              >
                <Text style={{ fontSize: 20 }}>⚖️</Text>
                <Text
                  variant="caption"
                  style={{
                    fontWeight: '600',
                    color: preset === 'BALANCED' ? colors.primary.main : themedColors.text,
                    marginTop: 4,
                  }}
                >
                  Equo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetCard,
                  {
                    backgroundColor: preset === 'SINGLE_SUBJECT' ? `${colors.primary.main}15` : themedColors.card,
                    borderColor: preset === 'SINGLE_SUBJECT' ? colors.primary.main : themedColors.border,
                  },
                ]}
                onPress={() => setPreset('SINGLE_SUBJECT')}
              >
                <Text style={{ fontSize: 20 }}>🎯</Text>
                <Text
                  variant="caption"
                  style={{
                    fontWeight: '600',
                    color: preset === 'SINGLE_SUBJECT' ? colors.primary.main : themedColors.text,
                    marginTop: 4,
                  }}
                >
                  Una sola
                </Text>
              </TouchableOpacity>
            </View>

            <Caption style={{ marginTop: spacing[2] }}>
              {preset === 'PROPORTIONAL' && '📊 Mix di tutte le materie in base alla quantità di domande'}
              {preset === 'BALANCED' && '⚖️ Stesso numero di domande per ogni materia'}
              {preset === 'SINGLE_SUBJECT' && '🎯 Seleziona una materia specifica'}
            </Caption>

            {/* Selezione materia */}
            {preset === 'SINGLE_SUBJECT' && (
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  {
                    backgroundColor: themedColors.card,
                    borderColor: themedColors.border,
                  },
                ]}
                onPress={() => setShowSubjects(!showSubjects)}
              >
                <Text variant="body" style={{ color: selectedSubjectId ? themedColors.text : themedColors.textMuted }}>
                  {getSelectedSubjectName()}
                </Text>
                <Ionicons
                  name={showSubjects ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={themedColors.textMuted}
                />
              </TouchableOpacity>
            )}

            {preset === 'SINGLE_SUBJECT' && showSubjects && (
              <Card style={{ marginTop: spacing[2] }}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectItem,
                      {
                        backgroundColor:
                          selectedSubjectId === subject.id ? `${colors.primary.main}15` : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSelectedSubjectId(subject.id);
                      setShowSubjects(false);
                    }}
                  >
                    <Text variant="body">{subject.name}</Text>
                    {selectedSubjectId === subject.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                    )}
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>

          {/* Difficoltà */}
          <View style={styles.section}>
            <Text variant="body" style={[styles.sectionTitle, { color: themedColors.text }]}>
              Difficoltà
            </Text>
            <View style={styles.difficultyRow}>
              <TouchableOpacity
                style={[
                  styles.difficultyCard,
                  {
                    backgroundColor: difficultyMix === 'EASY_FOCUS' ? '#10B98115' : themedColors.card,
                    borderColor: difficultyMix === 'EASY_FOCUS' ? '#10B981' : themedColors.border,
                  },
                ]}
                onPress={() => setDifficultyMix('EASY_FOCUS')}
              >
                <Text style={{ fontSize: 18 }}>🟢</Text>
                <Text variant="caption" style={{ color: difficultyMix === 'EASY_FOCUS' ? '#10B981' : themedColors.text, marginTop: 2 }}>
                  Facili
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.difficultyCard,
                  {
                    backgroundColor: difficultyMix === 'MEDIUM_ONLY' ? '#3B82F615' : themedColors.card,
                    borderColor: difficultyMix === 'MEDIUM_ONLY' ? '#3B82F6' : themedColors.border,
                  },
                ]}
                onPress={() => setDifficultyMix('MEDIUM_ONLY')}
              >
                <Text style={{ fontSize: 18 }}>🔵</Text>
                <Text variant="caption" style={{ color: difficultyMix === 'MEDIUM_ONLY' ? '#3B82F6' : themedColors.text, marginTop: 2 }}>
                  Medie
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.difficultyCard,
                  {
                    backgroundColor: difficultyMix === 'HARD_FOCUS' ? '#EF444415' : themedColors.card,
                    borderColor: difficultyMix === 'HARD_FOCUS' ? '#EF4444' : themedColors.border,
                  },
                ]}
                onPress={() => setDifficultyMix('HARD_FOCUS')}
              >
                <Text style={{ fontSize: 18 }}>🔴</Text>
                <Text variant="caption" style={{ color: difficultyMix === 'HARD_FOCUS' ? '#EF4444' : themedColors.text, marginTop: 2 }}>
                  Difficili
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.difficultyCard,
                  {
                    backgroundColor: difficultyMix === 'BALANCED' ? '#F59E0B15' : themedColors.card,
                    borderColor: difficultyMix === 'BALANCED' ? '#F59E0B' : themedColors.border,
                  },
                ]}
                onPress={() => setDifficultyMix('BALANCED')}
              >
                <Text style={{ fontSize: 18 }}>⚖️</Text>
                <Text variant="caption" style={{ color: difficultyMix === 'BALANCED' ? '#F59E0B' : themedColors.text, marginTop: 2 }}>
                  Mix
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: isCreating ? themedColors.border : colors.primary.main },
            ]}
            onPress={handleGenerate}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="flash" size={22} color="#FFFFFF" />
                <Text variant="button" style={{ color: '#FFFFFF', marginLeft: spacing[2] }}>
                  {quizMode === 'reading' ? 'Inizia a Studiare' : 'Inizia Quiz'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  modeCard: {
    flex: 1,
    padding: spacing[4],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  input: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    fontSize: 16,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  presetCard: {
    flex: 1,
    padding: spacing[3],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing[3],
  },
  subjectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: layout.borderRadius.md,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  difficultyCard: {
    flex: 1,
    padding: spacing[2],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: layout.borderRadius.lg,
    marginTop: spacing[4],
  },
});
