import { colors } from '@/lib/theme/colors';

export default function RootLoading() {
  return (
    <div className={`min-h-screen ${colors.background.primary} flex items-center justify-center ${colors.effects.transition}`}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-t-4" style={{ borderColor: colors.primary.main }}></div>
        <p className={`mt-6 text-base font-medium ${colors.text.primary}`}>Caricamento...</p>
      </div>
    </div>
  );
}
