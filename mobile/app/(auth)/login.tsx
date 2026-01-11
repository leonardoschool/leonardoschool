/**
 * Leonardo School Mobile - Login Screen
 * 
 * Schermata di login con email e password.
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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, Heading2, Body } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import { showErrorAlert, logError, parseError } from '../../lib/errorHandler';
import { firebaseAuth } from '../../lib/firebase/auth';
import { config } from '../../lib/config';

export default function LoginScreen() {
  const themedColors = useThemedColors();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Inserisci la tua email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email non valida';
    }

    if (!password) {
      newErrors.password = 'Inserisci la password';
    } else if (password.length < 6) {
      newErrors.password = 'La password deve avere almeno 6 caratteri';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Login with Firebase
      const userCredential = await firebaseAuth.login(email, password);
      const firebaseUser = userCredential.user;
      
      // 2. Get Firebase ID token
      const token = await firebaseUser.getIdToken();
      
      // 3. Sync with backend (PostgreSQL) - call /api/auth/me
      const response = await fetch(`${config.api.baseUrl}/api/auth/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Errore durante la sincronizzazione');
      }
      
      const data = await response.json();
      
      // 4. Check if profile is completed
      if (!data.user.profileCompleted) {
        // User needs to complete profile
        showErrorAlert('Per favore completa il tuo profilo nella webapp.');
        await firebaseAuth.logout();
        return;
      }
      
      // 5. Check if account is active
      if (!data.user.isActive) {
        showErrorAlert('Il tuo account è in attesa di approvazione.');
        await firebaseAuth.logout();
        return;
      }
      
      // 6. Save to auth store and navigate
      await login(data.user, token, data.studentProfile);
      router.replace('/(tabs)');
      
    } catch (error) {
      logError('Login', error);
      showErrorAlert(parseError(error), 'Errore di accesso');
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
          {/* Header with gradient */}
          <LinearGradient
            colors={[colors.primary.main, colors.primary.dark]}
            style={styles.header}
          >
            {/* Logo placeholder */}
            <View style={styles.logoContainer}>
              <Text variant="h1" style={styles.logoText}>LS</Text>
            </View>
            <Text variant="h3" style={styles.brandName}>Leonardo School</Text>
            <Text variant="body" style={styles.tagline}>
              Preparati ai test universitari
            </Text>
          </LinearGradient>

          {/* Login form */}
          <View style={styles.formContainer}>
            <Heading2 style={styles.formTitle}>Accedi</Heading2>
            <Body color="muted" style={styles.formSubtitle}>
              Inserisci le tue credenziali per continuare
            </Body>

            <Input
              label="Email"
              placeholder="La tua email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
            />

            <Input
              label="Password"
              placeholder="La tua password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              secureTextEntry
              autoComplete="password"
              leftIcon="lock-closed-outline"
            />

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text variant="bodySmall" color="primary" style={{ color: colors.primary.main }}>
                Password dimenticata?
              </Text>
            </TouchableOpacity>

            <Button
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="lg"
              style={styles.loginButton}
            >
              Accedi
            </Button>

            <View style={styles.registerContainer}>
              <Text variant="body" color="muted">
                Non hai un account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text variant="body" style={{ color: colors.primary.main, fontWeight: '600' }}>
                  Registrati
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
    paddingTop: spacing[16],
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    borderBottomLeftRadius: layout.borderRadius['3xl'],
    borderBottomRightRadius: layout.borderRadius['3xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: layout.borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  brandName: {
    color: '#FFFFFF',
    marginBottom: spacing[1],
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formContainer: {
    flex: 1,
    padding: spacing[6],
    paddingTop: spacing[8],
  },
  formTitle: {
    marginBottom: spacing[1],
  },
  formSubtitle: {
    marginBottom: spacing[6],
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing[6],
    marginTop: -spacing[2],
  },
  loginButton: {
    marginBottom: spacing[6],
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
