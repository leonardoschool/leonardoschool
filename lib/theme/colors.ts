/**
 * Leonardo School - Sistema Colori Centralizzato
 * 
 * Questo file contiene tutti i colori brand utilizzati nell'applicazione.
 * Supporta automaticamente light/dark mode basato sulle preferenze del browser.
 * 
 * Dark Mode: Design moderno con sfondo slate/zinc scuro e accenti rosso bordeaux
 * 
 * @example
 * import { colors } from '@/lib/theme/colors';
 * 
 * <div className={colors.primary.gradient} />
 * <h1 className={colors.subjects.chimica.bg} />
 * <div className={colors.background.primary} /> // Si adatta automaticamente al tema
 */

export const colors = {
  /**
   * Colori primari del brand Leonardo School
   * Rosso bordeaux caratteristico con varianti moderne
   */
  primary: {
    // Gradiente principale header/footer (adattativo)
    gradient: 'bg-gradient-to-r from-[#a8012b] via-[#8a0125] to-[#a8012b]',
    gradientText: 'bg-gradient-to-r from-[#a8012b] via-[#8a0125] to-[#a8012b] bg-clip-text text-transparent',
    gradientWithOpacity: 'bg-gradient-to-r from-[#a8012b]/95 via-[#8a0125]/95 to-[#a8012b]/95',
    
    // Varianti solide
    main: '#a8012b',
    dark: '#8a0125',
    light: '#a8012b',
    
    // Classi Tailwind utility
    bg: 'bg-[#a8012b] dark:bg-[#a8012b]',
    bgDark: 'bg-[#8a0125]',
    text: 'text-[#a8012b]',
    textHover: 'hover:text-[#8a0125] dark:hover:text-[#d1163b]',
    border: 'border-[#a8012b]',
    hover: 'hover:bg-[#8a0125]',
    
    // Gradiente per elementi decorativi
    accentGradient: 'bg-gradient-to-r from-red-500 to-red-600',
    accentBar: 'from-[#a8012b] to-red-400',
  },

  /**
   * Colori per materie scientifiche
   * Utilizzati nelle card materie, badge, etc.
   */
  subjects: {
    matematica: {
      main: '#D54F8A',
      bg: 'bg-[#D54F8A]',
      text: 'text-[#D54F8A]',
      border: 'border-[#D54F8A]',
      hover: 'hover:bg-[#D54F8A]',
      shadow: 'shadow-[#D54F8A]/20',
      glow: 'bg-[#D54F8A] rounded-full blur-[100px] opacity-10',
    },
    
    biologia: {
      main: '#68BCE8',
      bg: 'bg-[#68BCE8]',
      text: 'text-[#68BCE8]',
      border: 'border-[#68BCE8]',
      hover: 'hover:bg-[#68BCE8]',
      shadow: 'shadow-[#68BCE8]/20',
      glow: 'bg-[#68BCE8] rounded-full blur-[120px] opacity-15',
    },
    
    chimica: {
      main: '#42BFED',
      bg: 'bg-[#42BFED]',
      text: 'text-[#42BFED]',
      border: 'border-[#42BFED]',
      hover: 'hover:bg-[#5AACDB]',
      shadow: 'shadow-[#42BFED]/20',
    },
    
    fisica: {
      main: '#EEB550',
      bg: 'bg-[#EEB550]',
      text: 'text-[#EEB550]',
      border: 'border-[#EEB550]',
      hover: 'hover:bg-[#EEB550]',
      shadow: 'shadow-[#EEB550]/20',
      glow: 'bg-[#EEB550] rounded-full blur-[110px] opacity-10',
    },
    
    logica: {
      main: '#B6B21D',
      bg: 'bg-[#B6B21D]',
      text: 'text-[#B6B21D]',
      border: 'border-[#B6B21D]',
      hover: 'hover:bg-[#A5A238]',
      shadow: 'shadow-[#B6B21D]/20',
      // Variante più chiara per simboli
      lightSymbol: 'text-[#B5B240]',
    },
    
    culturaGenerale: {
      main: '#E7418B',
      bg: 'bg-[#E7418B]',
      text: 'text-[#E7418B]',
      border: 'border-[#E7418B]',
      hover: 'hover:bg-[#C4407A]',
      shadow: 'shadow-[#E7418B]/20',
    },
    
    // Test universitari specifici
    hunimed: {
      main: '#19419B',
      bg: 'bg-[#19419B]',
      text: 'text-[#19419B]',
      border: 'border-[#19419B]',
    },
    
    medicina: {
      main: '#EB635B',
      bg: 'bg-[#EB635B]',
      text: 'text-[#EB635B]',
      border: 'border-[#EB635B]',
    },
  },

  /**
   * Sfondi e superfici
   * Design moderno: Light usa bianchi/grigi chiari, Dark usa slate scuro (#0f172a, #1e293b)
   */
  background: {
    // Sfondi principali
    primary: 'bg-white dark:bg-slate-900',
    secondary: 'bg-gray-50 dark:bg-slate-800',
    tertiary: 'bg-gray-100 dark:bg-slate-700',
    
    // Auth pages
    authPage: 'bg-gray-50 dark:bg-slate-900',
    
    // Cards e pannelli
    card: 'bg-white dark:bg-slate-800',
    cardHover: 'hover:bg-gray-50 dark:hover:bg-slate-700',
    
    // Input fields
    input: 'bg-white dark:bg-slate-800',
    inputFocus: 'focus:bg-white dark:focus:bg-slate-750',
  },

  /**
   * Testi adattativi
   * Light: grigi scuri, Dark: grigi chiari/slate
   */
  text: {
    primary: 'text-gray-900 dark:text-slate-100',
    secondary: 'text-gray-600 dark:text-slate-400',
    tertiary: 'text-gray-500 dark:text-slate-500',
    muted: 'text-gray-400 dark:text-slate-600',
    
    // Inverso (per sfondi scuri in light mode)
    inverse: 'text-white dark:text-slate-900',
  },

  /**
   * Bordi adattativi
   * Light: grigi chiari, Dark: slate medio
   */
  border: {
    primary: 'border-gray-200 dark:border-slate-700',
    secondary: 'border-gray-300 dark:border-slate-600',
    focus: 'focus:border-[#a8012b] dark:focus:border-[#a8012b]',
    hover: 'hover:border-gray-400 dark:hover:border-slate-500',
  },

  /**
   * Colori neutrali per UI (DEPRECATED - usa background/text/border invece)
   * Mantenuti per backward compatibility
   */
  neutral: {
    // Sfondi adattativi
    background: 'bg-white dark:bg-gray-900',
    backgroundSecondary: 'bg-gray-50 dark:bg-gray-800',
    
    // Testi adattativi
    textPrimary: 'text-gray-900 dark:text-gray-100',
    textSecondary: 'text-gray-600 dark:text-gray-400',
    
    // Bordi adattativi
    borderPrimary: 'border-gray-200 dark:border-gray-700',
    borderSecondary: 'border-gray-300 dark:border-gray-600',
    
    // Classi legacy (da deprecare gradualmente)
    white: 'bg-white dark:bg-gray-900',
    black: 'bg-black dark:bg-gray-950',
    
    gray: {
      50: 'bg-gray-50 dark:bg-gray-900',
      100: 'bg-gray-100 dark:bg-gray-800',
      300: 'bg-gray-300 dark:bg-gray-700',
      600: 'bg-gray-600 dark:bg-gray-400',
      700: 'bg-gray-700 dark:bg-gray-300',
      900: 'bg-gray-900 dark:bg-gray-100',
    },
    
    text: {
      white: 'text-white dark:text-gray-100',
      black: 'text-black dark:text-gray-100',
      gray300: 'text-gray-300 dark:text-gray-700',
      gray600: 'text-gray-600 dark:text-gray-400',
      gray700: 'text-gray-700 dark:text-gray-300',
      gray900: 'text-gray-900 dark:text-gray-100',
    },
    
    border: {
      gray100: 'border-gray-100 dark:border-gray-800',
      gray600: 'border-gray-600 dark:border-gray-400',
    },
  },

  /**
   * Effetti shadow e hover
   * Per card, bottoni e elementi interattivi
   * Si adattano automaticamente al tema
   */
  effects: {
    shadow: {
      sm: 'shadow-sm dark:shadow-slate-900/50',
      md: 'shadow-md dark:shadow-slate-900/60',
      lg: 'shadow-lg dark:shadow-slate-900/70',
      xl: 'shadow-xl dark:shadow-2xl dark:shadow-slate-900/80',
      '2xl': 'shadow-2xl dark:shadow-slate-900/90',
      gray600: 'shadow-gray-600/50 dark:shadow-slate-900/70',
    },
    
    hover: {
      translateY: 'hover:-translate-y-2',
      shadow: 'hover:shadow-2xl dark:hover:shadow-slate-900/70',
      textRed: 'hover:text-red-600 dark:hover:text-red-400',
      bg: 'hover:bg-gray-50 dark:hover:bg-slate-700',
    },
    
    // Gradiente per card interattive prove
    activeGradient: 'bg-gradient-to-r from-[#4565B0] to-[#4565B0] text-white shadow-xl shadow-gray-600/50 dark:from-[#5a7dd8] dark:to-[#5a7dd8] dark:shadow-slate-900/70',
    
    // Card e pannelli (ALIAS per background.card)
    cardBackground: 'bg-white dark:bg-slate-800',
    cardBorder: 'border border-gray-200 dark:border-slate-700',
    
    // Transizioni
    transition: 'transition-colors duration-300',
  },

  /**
   * Colori per stati e feedback
   * Success, warning, error, info
   * Con supporto dark mode moderno
   */
  status: {
    success: {
      bg: 'bg-green-500 dark:bg-green-600',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-500 dark:border-green-600',
      bgLight: 'bg-green-50 dark:bg-green-950/30',
    },
    warning: {
      bg: 'bg-yellow-500 dark:bg-yellow-600',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-500 dark:border-yellow-600',
      bgLight: 'bg-yellow-50 dark:bg-yellow-950/30',
    },
    error: {
      bg: 'bg-red-500 dark:bg-red-600',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-500 dark:border-red-600',
      bgLight: 'bg-red-50 dark:bg-red-950/30',
    },
    info: {
      bg: 'bg-blue-500 dark:bg-blue-600',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-500 dark:border-blue-600',
      bgLight: 'bg-blue-50 dark:bg-blue-950/30',
    },
  },

  /**
   * Colori per validazione form
   * Utilizzati per feedback visivo su email, password, etc.
   */
  validation: {
    error: {
      border: 'border-red-500 dark:border-red-400',
      text: 'text-red-500 dark:text-red-400',
      bg: 'bg-red-500 dark:bg-red-600',
    },
    success: {
      text: 'text-green-500 dark:text-green-400',
      bg: 'bg-green-500 dark:bg-green-600',
    },
    warning: {
      text: 'text-orange-500 dark:text-orange-400',
      bg: 'bg-orange-500 dark:bg-orange-600',
    },
    // Password strength colors
    strength: {
      veryWeak: {
        text: 'text-red-500 dark:text-red-400',
        bg: 'bg-red-500 dark:bg-red-600',
      },
      weak: {
        text: 'text-orange-500 dark:text-orange-400',
        bg: 'bg-orange-500 dark:bg-orange-600',
      },
      medium: {
        text: 'text-yellow-500 dark:text-yellow-400',
        bg: 'bg-yellow-500 dark:bg-yellow-600',
      },
      strong: {
        text: 'text-green-500 dark:text-green-400',
        bg: 'bg-green-500 dark:bg-green-600',
      },
      veryStrong: {
        text: 'text-emerald-500 dark:text-emerald-400',
        bg: 'bg-emerald-500 dark:bg-emerald-600',
      },
    },
  },
} as const;

/**
 * Helper function per ottenere il colore di una materia dinamicamente
 * @example
 * const colorClass = getSubjectColor('MATEMATICA', 'bg');
 */
export function getSubjectColor(
  subject: 'MATEMATICA' | 'BIOLOGIA' | 'CHIMICA' | 'FISICA' | 'LOGICA' | 'CULTURA_GENERALE',
  variant: 'bg' | 'text' | 'border' | 'hover' | 'main' = 'bg'
) {
  const mapping = {
    MATEMATICA: colors.subjects.matematica,
    BIOLOGIA: colors.subjects.biologia,
    CHIMICA: colors.subjects.chimica,
    FISICA: colors.subjects.fisica,
    LOGICA: colors.subjects.logica,
    CULTURA_GENERALE: colors.subjects.culturaGenerale,
  };

  return mapping[subject]?.[variant] || colors.neutral.gray[600];
}

/**
 * Export singolo per backward compatibility
 */
export default colors;
