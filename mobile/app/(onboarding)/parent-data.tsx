/**
 * Leonardo School Mobile - Parent Data Required Screen
 * 
 * Schermata che informa l'utente che deve inserire i dati del genitore/tutore.
 * Questo è richiesto per studenti minorenni.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, AppState, ActivityIndicator } from 'react-native';
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

export default function ParentDataScreen() {
  const themedColors = useThemedColors();
  const { logout, user, login } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);

  // Check if parent data has been added
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
        console.log('[ParentData] User data:', userData.parentDataRequired, userData.isActive);
        
        if (!userData.parentDataRequired) {
          // Parent data is no longer required!
          await secureStorage.setAuthToken(token);
          await login(userData, token, undefined);
          
          // Navigate based on remaining requirements
          if (userData.pendingContractToken) {
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
      console.error('[ParentData] Check failed:', error);
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

  const handleOpenWebapp = async () => {
    const url = `${config.api.baseUrl}/auth/complete-profile?parentData=true`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('[ParentData] Failed to open URL:', error);
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
          style={[styles.iconContainer, { backgroundColor: colors.status.info.light }]}
        >
          <Ionicons 
            name="people-outline" 
            size={48} 
            color={colors.status.info.main} 
          />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Heading2 style={[styles.title, { color: themedColors.text }]}>
            Dati genitore/tutore
          </Heading2>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Body style={[styles.description, { color: themedColors.textSecondary }]}>
            Ciao{user?.name ? ` ${user.name.split(' ')[0]}` : ''}! Poiché sei minorenne, 
            è necessario inserire i dati di un genitore o tutore legale.
          </Body>
          <Body style={[styles.description, { color: themedColors.textSecondary, marginTop: spacing[2] }]}>
            Questi dati sono richiesti per la validità del contratto di iscrizione.
          </Body>
        </Animated.View>

        {/* Info Box */}
        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={[styles.infoBox, { backgroundColor: colors.status.info.light }]}
        >
          <Ionicons name="shield-checkmark" size={24} color={colors.status.info.main} />
          <Body style={[styles.infoText, { color: colors.status.info.dark }]}>
            I dati del genitore/tutore sono trattati in conformità con la normativa 
            sulla privacy e saranno utilizzati solo per finalità contrattuali.
          </Body>
        </Animated.View>

        {/* Required Data */}
        <Animated.View 
          entering={FadeInDown.delay(550).duration(600)}
          style={[styles.dataBox, { backgroundColor: themedColors.card }]}
        >
          <Body style={[styles.dataTitle, { color: themedColors.text }]}>
            Dati richiesti:
          </Body>
          <View style={styles.dataList}>
            <View style={styles.dataItem}>
              <Ionicons name="checkmark" size={16} color={colors.primary.main} />
              <Body style={{ color: themedColors.textSecondary, fontSize: 14 }}>
                Nome e cognome
              </Body>
            </View>
            <View style={styles.dataItem}>
              <Ionicons name="checkmark" size={16} color={colors.primary.main} />
              <Body style={{ color: themedColors.textSecondary, fontSize: 14 }}>
                Codice fiscale
              </Body>
            </View>
            <View style={styles.dataItem}>
              <Ionicons name="checkmark" size={16} color={colors.primary.main} />
              <Body style={{ color: themedColors.textSecondary, fontSize: 14 }}>
                Numero di telefono
              </Body>
            </View>
            <View style={styles.dataItem}>
              <Ionicons name="checkmark" size={16} color={colors.primary.main} />
              <Body style={{ color: themedColors.textSecondary, fontSize: 14 }}>
                Indirizzo email
              </Body>
            </View>
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
                Inserisci dati genitore
              </Body>
            </View>
          </Button>

          <Button
            variant="outline"
            onPress={handleCheckStatus}
            fullWidth
            disabled={isChecking}
          >
            <View style={styles.buttonContent}>
              {isChecking ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={colors.primary.main} />
              )}
              <Body style={{ color: colors.primary.main, fontWeight: '600' }}>
                {isChecking ? 'Verifico...' : 'Ho inserito i dati'}
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
    paddingTop: spacing[10],
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
    marginTop: spacing[6],
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
  dataBox: {
    width: '100%',
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: layout.borderRadius.lg,
  },
  dataTitle: {
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  dataList: {
    gap: spacing[2],
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
