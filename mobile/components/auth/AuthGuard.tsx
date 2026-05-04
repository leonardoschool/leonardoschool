/**
 * Leonardo School Mobile - Auth Guard Component
 * 
 * Protegge le route autenticate reindirizzando al login se non autenticato.
 * Gestisce anche il flusso di onboarding:
 * - Profilo incompleto -> complete-profile
 * - Dati genitore richiesti -> parent-data
 * - Contratto da firmare -> pending-contract (con token)
 * - In attesa di assegnazione contratto -> pending-contract (senza token)
 * - Account attivo -> tabs (home)
 * 
 * Nota: L'account viene attivato automaticamente dopo la firma del contratto.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useSegments } from 'expo-router';

import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { useThemedColors } from '../../contexts/ThemeContext';
import { Heading3, Body } from '../ui/Text';
import { Button } from '../ui/Button';
import type { User } from '../../types';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const themedColors = useThemedColors();
  const { isAuthenticated, isInitialized, isLoading, user, logout } = useAuthStore();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Helper per reindirizzare alla schermata corretta in base allo stato utente
  const redirectToCorrectScreen = useCallback((u: User) => {
    if (u.role !== 'STUDENT') {
      // Admin/Collaboratori vanno comunque ai tabs, AuthGuard mostrerà l'errore
      router.replace('/(tabs)');
      return;
    }
    
    if (!u.profileCompleted) {
      router.replace('/(onboarding)/complete-profile');
    } else if (u.parentDataRequired) {
      router.replace('/(onboarding)/parent-data');
    } else if (u.pendingContractToken) {
      router.replace({
        pathname: '/(onboarding)/pending-contract',
        params: { token: u.pendingContractToken },
      });
    } else if (!u.isActive) {
      // User is waiting for contract assignment (no pending contract but not active)
      router.replace('/(onboarding)/pending-contract');
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  useEffect(() => {
    // Aspetta che l'auth sia inizializzato
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      // Utente non autenticato e non nella sezione auth -> redirect al login
      router.replace('/(auth)/login');
      return;
    }
    
    if (isAuthenticated && inAuthGroup) {
      // Utente autenticato ma ancora nella sezione auth -> verifica onboarding
      if (user) {
        redirectToCorrectScreen(user);
      } else {
        router.replace('/(tabs)');
      }
      return;
    }
    
    // Se siamo nei tabs e l'utente è autenticato, verifica l'onboarding
    if (isAuthenticated && inTabsGroup && user && !onboardingChecked) {
      setOnboardingChecked(true);
      
      // Se l'utente deve completare l'onboarding, reindirizza
      if (user.role === 'STUDENT') {
        if (!user.profileCompleted) {
          router.replace('/(onboarding)/complete-profile');
          return;
        }
        if (user.parentDataRequired) {
          router.replace('/(onboarding)/parent-data');
          return;
        }
        if (user.pendingContractToken) {
          router.replace({
            pathname: '/(onboarding)/pending-contract',
            params: { token: user.pendingContractToken },
          });
          return;
        }
        if (!user.isActive) {
          // User is waiting for contract assignment
          router.replace('/(onboarding)/pending-contract');
          return;
        }
      }
    }
    
    // Se siamo nella sezione onboarding, lascia passare
    if (inOnboardingGroup) {
      return;
    }
  }, [isAuthenticated, isInitialized, segments, user, onboardingChecked, redirectToCorrectScreen]);

  // Mostra loader mentre si inizializza l'auth
  if (!isInitialized || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themedColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  // Se l'utente è autenticato ma non è uno studente, mostra messaggio di errore
  if (isAuthenticated && user && user.role !== 'STUDENT') {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themedColors.background }]}>
        <View style={styles.errorContent}>
          <Heading3 style={{ color: themedColors.text, textAlign: 'center', marginBottom: 16 }}>
            App riservata agli studenti
          </Heading3>
          <Body style={{ color: themedColors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
            {user.role === 'ADMIN' && 'Questa app mobile è disponibile solo per gli studenti.\n\nGli amministratori devono utilizzare la piattaforma web per accedere al pannello di controllo.'}
            {user.role === 'COLLABORATOR' && 'Questa app mobile è disponibile solo per gli studenti.\n\nI collaboratori devono utilizzare la piattaforma web per gestire le loro attività.'}
            {user.role !== 'ADMIN' && user.role !== 'COLLABORATOR' && 'Questa app mobile è disponibile solo per gli studenti.\n\nPer accedere alla piattaforma, utilizza la versione web.'}
          </Body>
          <Button
            variant="outline"
            onPress={async () => {
              await logout();
              router.replace('/(auth)/login');
            }}
          >
            <Body style={{ color: themedColors.text }}>Esci dall&apos;account</Body>
          </Button>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
});

export default AuthGuard;
