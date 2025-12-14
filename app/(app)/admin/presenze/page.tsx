'use client';

import PresenzePageContent from '@/components/presenze/PresenzePageContent';

export default function AdminPresenzePage() {
  // Admin sees all events
  return <PresenzePageContent onlyMyEvents={false} />;
}
