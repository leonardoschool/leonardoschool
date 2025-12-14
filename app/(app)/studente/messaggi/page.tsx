'use client';

import MessagesPageContent from '@/components/messages/MessagesPageContent';

export default function StudenteMessaggiPage() {
  return (
    <MessagesPageContent 
      basePath="/studente" 
      userRole="STUDENT" 
    />
  );
}
