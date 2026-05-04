/**
 * Custom hook for handling API errors with toast notifications
 * Use this to automatically show user-friendly error messages
 * 
 * @example
 * const { handleError, handleMutationError } = useApiError();
 * 
 * // For mutations
 * const mutation = trpc.user.update.useMutation({
 *   onError: handleMutationError,
 *   onSuccess: () => showSuccess('Salvato!'),
 * });
 * 
 * // For manual error handling
 * try {
 *   await someAction();
 * } catch (error) {
 *   handleError(error);
 * }
 */

import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { parseError, isAuthError, type ParsedError } from '@/lib/utils/errorHandler';

interface UseApiErrorOptions {
  /** Custom handler called before showing toast */
  onError?: (error: ParsedError) => void;
  /** If true, auth errors will redirect to login */
  redirectOnAuthError?: boolean;
}

export function useApiError(options: UseApiErrorOptions = {}) {
  const { showError } = useToast();
  const { onError, redirectOnAuthError = false } = options;

  /**
   * Handle any error and show a toast notification
   */
  const handleError = useCallback((error: unknown) => {
    const parsed = parseError(error);
    
    // Call custom handler if provided
    onError?.(parsed);
    
    // Handle auth errors with redirect
    if (redirectOnAuthError && isAuthError(error)) {
      showError(parsed.title, 'Effettua il login per continuare.');
      // Use setTimeout to allow toast to show before redirect
      setTimeout(() => {
        globalThis.location.href = '/auth/login';
      }, 1500);
      return;
    }
    
    // Show error toast
    showError(parsed.title, parsed.message);
  }, [showError, onError, redirectOnAuthError]);

  /**
   * Error handler for tRPC mutations onError callback
   * Use directly: onError: handleMutationError
   */
  const handleMutationError = useCallback((error: unknown) => {
    handleError(error);
  }, [handleError]);

  /**
   * Wrap an async function with error handling
   * Useful for onClick handlers
   * 
   * @example
   * const handleClick = withErrorHandling(async () => {
   *   await mutation.mutateAsync(data);
   * });
   */
  const withErrorHandling = useCallback(<T,>(
    fn: () => Promise<T>
  ) => {
    return async (): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (error) {
        handleError(error);
        return undefined;
      }
    };
  }, [handleError]);

  return {
    handleError,
    handleMutationError,
    withErrorHandling,
  };
}

export default useApiError;
