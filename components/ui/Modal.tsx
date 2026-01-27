'use client';

import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { colors } from '@/lib/theme/colors';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ModalVariant = 'default' | 'primary' | 'danger' | 'success' | 'warning' | 'info';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-4xl',
};

const variantConfig: Record<ModalVariant, { gradient: string; iconBg: string }> = {
  default: {
    gradient: 'bg-gradient-to-br from-slate-600 to-slate-700',
    iconBg: 'bg-white/20',
  },
  primary: {
    gradient: 'bg-gradient-to-br from-[#a8012b] to-[#8a0125]',
    iconBg: 'bg-white/20',
  },
  danger: {
    gradient: 'bg-gradient-to-br from-red-500 to-red-600',
    iconBg: 'bg-white/20',
  },
  success: {
    gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    iconBg: 'bg-white/20',
  },
  warning: {
    gradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
    iconBg: 'bg-white/20',
  },
  info: {
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconBg: 'bg-white/20',
  },
};

/**
 * Shared hook for modal escape key and body scroll management
 */
function useModalBehavior(
  isOpen: boolean,
  onClose: () => void,
  closeOnEscape: boolean
): void {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);
}

/**
 * Shared function to create overlay click handler
 */
function createOverlayClickHandler(closeOnOverlayClick: boolean, onClose: () => void) {
  return () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };
}

export interface ModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Called when modal should close (click overlay, X button, or Escape key) */
  onClose: () => void;
  /** Modal title displayed in header */
  title: string;
  /** Optional subtitle/description below title */
  subtitle?: string;
  /** Modal content */
  children: ReactNode;
  /** Footer content (typically action buttons) */
  footer?: ReactNode;
  /** Icon displayed in header */
  icon?: ReactNode;
  /** Modal width */
  size?: ModalSize;
  /** Color variant for header */
  variant?: ModalVariant;
  /** Whether clicking overlay closes modal (default: true) */
  closeOnOverlayClick?: boolean;
  /** Whether pressing Escape closes modal (default: true) */
  closeOnEscape?: boolean;
  /** Disable close button */
  hideCloseButton?: boolean;
  /** Additional class for the modal container */
  className?: string;
  /** Max height for scrollable body */
  maxBodyHeight?: string;
}

/**
 * Reusable Modal component following Leonardo School design system.
 * 
 * Features:
 * - Consistent styling across the app
 * - Multiple sizes and color variants
 * - Gradient header with icon support
 * - Scrollable body with fixed header/footer
 * - Keyboard (Escape) and overlay click to close
 * - Portal rendering for proper z-index stacking
 * - Prevents body scroll when open
 * 
 * @example
 * <Modal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Conferma Azione"
 *   subtitle="Questa azione non può essere annullata"
 *   icon={<AlertTriangle className="w-7 h-7" />}
 *   variant="danger"
 *   size="md"
 *   footer={
 *     <div className="flex gap-3">
 *       <Button variant="outline" onClick={onClose}>Annulla</Button>
 *       <Button onClick={onConfirm}>Conferma</Button>
 *     </div>
 *   }
 * >
 *   <p>Sei sicuro di voler procedere?</p>
 * </Modal>
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  icon,
  size = 'lg',
  variant = 'primary',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  hideCloseButton = false,
  className = '',
  maxBodyHeight = '60vh',
}: ModalProps) {
  // Use shared modal behavior hook
  useModalBehavior(isOpen, onClose, closeOnEscape);

  if (!isOpen) return null;

  const config = variantConfig[variant];
  const handleOverlayClick = createOverlayClickHandler(closeOnOverlayClick, onClose);

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleOverlayClick}
    >
      <div
        className={`${colors.background.card} rounded-2xl w-full ${sizeClasses[size]} shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className={`relative p-6 ${config.gradient} flex-shrink-0`}>
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-start gap-4">
            {icon && (
              <div className={`w-14 h-14 rounded-xl ${config.iconBg} backdrop-blur-sm flex items-center justify-center text-white flex-shrink-0`}>
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0 pr-8">
              <h2 className="text-xl font-bold text-white truncate">{title}</h2>
              {subtitle && (
                <p className="text-sm text-white/80 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          style={{ maxHeight: maxBodyHeight }}
        >
          {children}
        </div>

        {/* Fixed footer */}
        {footer && (
          <div className={`px-6 py-4 border-t ${colors.border.primary} flex-shrink-0`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render at document.body level
  if (typeof window === 'undefined') return null;
  
  return createPortal(modalContent, document.body);
}

/**
 * Simple modal without gradient header - for simpler dialogs
 */
export interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export function SimpleModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
}: SimpleModalProps) {
  // Use shared modal behavior hook
  useModalBehavior(isOpen, onClose, closeOnEscape);

  if (!isOpen) return null;

  const handleOverlayClick = createOverlayClickHandler(closeOnOverlayClick, onClose);

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleOverlayClick}
    >
      <div
        className={`${colors.background.card} rounded-2xl w-full ${sizeClasses[size]} shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple header */}
        <div className={`px-6 py-4 border-b ${colors.border.primary} flex items-center justify-between flex-shrink-0`}>
          <h2 className={`text-lg font-bold ${colors.text.primary}`}>{title}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 border-t ${colors.border.primary} flex-shrink-0`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  
  return createPortal(modalContent, document.body);
}

export default Modal;
