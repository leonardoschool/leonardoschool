'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, X } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { notificationConfig } from './notificationConfig';
import { formatNotificationTime } from './helpers';
import type { NotificationTypeKey, NotificationData } from './types';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationData[];
  unreadCount: number;
  onToggle: () => void;
  onMarkAsRead: (id: string) => void;
  onNotificationClick: (notification: NotificationData) => void;
}

export function NotificationsDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onToggle,
  onMarkAsRead,
  onNotificationClick,
}: NotificationsDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`p-1.5 sm:p-2 rounded-lg ${colors.effects.hover.bgSubtle} ${colors.icon.interactive} transition-colors relative`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 sm:w-96 ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} z-50 overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${colors.border.primary} flex items-center justify-between`}>
            <h3 className={`font-semibold ${colors.text.primary}`}>Notifiche</h3>
            <Link 
              href="/notifiche" 
              className={`text-sm ${colors.primary.text} hover:underline`}
              onClick={onClose}
            >
              Vedi tutte
            </Link>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                if (!notification.id || !notification.type) return null;
                const config = notificationConfig[notification.type as NotificationTypeKey] || notificationConfig.GENERAL;
                const NotificationIcon = config.icon;
                
                return (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => onNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 border-b ${colors.border.primary} ${colors.effects.hover.bg} transition-colors cursor-pointer`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${config.bgClass} flex items-center justify-center flex-shrink-0`}>
                        {notification.isUrgent ? (
                          <AlertTriangle className={`w-5 h-5 ${colors.status.warning.text}`} />
                        ) : (
                          <NotificationIcon className={`w-5 h-5 ${config.iconColor}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${colors.text.primary}`}>{notification.title}</p>
                        <p className={`text-sm ${colors.text.secondary} line-clamp-2`}>
                          {notification.message}
                        </p>
                        <p className={`text-xs ${colors.text.muted} mt-1`}>
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                        className={`p-1 rounded ${colors.effects.hover.bgMuted} transition-colors text-gray-500 dark:text-gray-400`}
                        title="Segna come letta"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <Bell className={`w-10 h-10 mx-auto ${colors.icon.secondary} mb-2`} />
                <p className={colors.text.secondary}>Nessuna nuova notifica</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
