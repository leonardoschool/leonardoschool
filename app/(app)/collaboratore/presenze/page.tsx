'use client';

import PresenzePageContent from '@/components/presenze/PresenzePageContent';

export default function CollaboratorePresenzePage() {
  // Collaborators only see events they created
  return <PresenzePageContent onlyMyEvents={true} />;
}
