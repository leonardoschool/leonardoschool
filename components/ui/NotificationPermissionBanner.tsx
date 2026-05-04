/**
 * NotificationPermissionBanner Component
 *
 * Banner per richiedere all'utente di abilitare le notifiche push.
 * Mostra solo se le notifiche sono supportate e non ancora abilitate.
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useFCMNotifications } from '@/lib/hooks/useFCMNotifications';
import { colors } from '@/lib/theme/colors';
import Button from '@/components/ui/Button';
import { ButtonLoader } from '@/components/ui/loaders';

interface NotificationPermissionBannerProps {
  /** Classe CSS aggiuntiva */
  className?: string;
  /** Callback quando il banner viene chiuso */
  onDismiss?: () => void;
}

const DISMISSED_KEY = 'notification-banner-dismissed';

export function NotificationPermissionBanner({
  className = '',
  onDismiss,
}: NotificationPermissionBannerProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden until check
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    permissionGranted,
    isSupported,
    permissionStatus,
    isLoading,
    requestPermission,
  } = useFCMNotifications();

  // Check if banner was previously dismissed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wasDismissed = localStorage.getItem(DISMISSED_KEY);
    const dismissedAt = wasDismissed ? parseInt(wasDismissed, 10) : 0;
    
    // Re-show after 7 days if still not granted
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const shouldShow = !wasDismissed || (Date.now() - dismissedAt > sevenDaysMs);
    
    setDismissed(!shouldShow);
  }, []);

  // Don't show if loading, already granted, denied, or not supported
  if (isLoading) return null;
  if (!isSupported) return null;
  if (permissionGranted) return null;
  if (permissionStatus === 'denied') return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setDismissed(true);
    onDismiss?.();
  };

  const handleEnable = async () => {
    setIsRequesting(true);
    const success = await requestPermission();
    setIsRequesting(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        handleDismiss();
      }, 2000);
    }
  };

  if (showSuccess) {
    return (
      <div
        className={`
          flex items-center justify-center gap-2 py-3 px-4
          bg-green-100 dark:bg-green-900/30
          border-b border-green-200 dark:border-green-800
          ${className}
        `}
      >
        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-green-700 dark:text-green-300">
          Notifiche abilitate! Riceverai aggiornamenti in tempo reale.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`
        flex flex-wrap items-center justify-between gap-3 py-3 px-4
        ${colors.background.secondary}
        border-b border-gray-200 dark:border-gray-700
        ${className}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors.primary.gradient}`}>
          <Bell className="w-4 h-4 text-white" />
        </div>
        <p className={`text-sm ${colors.text.secondary}`}>
          Abilita le notifiche per ricevere aggiornamenti istantanei su messaggi e avvisi.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          aria-label="Chiudi"
        >
          Non ora
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleEnable}
          disabled={isRequesting}
        >
          <ButtonLoader loading={isRequesting} loadingText="Attivazione...">
            Abilita notifiche
          </ButtonLoader>
        </Button>
        <button
          onClick={handleDismiss}
          className={`
            p-1 rounded-lg
            hover:bg-gray-200 dark:hover:bg-gray-700
            transition-colors
          `}
          aria-label="Chiudi banner"
        >
          <X className={`w-4 h-4 ${colors.text.muted}`} />
        </button>
      </div>
    </div>
  );
}

export default NotificationPermissionBanner;
