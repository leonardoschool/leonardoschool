/**
 * Leonardo School Mobile - Theme Index
 * 
 * Esporta tutti i moduli del tema per uso centralizzato.
 * 
 * NOTA: Le materie sono ora dinamiche e vengono dal database.
 * Usare generateSubjectStyles(color) per generare i colori delle materie.
 * Le funzioni legacy sono disponibili per compatibilità.
 */

export { 
  colors, 
  getSubjectColor, 
  generateSubjectStyles,
  getLegacySubjectColor,
  getLegacySubjectName,
  getThemedColor 
} from './colors';
export type { 
  ColorScheme, 
  SubjectColorVariant, 
  SubjectColors,
  CustomSubject,
  LegacySubject
} from './colors';
export { spacing, layout } from './spacing';
export { typography, textStyles } from './typography';
