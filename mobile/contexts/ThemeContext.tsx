/**
 * Leonardo School Mobile - Theme Context
 * 
 * Context per gestire dark/light mode nell'app.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { storage } from '../lib/storage';
import { colors, getThemedColor } from '../lib/theme/colors';
import type { ColorScheme } from '../lib/theme/colors';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  // Current active color scheme
  colorScheme: ColorScheme;
  // User preference
  themePreference: ThemePreference;
  // Is dark mode
  isDark: boolean;
  // Set theme preference
  setThemePreference: (preference: ThemePreference) => void;
  // Helper to get themed colors
  themed: <T extends { light: string; dark: string }>(colorObj: T) => string;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useNativeColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Determine actual color scheme based on preference
  const colorScheme: ColorScheme = 
    themePreference === 'system' 
      ? (systemColorScheme ?? 'light')
      : themePreference;

  const isDark = colorScheme === 'dark';

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await storage.getTheme();
        if (saved) {
          setThemePreferenceState(saved);
        }
      } catch (error) {
        console.error('[Theme] Error loading preference:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreference();
  }, []);

  // Save preference when changed
  const setThemePreference = async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    try {
      await storage.setTheme(preference);
    } catch (error) {
      console.error('[Theme] Error saving preference:', error);
    }
  };

  // Helper to get themed color
  const themed = <T extends { light: string; dark: string }>(colorObj: T): string => {
    return getThemedColor(colorObj, colorScheme);
  };

  // Don't render children until preference is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        themePreference,
        isDark,
        setThemePreference,
        themed,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook per ottenere colori comuni già tematizzati
 */
export function useThemedColors() {
  const { themed, isDark } = useTheme();
  
  return {
    isDark,
    // Background colors
    background: themed(colors.background.primary),
    backgroundSecondary: themed(colors.background.secondary),
    card: themed(colors.background.card),
    input: themed(colors.background.input),
    // Text colors
    text: themed(colors.text.primary),
    textSecondary: themed(colors.text.secondary),
    textMuted: themed(colors.text.muted),
    textInverse: themed(colors.text.inverse),
    // Border colors
    border: themed(colors.border.primary),
    borderSecondary: themed(colors.border.secondary),
    // Status colors
    success: colors.status.success.main,
    warning: colors.status.warning.main,
    error: colors.status.error.main,
    info: colors.status.info.main,
    // Primary color
    primary: colors.primary.main,
    primaryDark: colors.primary.dark,
  };
}

export default ThemeProvider;
