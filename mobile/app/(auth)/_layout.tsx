/**
 * Leonardo School Mobile - Auth Layout
 * 
 * Layout per le schermate di autenticazione.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../lib/theme/colors';

export default function AuthLayout() {
  const { isDark } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark 
            ? colors.background.primary.dark 
            : colors.background.primary.light,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="complete-profile" />
    </Stack>
  );
}
