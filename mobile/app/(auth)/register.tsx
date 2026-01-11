/**
 * Leonardo School Mobile - Register Screen
 * 
 * Schermata di registrazione nuovo account.
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

import { Text, Heading2, Body } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useThemedColors } from '../../contexts/ThemeContext';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import { showErrorAlert, showSuccessAlert, logError, parseError } from '../../lib/errorHandler';
import { firebaseAuth } from '../../lib/firebase/auth';
import { config } from '../../lib/config';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const themedColors = useThemedColors();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ['Molto debole', 'Debole', 'Discreta', 'Buona', 'Ottima'];
  const strengthColors = [
    colors.status.error.main,
    colors.status.warning.main,
    colors.status.warning.main,
    colors.status.success.main,
    colors.status.success.main,
  ];

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Inserisci il tuo nome';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Il nome deve avere almeno 2 caratteri';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Inserisci la tua email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Inserisci una password';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La password deve avere almeno 8 caratteri';
    } else if (passwordStrength < 2) {
      newErrors.password = 'La password è troppo debole';
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Conferma la password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Le password non coincidono';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) return;

    if (!acceptedTerms) {
      showErrorAlert('Devi accettare i termini e condizioni per continuare');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Register with Firebase
      const userCredential = await firebaseAuth.register(
        formData.email, 
        formData.password, 
        formData.name
      );
      const firebaseUser = userCredential.user;
      
      // 2. Send email verification
      await firebaseAuth.sendVerificationEmail();
      
      // 3. Get Firebase ID token
      const token = await firebaseUser.getIdToken();
      
      // 4. Sync with backend to create user in PostgreSQL
      const response = await fetch(`${config.api.baseUrl}/api/auth/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.warn('[Register] Backend sync failed, but Firebase account created');
      }
      
      // 5. Logout (user needs to verify email first)
      await firebaseAuth.logout();
      
      showSuccessAlert(
        'Registrazione completata',
        'Ti abbiamo inviato una email di verifica. Controlla la tua casella di posta e poi accedi.',
        () => router.replace('/(auth)/login')
      );
    } catch (error) {
      logError('Register', error);
      showErrorAlert(parseError(error), 'Errore di registrazione');
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
            <Heading2 style={styles.formTitle}>Crea un account</Heading2>
            <Body color="muted" style={styles.formSubtitle}>
              Registrati per iniziare a prepararti
            </Body>

            <Input
              label="Nome completo"
              placeholder="Mario Rossi"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              error={errors.name}
              autoCapitalize="words"
              autoComplete="name"
              leftIcon="person-outline"
            />

            <Input
              label="Email"
              placeholder="mario.rossi@email.com"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
            />

            <Input
              label="Password"
              placeholder="Crea una password sicura"
              value={formData.password}
              onChangeText={(text) => updateField('password', text)}
              error={errors.password}
              secureTextEntry
              autoComplete="new-password"
              leftIcon="lock-closed-outline"
            />

            {/* Password strength indicator */}
            {formData.password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            index < passwordStrength
                              ? strengthColors[passwordStrength - 1]
                              : themedColors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  variant="caption"
                  style={{ color: strengthColors[passwordStrength - 1] || themedColors.textMuted }}
                >
                  {formData.password.length > 0 && strengthLabels[passwordStrength - 1]}
                </Text>
              </View>
            )}

            <Input
              label="Conferma password"
              placeholder="Ripeti la password"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              error={errors.confirmPassword}
              secureTextEntry
              autoComplete="new-password"
              leftIcon="lock-closed-outline"
            />

            {/* Terms checkbox */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: acceptedTerms ? colors.primary.main : 'transparent',
                    borderColor: acceptedTerms ? colors.primary.main : themedColors.border,
                  },
                ]}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text variant="bodySmall" color="muted" style={styles.termsText}>
                Accetto i{' '}
                <Text variant="bodySmall" style={{ color: colors.primary.main }}>
                  Termini e Condizioni
                </Text>
                {' '}e la{' '}
                <Text variant="bodySmall" style={{ color: colors.primary.main }}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            <Button
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              size="lg"
              style={styles.registerButton}
              disabled={!acceptedTerms}
            >
              Registrati
            </Button>

            <View style={styles.loginContainer}>
              <Text variant="body" color="muted">
                Hai già un account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text variant="body" style={{ color: colors.primary.main, fontWeight: '600' }}>
                  Accedi
                </Text>
              </TouchableOpacity>
            </View>
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
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    flex: 1,
    padding: spacing[6],
  },
  formTitle: {
    marginBottom: spacing[1],
  },
  formSubtitle: {
    marginBottom: spacing[6],
  },
  strengthContainer: {
    marginTop: -spacing[2],
    marginBottom: spacing[4],
  },
  strengthBars: {
    flexDirection: 'row',
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
    marginTop: spacing[2],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: layout.borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
    marginTop: 2,
  },
  termsText: {
    flex: 1,
  },
  registerButton: {
    marginBottom: spacing[6],
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
