/**
 * Leonardo School Mobile - Forgot Password Screen
 * 
 * Schermata per il recupero password.
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Heading2, Body } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useThemedColors } from '../../contexts/ThemeContext';
import { spacing, layout } from '../../lib/theme/spacing';
import { showErrorAlert, showSuccessAlert, logError, parseError } from '../../lib/errorHandler';
import { firebaseAuth } from '../../lib/firebase/auth';

export default function ForgotPasswordScreen() {
  const themedColors = useThemedColors();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('Inserisci la tua email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email non valida');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);

    try {
      await firebaseAuth.resetPassword(email.trim());
      
      showSuccessAlert(
        'Email inviata',
        'Controlla la tua casella di posta per le istruzioni sul recupero password.',
        () => router.replace('/(auth)/login')
      );
    } catch (err) {
      logError('ForgotPassword', err);
      showErrorAlert(parseError(err), 'Errore');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={themedColors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Heading2 style={styles.formTitle}>Password dimenticata?</Heading2>
            <Body color="muted" style={styles.formSubtitle}>
              Inserisci la tua email e ti invieremo le istruzioni per reimpostare la password.
            </Body>

            <Input
              label="Email"
              placeholder="La tua email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(undefined);
              }}
              error={error}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
            />

            <Button
              onPress={handleResetPassword}
              loading={isLoading}
              style={styles.submitButton}
            >
              Invia istruzioni
            </Button>

            <TouchableOpacity
              style={styles.backToLogin}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Body color="muted">
                Ricordi la password?{' '}
                <Body style={{ color: themedColors.primary, fontWeight: '600' }}>
                  Accedi
                </Body>
              </Body>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
  },
  header: {
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -spacing[2],
  },
  formContainer: {
    flex: 1,
    paddingTop: spacing[8],
  },
  formTitle: {
    marginBottom: spacing[2],
  },
  formSubtitle: {
    marginBottom: spacing[8],
    lineHeight: 22,
  },
  submitButton: {
    marginTop: spacing[4],
    borderRadius: layout.borderRadius.lg,
  },
  backToLogin: {
    marginTop: spacing[6],
    alignItems: 'center',
  },
});
