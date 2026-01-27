'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Hook to access toast notifications
 * 
 * @example
 * const { showSuccess, showError } = useToast();
 * 
 * try {
 *   await saveData();
 *   showSuccess('Salvato!', 'I dati sono stati salvati correttamente.');
 * } catch (error) {
 *   showError('Errore', 'Si è verificato un errore durante il salvataggio.');
 * }
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast icons and colors
const toastConfig: Record<ToastType, { 
  icon: typeof CheckCircle; 
  bgClass: string; 
  borderClass: string;
  iconClass: string;
  titleClass: string;
  messageClass: string;
}> = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-50 dark:bg-green-900/90',
    borderClass: 'border-green-500',
    iconClass: 'text-green-600 dark:text-green-400',
    titleClass: 'text-green-900 dark:text-green-100',
    messageClass: 'text-green-800 dark:text-green-200',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-red-50 dark:bg-red-900/90',
    borderClass: 'border-red-500',
    iconClass: 'text-red-600 dark:text-red-400',
    titleClass: 'text-red-900 dark:text-red-100',
    messageClass: 'text-red-800 dark:text-red-200',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-50 dark:bg-amber-900/90',
    borderClass: 'border-amber-500',
    iconClass: 'text-amber-600 dark:text-amber-400',
    titleClass: 'text-amber-900 dark:text-amber-100',
    messageClass: 'text-amber-800 dark:text-amber-200',
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-50 dark:bg-blue-900/90',
    borderClass: 'border-blue-500',
    iconClass: 'text-blue-600 dark:text-blue-400',
    titleClass: 'text-blue-900 dark:text-blue-100',
    messageClass: 'text-blue-800 dark:text-blue-200',
  },
};

// Single toast component
function ToastItem({ toast, onRemove }: { readonly toast: Toast; readonly onRemove: () => void }) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={`
        flex items-start gap-3 
        p-4 rounded-lg shadow-lg border-l-4
        ${config.bgClass} ${config.borderClass}
        animate-in slide-in-from-right-full duration-300
        max-w-sm w-full
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconClass}`} />
      
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${config.titleClass}`}>
          {toast.title}
        </p>
        {toast.message && (
          <p className={`text-sm mt-1 ${config.messageClass}`}>
            {toast.message}
          </p>
        )}
      </div>
      
      <button
        onClick={onRemove}
        className={`
          flex-shrink-0 p-1 rounded-full 
          hover:bg-black/10 dark:hover:bg-white/10 
          transition-colors
        `}
        aria-label="Chiudi notifica"
      >
        <X className={`w-4 h-4 ${config.iconClass}`} />
      </button>
    </div>
  );
}

// Toast container
function ToastContainer({ toasts, onRemove }: { readonly toasts: Toast[]; readonly onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifiche"
    >
      {toasts.map((toast) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={() => onRemove(toast.id)} 
        />
      ))}
    </div>
  );
}

/**
 * ToastProvider - Wrap your app to enable toast notifications
 * 
 * @example
 * // In layout.tsx
 * <ToastProvider>
 *   {children}
 * </ToastProvider>
 */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${crypto.randomUUID()}`;
    const duration = toast.duration ?? 5000;

    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message, duration: 8000 }); // Errors stay longer
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  const contextValue = useMemo(() => ({
    toasts, 
    showToast, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo, 
    removeToast
  }), [toasts, showToast, showSuccess, showError, showWarning, showInfo, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export default ToastProvider;
