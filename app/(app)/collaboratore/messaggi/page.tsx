'use client';

import MessagesPageContent from '@/components/messages/MessagesPageContent';

export default function CollaboratoreMessaggiPage() {
  return (
    <MessagesPageContent 
      basePath="/collaboratore" 
      userRole="COLLABORATOR" 
    />
  );
}
