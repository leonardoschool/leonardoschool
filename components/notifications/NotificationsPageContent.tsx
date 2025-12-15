'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { 
  notificationConfigs,
  getNotificationRoute,
  type NotificationType,
  type UserRole,
} from '@/lib/notifications';
import { 
  Bell, 
  Check, 
  AlertTriangle,
  Trash2,
  Archive,
  ArchiveRestore,
  CheckCheck,
} from 'lucide-react';

type FilterType = 'all' | 'unread' | 'archived';

interface NotificationsPageProps {
  userRole: UserRole;
}

export default function NotificationsPageContent({ userRole }: NotificationsPageProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showArchiveAllModal, setShowArchiveAllModal] = useState(false);
  const [showDeleteArchivedModal, setShowDeleteArchivedModal] = useState(false);
  
  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  
  // Fetch notifications
  const { data, isLoading } = trpc.notifications.getNotifications.useQuery({
    unreadOnly: filter === 'unread',
    archivedOnly: filter === 'archived',
    pageSize: 50,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getNotifications.invalidate();
      showSuccess('Notifica letta', 'La notifica è stata segnata come letta.');
    },
    onError: handleMutationError,
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: (data) => {
      utils.notifications.getNotifications.invalidate();
      showSuccess('Tutte lette', `${data.updatedCount} notifiche segnate come lette.`);
    },
    onError: handleMutationError,
  });

  const archiveMutation = trpc.notifications.archive.useMutation({
    onSuccess: () => {
      utils.notifications.getNotifications.invalidate();
      showSuccess('Archiviata', 'La notifica è stata archiviata.');
    },
    onError: handleMutationError,
  });

  const archiveAllReadMutation = trpc.notifications.archiveAllRead.useMutation({
    onSuccess: (data) => {
      utils.notifications.getNotifications.invalidate();
      showSuccess('Archiviate', `${data.archivedCount} notifiche archiviate.`);
      setShowArchiveAllModal(false);
    },
    onError: handleMutationError,
  });

  const unarchiveMutation = trpc.notifications.unarchive.useMutation({
    onSuccess: () => {
      utils.notifications.getNotifications.invalidate();
      showSuccess('Ripristinata', 'La notifica è stata ripristinata.');
    },
    onError: handleMutationError,
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.getNotifications.invalidate();
      showSuccess('Eliminata', 'La notifica è stata eliminata.');
    },
    onError: handleMutationError,
  });

  const deleteAllArchivedMutation = trpc.notifications.deleteAllArchived.useMutation({
    onSuccess: (data) => {
      utils.notifications.getNotifications.invalidate();
      showSuccess('Eliminate', `${data.deletedCount} notifiche eliminate.`);
      setShowDeleteArchivedModal(false);
    },
    onError: handleMutationError,
  });

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minuti fa`;
    }
    
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} ore fa`;
    }
    
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} giorni fa`;
    }
    
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  // Handle notification click - use centralized routing logic
  const handleNotificationClick = (notification: {
    id: string;
    type: string;
    linkUrl?: string | null;
    linkEntityId?: string | null;
    isRead: boolean;
  }) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsReadMutation.mutate({ notificationId: notification.id });
    }

    // Priority 1: Use linkUrl if provided (direct link from notification creation)
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
      return;
    }

    // Priority 2: Generate route from notification type using centralized config
    const notificationType = notification.type as NotificationType;
    const routeParams = notification.linkEntityId ? {
      entityId: notification.linkEntityId,
      contractId: notification.linkEntityId,
      eventId: notification.linkEntityId,
      simulationId: notification.linkEntityId,
      conversationId: notification.linkEntityId,
      questionId: notification.linkEntityId,
      applicationId: notification.linkEntityId,
      requestId: notification.linkEntityId,
      studentId: notification.linkEntityId,
    } : undefined;
    
    const route = getNotificationRoute(notificationType, userRole, routeParams);
    if (route) {
      router.push(route);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${colors.text.primary}`}>
            <Bell className="w-8 h-8" />
            Notifiche
            {unreadCount > 0 && (
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${colors.primary.bg} text-white`}>
                {unreadCount} da leggere
              </span>
            )}
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Tutte le tue notifiche in un unico posto
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {filter !== 'archived' && unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${colors.background.secondary} ${colors.text.primary} hover:opacity-80`}
            >
              <CheckCheck className="w-4 h-4" />
              Segna tutte come lette
            </button>
          )}
          {filter === 'all' && notifications.some(n => n.isRead) && (
            <button
              onClick={() => setShowArchiveAllModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${colors.background.secondary} ${colors.text.primary} hover:opacity-80`}
            >
              <Archive className="w-4 h-4" />
              Archivia lette
            </button>
          )}
          {filter === 'archived' && notifications.length > 0 && (
            <button
              onClick={() => setShowDeleteArchivedModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${colors.status.error.softBg} ${colors.status.error.text} hover:opacity-80`}
            >
              <Trash2 className="w-4 h-4" />
              Elimina archiviate
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={`flex gap-1 p-1 ${colors.background.secondary} rounded-lg w-fit`}>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'all'
              ? `${colors.background.card} shadow-sm ${colors.text.primary}`
              : `${colors.text.secondary} hover:${colors.text.primary}`
          }`}
        >
          Tutte
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            filter === 'unread'
              ? `${colors.background.card} shadow-sm ${colors.text.primary}`
              : `${colors.text.secondary} hover:${colors.text.primary}`
          }`}
        >
          Non lette
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('archived')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'archived'
              ? `${colors.background.card} shadow-sm ${colors.text.primary}`
              : `${colors.text.secondary} hover:${colors.text.primary}`
          }`}
        >
          Archiviate
        </button>
      </div>

      {/* Notifications List */}
      <div className={`${colors.background.card} rounded-xl shadow-sm border ${colors.border.primary} overflow-hidden`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento notifiche...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>
              {filter === 'unread' && 'Nessuna notifica non letta'}
              {filter === 'archived' && 'Nessuna notifica archiviata'}
              {filter === 'all' && 'Nessuna notifica'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => {
              if (!notification.id || !notification.type) return null;
              // Use centralized notification config
              const notificationType = notification.type as NotificationType;
              const config = notificationConfigs[notificationType] || notificationConfigs.GENERAL;
              const NotificationIcon = config.icon;
              const isArchived = notification.isArchived;

              return (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick({
                    id: notification.id,
                    type: notification.type,
                    linkUrl: notification.linkUrl,
                    linkEntityId: notification.linkEntityId,
                    isRead: notification.isRead ?? false,
                  })}
                  className={`p-5 transition-colors cursor-pointer ${
                    !notification.isRead ? colors.background.primary : ''
                  } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${config.iconBgClass} flex items-center justify-center flex-shrink-0`}>
                      {notification.isUrgent ? (
                        <AlertTriangle className={`w-5 h-5 ${colors.status.warning.text}`} />
                      ) : (
                        <NotificationIcon className={`w-5 h-5 ${config.iconColorClass}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`font-medium ${colors.text.primary} ${!notification.isRead ? 'font-semibold' : ''}`}>
                            {notification.title}
                            {notification.isUrgent && (
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.status.warning.softBg} ${colors.status.warning.text}`}>
                                Urgente
                              </span>
                            )}
                          </p>
                          <p className={`text-sm ${colors.text.secondary} mt-1 line-clamp-2`}>
                            {notification.message}
                          </p>
                          <p className={`text-xs ${colors.text.muted} mt-2`}>
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate({ notificationId: notification.id });
                              }}
                              disabled={markAsReadMutation.isPending}
                              className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80 transition-colors`}
                              title="Segna come letta"
                            >
                              <Check className={`w-4 h-4 ${colors.text.primary}`} />
                            </button>
                          )}
                          {!isArchived ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveMutation.mutate({ notificationIds: [notification.id] });
                              }}
                              disabled={archiveMutation.isPending}
                              className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80 transition-colors`}
                              title="Archivia"
                            >
                              <Archive className={`w-4 h-4 ${colors.text.primary}`} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unarchiveMutation.mutate({ notificationIds: [notification.id] });
                                }}
                                disabled={unarchiveMutation.isPending}
                                className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80 transition-colors`}
                                title="Ripristina"
                              >
                                <ArchiveRestore className={`w-4 h-4 ${colors.text.primary}`} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate({ notificationIds: [notification.id] });
                                }}
                                disabled={deleteMutation.isPending}
                                className={`p-2 rounded-lg hover:${colors.status.error.softBg} transition-colors`}
                                title="Elimina"
                              >
                                <Trash2 className={`w-4 h-4 ${colors.status.error.text}`} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className={`w-2 h-2 rounded-full ${colors.primary.bg} flex-shrink-0 mt-2`}></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archive All Confirmation Modal */}
      <ConfirmModal
        isOpen={showArchiveAllModal}
        onClose={() => setShowArchiveAllModal(false)}
        onConfirm={() => archiveAllReadMutation.mutate({})}
        title="Archivia notifiche lette"
        message="Vuoi archiviare tutte le notifiche già lette? Potrai trovarle nella sezione 'Archiviate'."
        confirmLabel="Archivia tutte"
        cancelLabel="Annulla"
        variant="info"
        isLoading={archiveAllReadMutation.isPending}
      />

      {/* Delete Archived Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteArchivedModal}
        onClose={() => setShowDeleteArchivedModal(false)}
        onConfirm={() => deleteAllArchivedMutation.mutate()}
        title="Elimina notifiche archiviate"
        message="Sei sicuro di voler eliminare definitivamente tutte le notifiche archiviate? Questa azione non può essere annullata."
        confirmLabel="Elimina tutte"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteAllArchivedMutation.isPending}
      />
    </div>
  );
}
