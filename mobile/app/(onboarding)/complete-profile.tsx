/**
 * Leonardo School Mobile - Complete Profile Screen
 * 
 * Schermata che informa l'utente che deve completare il profilo sulla webapp.
 * L'app mobile non supporta la modifica del profilo (troppo complesso per mobile),
 * quindi l'utente viene reindirizzato alla versione web.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Heading2, Body } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import { config } from '../../lib/config';
import { firebaseAuth } from '../../lib/firebase/auth';
import { secureStorage } from '../../lib/storage';

export default function CompleteProfileScreen() {
  const themedColors = useThemedColors();
  const { logout, user, login } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);

  // Check if profile has been completed on the webapp
  const handleCheckProfile = useCallback(async () => {
    setIsChecking(true);
    try {
      const firebaseUser = firebaseAuth.currentUser;
      if (!firebaseUser) {
        console.log('[CompleteProfile] No Firebase user');
        setIsChecking(false);
        return;
      }

      // Get fresh token
      const token = await firebaseUser.getIdToken(true);
      
      // Call /api/auth/me to get updated user data
      const response = await fetch(`${config.api.baseUrl}/api/auth/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('[CompleteProfile] User data:', userData.profileCompleted, userData.isActive);
        
        if (userData.profileCompleted) {
          // Profile is now complete! Update store and navigate
          await secureStorage.setAuthToken(token);
          await login(userData, token, undefined);
          
          // Navigate based on user state (same logic as login)
          if (userData.parentDataRequired) {
            router.replace('/(onboarding)/parent-data');
          } else if (userData.pendingContractToken) {
            router.replace({
              pathname: '/(onboarding)/pending-contract',
              params: { token: userData.pendingContractToken },
            });
          } else if (!userData.isActive) {
            // User is waiting for contract assignment
            router.replace('/(onboarding)/pending-contract');
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (error) {
      console.error('[CompleteProfile] Check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, [login]);

  // Check profile status when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, check if profile was completed
        handleCheckProfile();
      }
    });

    return () => subscription.remove();
  }, [handleCheckProfile]);

  const handleOpenWebapp = async () => {
    const url = `${config.api.baseUrl}/auth/complete-profile`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('[CompleteProfile] Failed to open URL:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <View style={styles.content}>
        {/* Icon */}
        <Animated.View 
          entering={FadeIn.delay(200).duration(600)}
          style={[styles.iconContainer, { backgroundColor: colors.status.warning.light }]}
        >
          <Ionicons 
            name="person-outline" 
            size={48} 
            color={colors.status.warning.main} 
          />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Heading2 style={[styles.title, { color: themedColors.text }]}>
            Completa il tuo profilo
          </Heading2>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Body style={[styles.description, { color: themedColors.textSecondary }]}>
            Ciao{user?.name ? ` ${user.name.split(' ')[0]}` : ''}! Prima di poter accedere all&apos;app, 
            devi completare il tuo profilo con i dati personali.
          </Body>
          <Body style={[styles.description, { color: themedColors.textSecondary, marginTop: spacing[2] }]}>
            Per completare il profilo, accedi alla piattaforma web e compila tutti i campi richiesti.
          </Body>
        </Animated.View>

        {/* Steps */}
        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={[styles.stepsContainer, { backgroundColor: themedColors.card }]}
        >
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary.main }]}>
              <Body style={styles.stepNumberText}>1</Body>
            </View>
            <Body style={{ color: themedColors.text, flex: 1 }}>
              Apri la piattaforma web Leonardo School
            </Body>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary.main }]}>
              <Body style={styles.stepNumberText}>2</Body>
            </View>
            <Body style={{ color: themedColors.text, flex: 1 }}>
              Compila tutti i campi del profilo (codice fiscale, indirizzo, ecc.)
            </Body>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary.main }]}>
              <Body style={styles.stepNumberText}>3</Body>
            </View>
            <Body style={{ color: themedColors.text, flex: 1 }}>
              Torna qui e premi &quot;Ho completato il profilo&quot;
            </Body>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(600).duration(600)}
          style={styles.buttonsContainer}
        >
          <Button
            onPress={handleOpenWebapp}
            fullWidth
            size="lg"
          >
            <View style={styles.buttonContent}>
              <Ionicons name="globe-outline" size={20} color="#FFFFFF" />
              <Body style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Apri piattaforma web
              </Body>
            </View>
          </Button>

          <Button
            variant="outline"
            onPress={handleCheckProfile}
            fullWidth
            size="lg"
            loading={isChecking}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary.main} />
              <Body style={{ color: colors.primary.main, fontWeight: '600' }}>
                Ho completato il profilo
              </Body>
            </View>
          </Button>

          <Button
            variant="ghost"
            onPress={handleLogout}
            fullWidth
          >
            <Body style={{ color: themedColors.textSecondary }}>
              Esci dall&apos;account
            </Body>
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  stepsContainer: {
    width: '100%',
    marginTop: spacing[8],
    padding: spacing[4],
    borderRadius: layout.borderRadius.lg,
    gap: spacing[4],
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
});
