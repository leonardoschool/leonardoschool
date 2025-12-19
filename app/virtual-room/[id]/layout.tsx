'use client';

import { useEffect } from 'react';
import { colors } from '@/lib/theme/colors';

/**
 * Layout per la Virtual Room - completamente isolato
 * Nessun header, full-screen immersivo
 * Supporta tema chiaro/scuro basato sulla preferenza utente
 */
export default function VirtualRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize theme based on user preference
    const savedTheme = localStorage.getItem('theme') || 'system';
    const root = document.documentElement;
    
    if (savedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  return (
    <div className={`fixed inset-0 z-[9999] min-h-screen w-full ${colors.background.primary} overflow-auto`}>
      {children}
    </div>
  );
}
