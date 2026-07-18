/**
 * Re-export of the shared rich-text/LaTeX pipeline.
 *
 * The implementation lives in `shared/richText/` because the Expo app under `mobile/`
 * consumes the exact same code: keeping one copy is what prevents the web and mobile
 * renderers from drifting apart (inline question images used to render on web only).
 * Import from here in web code — the path is unchanged for existing callers.
 */
export {
  renderLatexImagesForPrint,
  hasRenderableRichText,
  wrapUndelimitedMath,
  restoreKaTeXToLatex,
  normalizeStoredRichText,
  sanitizeLatexForKatex,
} from '@/shared/richText/latex';
