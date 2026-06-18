import { colors } from '@/lib/theme/colors';

// Reads the version inlined at build time from package.json (see next.config.ts).
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

/**
 * Small, unobtrusive version chip pinned to the bottom-left corner.
 * Kept low z-index so modals/overlays always sit above it, and hidden in print.
 */
export function VersionBadge() {
  return (
    <span
      title={`Leonardo School v${APP_VERSION}`}
      className={`fixed bottom-2 left-2 z-30 select-none rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums opacity-50 transition-opacity hover:opacity-100 print:hidden ${colors.background.card} ${colors.border.primary} ${colors.text.muted}`}
    >
      v{APP_VERSION}
    </span>
  );
}

export default VersionBadge;
