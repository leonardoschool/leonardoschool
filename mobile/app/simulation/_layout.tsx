/**
 * Leonardo School Mobile - Simulation Stack Layout
 * 
 * Layout per le schermate di esecuzione simulazione.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { useThemedColors } from '../../contexts/ThemeContext';
import { colors } from '../../lib/theme/colors';

export default function SimulationLayout() {
  const themedColors = useThemedColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: themedColors.card,
        },
        headerTitleStyle: {
          color: themedColors.text,
          fontWeight: '600',
        },
        headerTintColor: colors.primary.main,
        headerShadowVisible: false,
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="[id]/index"
        options={{
          title: 'Simulazione',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/result"
        options={{
          title: 'Risultati',
          headerBackTitle: 'Indietro',
        }}
      />
    </Stack>
  );
}
