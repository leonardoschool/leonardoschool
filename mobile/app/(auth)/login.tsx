/**
 * Leonardo School Mobile - Login Screen
 * 
 * Schermata di login moderna con design professionale.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

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

// Import logo
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoImage = require('../../assets/images/icon.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Decorative floating circles for modern look
const FloatingCircle = ({ size, delay, x, y }: { size: number; delay: number; x: number; y: number }) => {
  const translateY = useSharedValue(0);
  
  useEffect(() => {
    // Use requestAnimationFrame to avoid the React strict mode warning
    const timeoutId = setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(15, { duration: 3000 + delay, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          left: x,
          top: y,
        },
        animatedStyle,
      ]}
    />
  );
};

export default function LoginScreen() {
  const themedColors = useThemedColors();
  const { login, logout } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Inserisci la tua email';
    } else {
      // Validate email structure without slow regex
      const trimmedEmail = email.trim();
      const atIndex = trimmedEmail.indexOf('@');
      const dotIndex = trimmedEmail.lastIndexOf('.');
      const isValid = atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < trimmedEmail.length - 1 && !trimmedEmail.includes(' ');
      if (!isValid) {
        newErrors.email = 'Email non valida';
      }
    }

    /* eslint-disable sonarjs/no-hardcoded-passwords -- These are error message assignments, not passwords */
    if (!password) {
      newErrors.password = 'Inserisci la password';
    } else if (password.length < 6) {
      newErrors.password = 'La password deve avere almeno 6 caratteri';
    }
    /* eslint-enable sonarjs/no-hardcoded-passwords */

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Login with Firebase
      console.log('[Login] Starting Firebase login...');
      const userCredential = await firebaseAuth.login(email, password);
      const firebaseUser = userCredential.user;
      console.log('[Login] Firebase login successful, UID:', firebaseUser.uid);
      
      // 2. Get Firebase ID token
      const token = await firebaseUser.getIdToken();
      console.log('[Login] Got ID token, length:', token.length);
      
      // 3. Sync with backend (PostgreSQL) - call /api/auth/me
      console.log('[Login] Calling backend:', `${config.api.baseUrl}/api/auth/me`);
      const response = await fetch(`${config.api.baseUrl}/api/auth/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      console.log('[Login] Backend response status:', response.status);
      const responseText = await response.text();
      console.log('[Login] Backend response body:', responseText.substring(0, 500));
      
      if (!response.ok) {
        let errorMessage = `Errore dal server: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Ignore parse errors
        }
        throw new Error(errorMessage);
      }
      
      // La risposta contiene i dati utente direttamente
      const user = JSON.parse(responseText);
      console.log('[Login] Parsed user:', user.name, user.role, 'profileCompleted:', user.profileCompleted, 'isActive:', user.isActive, 'parentDataRequired:', user.parentDataRequired, 'pendingContractToken:', user.pendingContractToken);
      
      // Salva l'utente nello store (serve per le schermate di onboarding)
      await login(user, token, undefined);
      
      // ONBOARDING FLOW - Segui esattamente l'ordine della webapp (proxy.ts)
      
      // 1. Solo gli studenti possono usare l'app mobile
      if (user.role !== 'STUDENT') {
        // Admin e collaboratori devono usare la webapp
        showErrorAlert('L\'app mobile è disponibile solo per gli studenti. Usa la piattaforma web.');
        await logout();
        return;
      }
      
      // 2. Controlla se il profilo è completato
      if (!user.profileCompleted) {
        console.log('[Login] Profile not completed, redirecting to complete-profile');
        router.replace('/(onboarding)/complete-profile');
        return;
      }
      
      // 3. Controlla se ci sono dati del genitore richiesti (minorenne)
      // Questo ha priorità sul contratto secondo la logica webapp
      if (user.parentDataRequired) {
        console.log('[Login] Parent data required, redirecting to parent-data');
        router.replace('/(onboarding)/parent-data');
        return;
      }
      
      // 4. Controlla se c'è un contratto da firmare
      // Se c'è un pendingContractToken, l'utente DEVE firmare prima di accedere
      if (user.pendingContractToken) {
        console.log('[Login] Pending contract, redirecting to pending-contract');
        router.replace({
          pathname: '/(onboarding)/pending-contract',
          params: { token: user.pendingContractToken },
        });
        return;
      }
      
      // 5. Se l'account non è attivo e non ha contratto pendente,
      // l'utente sta aspettando che l'admin assegni un contratto
      // Mostriamo la schermata di attesa contratto (senza token)
      if (!user.isActive) {
        console.log('[Login] Account not active, no pending contract - waiting for contract assignment');
        router.replace('/(onboarding)/pending-contract');
        return;
      }
      
      // 6. Tutto ok, vai alla home
      console.log('[Login] All checks passed, navigating to tabs');
      router.replace('/(tabs)');
      
    } catch (error) {
      logError('Login', error);
      showErrorAlert(parseError(error), 'Errore di accesso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Modern Header with gradient and decorations */}
          <LinearGradient
            colors={[colors.primary.main, colors.primary.dark, '#6B0F2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {/* Floating decorative circles */}
            <FloatingCircle size={120} delay={0} x={-30} y={20} />
            <FloatingCircle size={80} delay={500} x={SCREEN_WIDTH - 60} y={60} />
            <FloatingCircle size={50} delay={1000} x={SCREEN_WIDTH / 2 - 25} y={-10} />
            <FloatingCircle size={40} delay={750} x={50} y={150} />
            <FloatingCircle size={60} delay={250} x={SCREEN_WIDTH - 100} y={180} />

            <SafeAreaView edges={['top']} style={styles.headerContent}>
              {/* Logo */}
              <Animated.View 
                entering={FadeIn.delay(200).duration(800)}
                style={styles.logoWrapper}
              >
                <Image
                  source={logoImage}
                  style={styles.logo}
                  resizeMode="contain"
                  alt="Leonardo School Logo"
                />
              </Animated.View>

              {/* Welcome text */}
              <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.welcomeContainer}>
                <Text style={styles.welcomeText}>Bentornato!</Text>
              </Animated.View>
            </SafeAreaView>

            {/* Curved bottom edge */}
            <View style={styles.curvedEdge}>
              <View style={[styles.curvedEdgeInner, { backgroundColor: themedColors.background }]} />
            </View>
          </LinearGradient>

          {/* Login form */}
          <Animated.View 
            entering={FadeInDown.delay(500).duration(600)}
            style={[styles.formContainer, { backgroundColor: themedColors.background }]}
          >
            <View style={styles.formHeader}>
              <View style={styles.formTitleRow}>
                <View style={styles.formTitleIndicator} />
                <Heading2>Accedi</Heading2>
              </View>
              <Body color="muted">
                Inserisci le tue credenziali
              </Body>
            </View>

            <View style={styles.inputsContainer}>
              <Input
                label="Email"
                placeholder="nome@esempio.com"
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
                placeholder="••••••••"
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
                <Text variant="bodySmall" style={{ color: colors.primary.main, fontWeight: '500' }}>
                  Password dimenticata?
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="lg"
              style={styles.loginButton}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Accedi</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
            </Button>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: themedColors.border }]} />
              <Text variant="bodySmall" color="muted" style={styles.dividerText}>
                oppure
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: themedColors.border }]} />
            </View>

            {/* Register link */}
            <View style={styles.registerContainer}>
              <Text variant="body" color="muted">
                Non hai ancora un account?
              </Text>
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/register')}
                style={styles.registerButton}
              >
                <Text style={styles.registerText}>
                  Registrati ora
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary.main} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    height: SCREEN_HEIGHT * 0.30,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  logoWrapper: {
    marginBottom: spacing[4],
  },
  logo: {
    width: 100,
    height: 100,
  },
  welcomeContainer: {
    paddingHorizontal: spacing[4],
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  welcomeSubtext: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  curvedEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    overflow: 'hidden',
  },
  curvedEdgeInner: {
    width: SCREEN_WIDTH * 1.5,
    height: 60,
    borderTopLeftRadius: SCREEN_WIDTH,
    borderTopRightRadius: SCREEN_WIDTH,
    alignSelf: 'center',
    marginTop: 0,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
    marginTop: -spacing[4],
  },
  formHeader: {
    marginBottom: spacing[6],
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  formTitleIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: colors.primary.main,
  },
  inputsContainer: {
    gap: spacing[1],
    marginBottom: spacing[4],
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: spacing[2],
  },
  loginButton: {
    marginBottom: spacing[5],
    borderRadius: layout.borderRadius.xl,
    height: 56,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: spacing[4],
  },
  registerContainer: {
    alignItems: 'center',
    gap: spacing[2],
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: layout.borderRadius.lg,
    backgroundColor: `${colors.primary.main}10`,
  },
  registerText: {
    color: colors.primary.main,
    fontWeight: '600',
    fontSize: 15,
  },
});
