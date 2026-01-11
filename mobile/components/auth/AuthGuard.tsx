/**
 * Leonardo School Mobile - Auth Guard Component
 * 
 * Protegge le route autenticate reindirizzando al login se non autenticato.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useSegments } from 'expo-router';

import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { useThemedColors } from '../../contexts/ThemeContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const themedColors = useThemedColors();
  const { isAuthenticated, isInitialized, isLoading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    // Aspetta che l'auth sia inizializzato
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Utente non autenticato e non nella sezione auth -> redirect al login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Utente autenticato ma ancora nella sezione auth -> redirect alla home
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, segments]);

  // Mostra loader mentre si inizializza l'auth
  if (!isInitialized || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themedColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
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
});

export default AuthGuard;
