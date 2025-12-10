'use client';

import { useEffect, useState } from 'react';
import { colors } from '@/lib/theme/colors';

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hide preloader after a short delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 ${colors.background.primary} z-[9999] flex items-center justify-center ${colors.effects.transition}`}>
      <div className="flex gap-3">
        <div className="w-4 h-4 rounded-full animate-[jump_1.4s_ease-in-out_-0.32s_infinite]" style={{ backgroundColor: colors.primary.main }} />
        <div className="w-4 h-4 rounded-full animate-[jump_1.4s_ease-in-out_-0.16s_infinite]" style={{ backgroundColor: colors.primary.main }} />
        <div className="w-4 h-4 rounded-full animate-[jump_1.4s_ease-in-out_infinite]" style={{ backgroundColor: colors.primary.main }} />
      </div>
    </div>
  );
}
