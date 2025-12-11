'use client';

import { colors } from '@/lib/theme/colors';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
};

/**
 * Reusable confirmation modal component
 * Used for delete confirmations, dangerous actions, etc.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${colors.background.card} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${colors.text.primary}`}>{title}</h3>
            <p className={`mt-2 ${colors.text.secondary}`}>{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-xl ${colors.background.secondary} font-medium hover:opacity-80 transition-opacity disabled:opacity-50`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-xl ${config.buttonBg} font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Attendere...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
