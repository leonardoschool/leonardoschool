import type { Metadata } from 'next';
import { TRPCProvider } from '@/lib/trpc/Provider';

export const metadata: Metadata = {
  title: 'Firma Contratto | Leonardo School',
  description: 'Firma il tuo contratto di iscrizione a Leonardo School',
  robots: 'noindex, nofollow',
};

export default function ContractLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TRPCProvider>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        {children}
      </main>
    </TRPCProvider>
  );
}
