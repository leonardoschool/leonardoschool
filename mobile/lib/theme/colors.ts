/**
 * Leonardo School Mobile - Sistema Colori
 * 
 * Questo file contiene i colori del tema per React Native.
 * I colori delle materie sono DINAMICI e provengono dal database (CustomSubject.color).
 * I colori statici qui sono usati solo come fallback.
 * 
 * @example
 * import { colors, generateSubjectStyles } from '@/lib/theme/colors';
 * 
 * // Per colori statici
 * <View style={{ backgroundColor: colors.primary.main }} />
 * 
 * // Per colori materie dinamiche
 * const subjectStyles = generateSubjectStyles(subject.color);
 * <View style={{ backgroundColor: subjectStyles.main }} />
 */

// ==================== UTILITY FUNCTIONS ====================

/**
 * Lightens a hex color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
  const num = Number.parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/**
 * Darkens a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const num = Number.parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/**
 * Generates subject color styles from a dynamic hex color
 * Used for CustomSubject colors from database
 */
export function generateSubjectStyles(hexColor: string | null | undefined): SubjectColors {
  const mainColor = hexColor || DEFAULT_SUBJECT_COLOR;
  return {
    main: mainColor,
    light: lightenColor(mainColor, 40),
    dark: darkenColor(mainColor, 15),
  };
}

// Default color for subjects without a color defined
const DEFAULT_SUBJECT_COLOR = '#6B7280'; // neutral gray

export const colors = {
  /**
   * Colori primari del brand Leonardo School
   * Rosso bordeaux caratteristico con varianti moderne
   */
  primary: {
    main: '#a8012b',
    dark: '#8a0125',
    light: '#d1163b',
    gradient: ['#a8012b', '#8a0125', '#a8012b'] as const,
  },

  /**
   * Sfondi e superfici
   */
  background: {
    primary: {
      light: '#FFFFFF',
      dark: '#0f172a', // slate-900
    },
    secondary: {
      light: '#F9FAFB', // gray-50
      dark: '#1e293b', // slate-800
    },
    tertiary: {
      light: '#F3F4F6', // gray-100
      dark: '#334155', // slate-700
    },
    card: {
      light: '#FFFFFF',
      dark: '#1e293b', // slate-800
    },
    input: {
      light: '#FFFFFF',
      dark: '#1e293b',
    },
  },

  /**
   * Testi
   */
  text: {
    primary: {
      light: '#111827', // gray-900
      dark: '#f1f5f9', // slate-100
    },
    secondary: {
      light: '#374151', // gray-700
      dark: '#cbd5e1', // slate-300
    },
    tertiary: {
      light: '#4B5563', // gray-600
      dark: '#94a3b8', // slate-400
    },
    muted: {
      light: '#6B7280', // gray-500
      dark: '#94a3b8', // slate-400
    },
    inverse: {
      light: '#FFFFFF',
      dark: '#0f172a',
    },
  },

  /**
   * Bordi
   */
  border: {
    primary: {
      light: '#E5E7EB', // gray-200
      dark: '#334155', // slate-700
    },
    secondary: {
      light: '#D1D5DB', // gray-300
      dark: '#475569', // slate-600
    },
    input: {
      light: '#D1D5DB', // gray-300
      dark: '#475569', // slate-600
    },
  },

  /**
   * Colori per stati e feedback
   */
  status: {
    success: {
      main: '#22C55E', // green-500
      light: '#DCFCE7', // green-50
      dark: '#16A34A', // green-600
      text: '#15803D', // green-700
    },
    warning: {
      main: '#EAB308', // yellow-500
      light: '#FEF9C3', // yellow-50
      dark: '#CA8A04', // yellow-600
      text: '#A16207', // yellow-700
    },
    error: {
      main: '#EF4444', // red-500
      light: '#FEE2E2', // red-50
      dark: '#DC2626', // red-600
      text: '#B91C1C', // red-700
    },
    info: {
      main: '#3B82F6', // blue-500
      light: '#DBEAFE', // blue-50
      dark: '#2563EB', // blue-600
      text: '#1D4ED8', // blue-700
    },
  },

  /**
   * Colori per ruoli utente
   */
  roles: {
    admin: {
      main: '#a8012b',
      light: '#FEE2E2',
      dark: '#8a0125',
    },
    collaborator: {
      main: '#9333EA', // purple-600
      light: '#F3E8FF', // purple-100
      dark: '#7C3AED', // purple-500
    },
    student: {
      main: '#059669', // emerald-600
      light: '#D1FAE5', // emerald-100
      dark: '#047857', // emerald-700
    },
  },

  /**
   * Grigi neutri
   */
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  /**
   * Colori trasparenti per overlay
   */
  overlay: {
    light: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
    subtle: 'rgba(0, 0, 0, 0.1)',
  },

  /**
   * Colori speciali
   */
  special: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
} as const;

// ==================== TYPES ====================

// Color scheme type for theming
export type ColorScheme = 'light' | 'dark';
export type SubjectColorVariant = 'main' | 'light' | 'dark';

// Subject colors interface (used for both dynamic and fallback)
export interface SubjectColors {
  main: string;
  light: string;
  dark: string;
}

// Custom subject type from database
export interface CustomSubject {
  id: string;
  name: string;
  code: string;
  color: string | null;
  icon?: string | null;
  description?: string | null;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Primary helper for dynamic subject colors from database
 * 
 * @param color - The hex color from CustomSubject.color
 * @param variant - 'main', 'light', or 'dark'
 * @returns The color string for the specified variant
 * 
 * @example
 * const subject = { name: 'Anatomia', color: '#FF5733' };
 * <View style={{ backgroundColor: getSubjectColor(subject.color) }} />
 * <View style={{ backgroundColor: getSubjectColor(subject.color, 'light') }} />
 */
export function getSubjectColor(
  color: string | null | undefined,
  variant: SubjectColorVariant = 'main'
): string {
  const styles = generateSubjectStyles(color);
  return styles[variant];
}

/**
 * Helper per ottenere colori basati sullo schema (light/dark)
 */
export function getThemedColor<T extends { light: string; dark: string }>(
  colorObj: T,
  scheme: ColorScheme
): string {
  return colorObj[scheme];
}

export default colors;
