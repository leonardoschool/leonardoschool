/**
 * Leonardo School Mobile - Spacing & Layout
 * 
 * Sistema di spaziature e layout standardizzato.
 * Segue le convenzioni di spacing 4pt.
 */

export const spacing = {
  // Base spacing (4pt grid)
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

export const layout = {
  // Border radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    full: 9999,
  },

  // Common padding values
  padding: {
    screen: spacing[4], // 16px - padding per schermate
    card: spacing[4], // 16px - padding per card
    button: spacing[3], // 12px - padding per bottoni
    input: spacing[3], // 12px - padding per input
    section: spacing[6], // 24px - padding tra sezioni
  },

  // Common gap values
  gap: {
    xs: spacing[1], // 4px
    sm: spacing[2], // 8px
    md: spacing[3], // 12px
    lg: spacing[4], // 16px
    xl: spacing[6], // 24px
    '2xl': spacing[8], // 32px
  },

  // Icon sizes
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  },

  // Avatar sizes
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
    '3xl': 96,
  },

  // Button heights
  button: {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
  },

  // Input heights
  input: {
    sm: 36,
    md: 44,
    lg: 52,
  },

  // Header/Tab bar heights
  header: {
    default: 56,
    large: 96,
  },
  tabBar: {
    default: 64,
    safe: 84, // with safe area
  },
} as const;

const spacingModule = { spacing, layout };
export default spacingModule;
