/**
 * Leonardo School Mobile - Pending Contract Screen
 * 
 * Schermata che informa l'utente che deve firmare un contratto.
 * La firma del contratto avviene sulla webapp.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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

export default function PendingContractScreen() {
  const themedColors = useThemedColors();
  const { logout, user, login } = useAuthStore();
  const params = useLocalSearchParams<{ token?: string }>();
  const [isChecking, setIsChecking] = useState(false);

  // Determine if user has a contract to sign or is waiting for one
  const contractToken = params.token || user?.pendingContractToken;
  const hasContractToSign = !!contractToken;

  // Check contract status when app comes back to foreground
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
        console.log('[PendingContract] User data:', userData.pendingContractToken, userData.isActive);
        
        await secureStorage.setAuthToken(token);
        await login(userData, token, undefined);
        
        // Navigate based on current state
        if (userData.parentDataRequired) {
          router.replace('/(onboarding)/parent-data');
        } else if (userData.pendingContractToken) {
          // Still has a contract to sign - stay here but update the token
          // The UI will now show the "sign contract" state
        } else if (userData.isActive) {
          // Account is active, go to main app
          router.replace('/(tabs)');
        }
        // If not active and no pending contract, stay on this screen
        // The UI will show "waiting for contract assignment"
      }
    } catch (error) {
      console.error('[PendingContract] Check failed:', error);
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

  const handleOpenContract = async () => {
    if (contractToken) {
      const url = `${config.api.baseUrl}/contratto/${contractToken}`;
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error('[PendingContract] Failed to open URL:', error);
      }
    } else {
      // No contract to sign, open dashboard
      const url = `${config.api.baseUrl}/dashboard`;
      await Linking.openURL(url);
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
          style={[styles.iconContainer, { backgroundColor: hasContractToSign ? colors.status.info.light : colors.status.warning.light }]}
        >
          <Ionicons 
            name={hasContractToSign ? "document-text-outline" : "time-outline"}
            size={48} 
            color={hasContractToSign ? colors.status.info.main : colors.status.warning.main}
          />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Heading2 style={[styles.title, { color: themedColors.text }]}>
            {hasContractToSign ? 'Contratto da firmare' : 'In attesa di contratto'}
          </Heading2>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          {hasContractToSign ? (
            <>
              <Body style={[styles.description, { color: themedColors.textSecondary }]}>
                Ciao{user?.name ? ` ${user.name.split(' ')[0]}` : ''}! Prima di poter utilizzare 
                la piattaforma, devi firmare il contratto di iscrizione.
              </Body>
              <Body style={[styles.description, { color: themedColors.textSecondary, marginTop: spacing[2] }]}>
                Il contratto contiene i termini di utilizzo e le condizioni del servizio.
              </Body>
            </>
          ) : (
            <>
              <Body style={[styles.description, { color: themedColors.textSecondary }]}>
                Ciao{user?.name ? ` ${user.name.split(' ')[0]}` : ''}! Il tuo profilo è completo.
              </Body>
              <Body style={[styles.description, { color: themedColors.textSecondary, marginTop: spacing[2] }]}>
                L&apos;amministrazione sta preparando il tuo contratto di iscrizione. 
                Riceverai una notifica quando sarà pronto per la firma.
              </Body>
            </>
          )}
        </Animated.View>

        {/* Info Box */}
        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={[styles.infoBox, { backgroundColor: hasContractToSign ? colors.status.info.light : colors.status.warning.light }]}
        >
          <Ionicons 
            name="information-circle" 
            size={24} 
            color={hasContractToSign ? colors.status.info.main : colors.status.warning.main}
          />
          <Body style={[styles.infoText, { color: hasContractToSign ? colors.status.info.dark : colors.status.warning.dark }]}>
            {hasContractToSign 
              ? 'La firma avviene tramite un sistema sicuro sulla piattaforma web. Riceverai anche una copia del contratto via email.'
              : 'Questo processo potrebbe richiedere qualche ora. Nel frattempo, puoi controllare lo stato cliccando il bottone qui sotto.'}
          </Body>
        </Animated.View>

        {/* Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(600).duration(600)}
          style={styles.buttonsContainer}
        >
          {hasContractToSign ? (
            <Button
              onPress={handleOpenContract}
              fullWidth
              size="lg"
            >
              <View style={styles.buttonContent}>
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                <Body style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  Firma il contratto
                </Body>
              </View>
            </Button>
          ) : null}

          <Button
            variant={hasContractToSign ? "outline" : "primary"}
            onPress={handleCheckStatus}
            fullWidth
            size="lg"
            disabled={isChecking}
          >
            <View style={styles.buttonContent}>
              {isChecking ? (
                <Body style={{ color: hasContractToSign ? colors.primary.main : '#FFFFFF', fontWeight: '600' }}>
                  Verifico...
                </Body>
              ) : (
                <>
                  <Ionicons 
                    name={hasContractToSign ? "checkmark-circle-outline" : "refresh-outline"}
                    size={20} 
                    color={hasContractToSign ? colors.primary.main : '#FFFFFF'}
                  />
                  <Body style={{ color: hasContractToSign ? colors.primary.main : '#FFFFFF', fontWeight: '600' }}>
                    {hasContractToSign ? 'Ho firmato il contratto' : 'Controlla stato'}
                  </Body>
                </>
              )}
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
  infoBox: {
    width: '100%',
    marginTop: spacing[8],
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
