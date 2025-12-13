'use client';

import NotificationsPageContent from '@/components/notifications/NotificationsPageContent';

export default function StudenteNotifichePage() {
  return (
    <NotificationsPageContent 
      basePath="/studente" 
      userRole="STUDENT" 
    />
  );
}
