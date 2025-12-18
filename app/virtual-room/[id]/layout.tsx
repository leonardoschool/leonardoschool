'use client';

import { useEffect } from 'react';

/**
 * Layout per la Virtual Room - completamente isolato
 * Nessun header, full-screen immersivo
 */
export default function VirtualRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize theme
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
    <div className="fixed inset-0 z-[9999] min-h-screen w-full bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 overflow-auto">
      {children}
    </div>
  );
}
