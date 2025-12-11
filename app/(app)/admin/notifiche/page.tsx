'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { 
  Bell, 
  Check, 
  AlertTriangle,
  FileText,
  UserCheck,
  UserPlus,
  Trash2,
  LucideProps,
} from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

const notificationIcons: Record<string, LucideIcon> = {
  CONTRACT_ASSIGNED: FileText,
  CONTRACT_SIGNED: FileText,
  ACCOUNT_ACTIVATED: UserCheck,
  PROFILE_COMPLETED: UserPlus,
  GENERAL: Bell,
};

const notificationColors: Record<string, { bg: string; text: string }> = {
  CONTRACT_ASSIGNED: { bg: colors.status.info.softBg, text: colors.status.info.text },
  CONTRACT_SIGNED: { bg: colors.status.success.softBg, text: colors.status.success.text },
  ACCOUNT_ACTIVATED: { bg: colors.status.success.softBg, text: colors.status.success.text },
  PROFILE_COMPLETED: { bg: colors.status.warning.softBg, text: colors.status.warning.text },
  GENERAL: { bg: colors.neutral.gray100, text: colors.neutral.gray600 },
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  
  // Fetch notifications
  const { data: notifications, isLoading } = trpc.contracts.getAdminNotifications.useQuery({
    unreadOnly: filter === 'unread',
    limit: 50,
  });

  // Mark as read mutation
  const markReadMutation = trpc.contracts.markNotificationRead.useMutation({
    onSuccess: () => {
      utils.contracts.getAdminNotifications.invalidate();
      showSuccess('Notifica letta', 'La notifica è stata segnata come letta.');
    },
    onError: handleMutationError,
  });

  // Delete single notification mutation
  const deleteNotificationMutation = trpc.contracts.deleteNotification.useMutation({
    onSuccess: () => {
      utils.contracts.getAdminNotifications.invalidate();
      showSuccess('Notifica eliminata', 'La notifica è stata eliminata definitivamente.');
    },
    onError: handleMutationError,
  });

  // Delete all notifications mutation
  const deleteAllNotificationsMutation = trpc.contracts.deleteAllNotifications.useMutation({
    onSuccess: (data) => {
      utils.contracts.getAdminNotifications.invalidate();
      showSuccess('Notifiche eliminate', `${data.count} notifiche sono state eliminate.`);
      setShowDeleteAllModal(false);
    },
    onError: handleMutationError,
  });

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minuti fa`;
    }
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} ore fa`;
    }
    
    // Less than 7 days
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

  const isUnread = (notification: { readBy?: unknown }) => {
    const readBy = (notification.readBy ?? {}) as Record<string, string>;
    // For simplicity, we check if the notification has any reads
    // In a real app, you'd check for the current admin's ID
    return Object.keys(readBy).length === 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8" />
            Notifiche
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Tutte le notifiche relative agli studenti e ai contratti
          </p>
        </div>
        
        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? `${colors.primary.gradient} text-white`
                : `${colors.background.secondary} hover:${colors.background.tertiary}`
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? `${colors.primary.gradient} text-white`
                : `${colors.background.secondary} hover:${colors.background.tertiary}`
            }`}
          >
            Non lette
          </button>
          {notifications && notifications.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${colors.status.error.softBg} ${colors.status.error.text} hover:opacity-80`}
            >
              <Trash2 className="w-4 h-4" />
              Elimina tutte
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className={`${colors.background.card} rounded-xl shadow-sm overflow-hidden`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento notifiche...</p>
          </div>
        ) : !notifications?.length ? (
          <div className="p-12 text-center">
            <Bell className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>
              {filter === 'unread' ? 'Nessuna notifica non letta' : 'Nessuna notifica'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const IconComponent = notificationIcons[notification.type] || Bell;
              const colorSet = notificationColors[notification.type] || notificationColors.GENERAL;
              const unread = isUnread(notification);

              return (
                <div 
                  key={notification.id}
                  className={`p-5 transition-colors ${
                    unread ? `${colors.background.primary}` : ''
                  } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${colorSet.bg} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5`} style={{ color: colorSet.text }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`font-medium ${unread ? 'font-semibold' : ''}`}>
                            {notification.title}
                            {notification.isUrgent && (
                              <AlertTriangle className={`inline w-4 h-4 ml-2 ${colors.status.warning.text}`} />
                            )}
                          </p>
                          <p className={`text-sm ${colors.text.secondary} mt-1`}>
                            {notification.message}
                          </p>
                          <p className={`text-xs ${colors.text.muted} mt-2`}>
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {unread && (
                            <button
                              onClick={() => markReadMutation.mutate({ notificationId: notification.id })}
                              disabled={markReadMutation.isPending}
                              className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
                              title="Segna come letta"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotificationMutation.mutate({ notificationId: notification.id })}
                            disabled={deleteNotificationMutation.isPending}
                            className={`p-2 rounded-lg hover:${colors.status.error.softBg} transition-colors`}
                            title="Elimina notifica"
                          >
                            <Trash2 className={`w-4 h-4 ${colors.status.error.text}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {unread && (
                      <div className={`w-2 h-2 rounded-full ${colors.primary.bg} flex-shrink-0 mt-2`}></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={() => deleteAllNotificationsMutation.mutate()}
        title="Elimina tutte le notifiche"
        message="Sei sicuro di voler eliminare definitivamente tutte le notifiche? Questa azione non può essere annullata."
        confirmLabel="Elimina tutte"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteAllNotificationsMutation.isPending}
      />
    </div>
  );
}
