'use client';

import MessagesPageContent from '@/components/messages/MessagesPageContent';

export default function AdminMessaggiPage() {
  return (
    <MessagesPageContent 
      basePath="/admin" 
      userRole="ADMIN" 
    />
  );
}
