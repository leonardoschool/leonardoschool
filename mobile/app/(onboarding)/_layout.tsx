/**
 * Leonardo School Mobile - Onboarding Layout
 * 
 * Layout per le schermate di onboarding (profilo, contratto, attesa attivazione).
 * Queste schermate sono mostrate dopo la login quando l'utente non ha completato
 * tutti i passaggi necessari per accedere all'app.
 */

import { Stack } from 'expo-router';
import { useThemedColors } from '../../contexts/ThemeContext';

export default function OnboardingLayout() {
  const themedColors = useThemedColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: themedColors.background,
        },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="complete-profile" />
      <Stack.Screen name="pending-contract" />
      <Stack.Screen name="pending-activation" />
      <Stack.Screen name="parent-data" />
    </Stack>
  );
}
