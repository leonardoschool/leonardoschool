'use client';

import NotificationsPageContent from '@/components/notifications/NotificationsPageContent';

export default function CollaboratoreNotifichePage() {
  return (
    <NotificationsPageContent 
      basePath="/collaboratore" 
      userRole="COLLABORATOR" 
    />
  );
}
