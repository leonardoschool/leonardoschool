'use client';

import { useEffect } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { colors } from '@/lib/theme/colors';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize theme on mount
  useEffect(() => {
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
    <div className={`min-h-screen ${colors.background.primary} overflow-x-hidden`}>
      <div className="print:hidden">
        <AppHeader />
      </div>
      <main className="py-6 sm:py-8 lg:py-10 print:py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
          {children}
        </div>
      </main>
    </div>
  );
}
