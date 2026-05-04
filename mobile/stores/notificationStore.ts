/**
 * Leonardo School Mobile - Notification Store
 * 
 * Gestione notifiche push e in-app.
 */

import { create } from 'zustand';
import type { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fcmToken: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  isLoading: boolean;
}

interface NotificationActions {
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
  setFcmToken: (token: string | null) => void;
  setPermissionStatus: (status: 'granted' | 'denied' | 'undetermined') => void;
  setLoading: (loading: boolean) => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  fcmToken: null,
  permissionStatus: 'undetermined',
  isLoading: false,

  // Actions
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const updated = [notification, ...notifications];
    const unreadCount = updated.filter(n => !n.isRead).length;
    set({ notifications: updated, unreadCount });
  },

  markAsRead: (notificationId) => {
    const { notifications } = get();
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    const unreadCount = updated.filter(n => !n.isRead).length;
    set({ notifications: updated, unreadCount });
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  removeNotification: (notificationId) => {
    const { notifications } = get();
    const updated = notifications.filter(n => n.id !== notificationId);
    const unreadCount = updated.filter(n => !n.isRead).length;
    set({ notifications: updated, unreadCount });
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  setFcmToken: (fcmToken) => set({ fcmToken }),

  setPermissionStatus: (permissionStatus) => set({ permissionStatus }),

  setLoading: (isLoading) => set({ isLoading }),
}));

export default useNotificationStore;
