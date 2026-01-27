/**
 * Hook per tracciare Request ID nelle chiamate tRPC
 * Utile per debug e supporto clienti
 */

import { useEffect } from 'react';

interface RequestTrackingOptions {
  /**
   * Abilita logging automatico dei request ID in console
   * Default: true in development, false in production
   */
  enableLogging?: boolean;
  
  /**
   * Callback chiamata quando viene ricevuto un request ID
   */
  onRequestId?: (requestId: string, url: string) => void;
}

/**
 * Intercetta le risposte fetch per loggare i Request ID
 * 
 * @example
 * ```tsx
 * function App() {
 *   useRequestTracking({
 *     onRequestId: (requestId, url) => {
 *       // Invia a servizio di analytics
 *       analytics.track('api_request', { requestId, url });
 *     }
 *   });
 *   
 *   return <YourApp />;
 * }
 * ```
 */
export function useRequestTracking(options: RequestTrackingOptions = {}) {
  const { 
    enableLogging = process.env.NODE_ENV === 'development',
    onRequestId 
  } = options;

  useEffect(() => {
    // Salva il fetch originale
    const originalFetch = globalThis.fetch;

    // Wrap fetch per intercettare response headers
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await originalFetch(input, init);
      
      // Estrai request ID dall'header
      const requestId = response.headers.get('x-request-id');
      const getUrlFromArgs = (): string => {
        if (typeof input === 'string') return input;
        if (input instanceof Request) return input.url;
        return input.toString();
      };
      const url = getUrlFromArgs();
      
      if (requestId) {
        // Log in console (solo in development)
        if (enableLogging) {
          console.log(
            `%c[Request ID]%c ${requestId.slice(0, 8)}... %c→%c ${url}`,
            'color: #8b5cf6; font-weight: bold',
            'color: #a78bfa',
            'color: #6b7280',
            'color: #9ca3af'
          );
        }
        
        // Callback personalizzata
        if (onRequestId) {
          onRequestId(requestId, url);
        }
      }
      
      return response;
    };

    // Cleanup: ripristina fetch originale
    return () => {
      globalThis.fetch = originalFetch;
    };
  }, [enableLogging, onRequestId]);
}

/**
 * Estrae il Request ID dall'ultima chiamata API fallita
 * Utile per mostrare in UI di errore
 * 
 * @example
 * ```tsx
 * const mutation = trpc.users.create.useMutation({
 *   onError: (error) => {
 *     const requestId = getLastRequestId();
 *     showError(`Errore: ${error.message}\nRequest ID: ${requestId}`);
 *   }
 * });
 * ```
 */
export function getLastRequestId(): string | null {
  // Questa è una implementazione semplice
  // In produzione potresti usare un store più sofisticato
  return sessionStorage.getItem('last-request-id');
}

/**
 * Salva il Request ID nell'errore per riferimento futuro
 */
export function saveRequestIdToSessionStorage(requestId: string) {
  sessionStorage.setItem('last-request-id', requestId);
  sessionStorage.setItem('last-request-timestamp', new Date().toISOString());
}
