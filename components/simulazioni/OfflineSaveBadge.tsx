'use client';

import { CloudOff } from 'lucide-react';
import { colors } from '@/lib/theme/colors';

interface OfflineSaveBadgeProps {
  readonly isOffline: boolean;
}

/**
 * Reassures the student that a dropped connection is not losing their work.
 * Deliberately unobtrusive: it never blocks the exam and disappears by itself
 * as soon as syncing resumes.
 */
export default function OfflineSaveBadge({ isOffline }: OfflineSaveBadgeProps) {
  if (!isOffline) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.status.warning.bgLight} ${colors.status.warning.text}`}
      title="Connessione assente: le risposte restano salvate su questo dispositivo e verranno sincronizzate al ripristino della rete"
      role="status"
    >
      <CloudOff className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium whitespace-nowrap">
        <span className="hidden md:inline">Offline &mdash; risposte salvate sul dispositivo</span>
        <span className="md:hidden">Offline</span>
      </span>
    </div>
  );
}
