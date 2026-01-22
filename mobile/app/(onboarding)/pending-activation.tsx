/**
 * Leonardo School Mobile - Pending Activation Screen
 * 
 * Schermata che informa l'utente che il suo account è in attesa di approvazione.
 * L'admin deve attivare l'account prima che l'utente possa accedere.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
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

export default function PendingActivationScreen() {
  const themedColors = useThemedColors();
  const { logout, user, login } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);

  // Check activation status
  const handleCheckStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const firebaseUser = firebaseAuth.currentUser;
      if (!firebaseUser) {
        setIsChecking(false);
        return;
      }

      const token = await firebaseUser.getIdToken(true);
      const response = await fetch(`${config.api.baseUrl}/api/auth/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('[PendingActivation] User data:', userData.isActive);
        
        if (userData.isActive) {
          // Account is now active!
          await secureStorage.setAuthToken(token);
          await login(userData, token, undefined);
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      console.error('[PendingActivation] Check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, [login]);

  // Auto-check when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        handleCheckStatus();
      }
    });

    return () => subscription.remove();
  }, [handleCheckStatus]);

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
            name="hourglass-outline" 
            size={48} 
            color={colors.status.warning.main} 
          />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Heading2 style={[styles.title, { color: themedColors.text }]}>
            Account in attesa
          </Heading2>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Body style={[styles.description, { color: themedColors.textSecondary }]}>
            Ciao{user?.name ? ` ${user.name.split(' ')[0]}` : ''}! Il tuo account è in attesa 
            di approvazione da parte dell&apos;amministratore.
          </Body>
          <Body style={[styles.description, { color: themedColors.textSecondary, marginTop: spacing[2] }]}>
            Riceverai una notifica email quando il tuo account sarà attivato.
          </Body>
        </Animated.View>

        {/* Status Box */}
        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={[styles.statusBox, { backgroundColor: themedColors.card, borderColor: themedColors.border }]}
        >
          <View style={styles.statusRow}>
            <Body style={{ color: themedColors.textSecondary }}>Stato account</Body>
            <View style={[styles.statusBadge, { backgroundColor: colors.status.warning.light }]}>
              <Ionicons name="time" size={14} color={colors.status.warning.main} />
              <Body style={[styles.statusText, { color: colors.status.warning.dark }]}>
                In attesa
              </Body>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: themedColors.border }]} />
          <View style={styles.statusRow}>
            <Body style={{ color: themedColors.textSecondary }}>Profilo completato</Body>
            <View style={[styles.statusBadge, { backgroundColor: colors.status.success.light }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.status.success.main} />
              <Body style={[styles.statusText, { color: colors.status.success.dark }]}>
                Completato
              </Body>
            </View>
          </View>
        </Animated.View>

        {/* Info */}
        <Animated.View 
          entering={FadeInDown.delay(550).duration(600)}
          style={[styles.infoBox, { backgroundColor: colors.status.info.light }]}
        >
          <Ionicons name="information-circle" size={24} color={colors.status.info.main} />
          <Body style={[styles.infoText, { color: colors.status.info.dark }]}>
            Se hai già ricevuto conferma dell&apos;attivazione, prova ad effettuare nuovamente l&apos;accesso.
          </Body>
        </Animated.View>

        {/* Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(600).duration(600)}
          style={styles.buttonsContainer}
        >
          <Button
            onPress={handleCheckStatus}
            fullWidth
            size="lg"
            loading={isChecking}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              <Body style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Verifica attivazione
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
  statusBox: {
    width: '100%',
    marginTop: spacing[8],
    padding: spacing[4],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  divider: {
    height: 1,
    marginVertical: spacing[2],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: layout.borderRadius.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    width: '100%',
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: layout.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
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
