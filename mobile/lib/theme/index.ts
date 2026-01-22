/**
 * Leonardo School Mobile - Theme Index
 * 
 * Esporta tutti i moduli del tema per uso centralizzato.
 * 
 * NOTA: Le materie sono dinamiche e vengono dal database.
 * Usare generateSubjectStyles(color) o getSubjectColor(color) per generare i colori delle materie.
 */

export { 
  colors, 
  getSubjectColor, 
  generateSubjectStyles,
  getThemedColor 
} from './colors';
export type { 
  ColorScheme, 
  SubjectColorVariant, 
  SubjectColors,
  CustomSubject
} from './colors';
export { spacing, layout } from './spacing';
export { typography, textStyles } from './typography';
