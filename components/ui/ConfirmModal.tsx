'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { colors } from '@/lib/theme/colors';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
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
 * Uses createPortal to render at document.body level for proper overlay
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;
  const handleClose = onCancel || onClose;
  const confirmButtonText = confirmText || confirmLabel || 'Conferma';
  const cancelButtonText = cancelText || cancelLabel || 'Annulla';

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className={`${colors.background.card} rounded-2xl max-w-md w-full p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${colors.text.primary}`}>{title}</h3>
            <div className={`mt-2 ${colors.text.secondary}`}>{message}</div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-white font-medium bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {cancelButtonText}
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
              confirmButtonText
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default ConfirmModal;
