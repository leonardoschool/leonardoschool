/**
 * Error handling utilities for the application
 * Converts technical errors to user-friendly Italian messages
 */

// Common error codes and their user-friendly messages
const errorMessages: Record<string, { title: string; message: string }> = {
  // tRPC errors
  UNAUTHORIZED: {
    title: 'Accesso negato',
    message: 'Devi effettuare il login per accedere a questa funzionalità.',
  },
  FORBIDDEN: {
    title: 'Permesso negato',
    message: 'Non hai i permessi necessari per eseguire questa azione.',
  },
  NOT_FOUND: {
    title: 'Non trovato',
    message: 'La risorsa richiesta non è stata trovata.',
  },
  BAD_REQUEST: {
    title: 'Dati non validi',
    message: 'I dati inseriti non sono corretti. Verifica e riprova.',
  },
  CONFLICT: {
    title: 'Conflitto',
    message: 'L\'operazione non può essere completata per un conflitto con i dati esistenti.',
  },
  TOO_MANY_REQUESTS: {
    title: 'Troppe richieste',
    message: 'Hai effettuato troppe richieste. Attendi qualche minuto e riprova.',
  },
  TIMEOUT: {
    title: 'Timeout',
    message: 'La richiesta ha impiegato troppo tempo. Riprova più tardi.',
  },
  INTERNAL_SERVER_ERROR: {
    title: 'Errore del server',
    message: 'Si è verificato un errore interno. Il nostro team è stato notificato.',
  },
  PARSE_ERROR: {
    title: 'Errore dati',
    message: 'Si è verificato un errore durante l\'elaborazione dei dati.',
  },
  
  // Network errors
  NETWORK_ERROR: {
    title: 'Errore di connessione',
    message: 'Impossibile connettersi al server. Verifica la tua connessione internet.',
  },
  
  // Validation errors
  VALIDATION_ERROR: {
    title: 'Dati non validi',
    message: 'Alcuni campi contengono errori. Verifica e riprova.',
  },
  
  // Generic fallback
  UNKNOWN: {
    title: 'Errore',
    message: 'Si è verificato un errore imprevisto. Riprova più tardi.',
  },
};

/**
 * Extract error code from various error types
 */
function getErrorCode(error: unknown): string {
  if (!error) return 'UNKNOWN';
  
  // tRPC error
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    // tRPC v11 error shape
    if (err.data && typeof err.data === 'object') {
      const data = err.data as Record<string, unknown>;
      if (typeof data.code === 'string') return data.code;
    }
    
    // Direct code property
    if (typeof err.code === 'string') return err.code;
    
    // Error message contains code
    if (typeof err.message === 'string') {
      if (err.message.includes('fetch failed') || err.message.includes('network')) {
        return 'NETWORK_ERROR';
      }
    }
  }
  
  return 'UNKNOWN';
}

/**
 * Extract custom message from error if available
 */
function getCustomMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  
  const err = error as Record<string, unknown>;
  
  // tRPC custom message
  if (err.message && typeof err.message === 'string') {
    // Skip generic messages
    const genericMessages = ['fetch failed', 'network error', 'failed to fetch'];
    const isGeneric = genericMessages.some(g => 
      err.message?.toString().toLowerCase().includes(g)
    );
    if (!isGeneric) return err.message;
  }
  
  // Nested message in data
  if (err.data && typeof err.data === 'object') {
    const data = err.data as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
  }
  
  return null;
}

export interface ParsedError {
  code: string;
  title: string;
  message: string;
  originalError: unknown;
}

/**
 * Parse any error into a user-friendly format
 * 
 * @example
 * try {
 *   await mutation.mutateAsync(data);
 * } catch (error) {
 *   const { title, message } = parseError(error);
 *   showError(title, message);
 * }
 */
export function parseError(error: unknown): ParsedError {
  const code = getErrorCode(error);
  const customMessage = getCustomMessage(error);
  
  const defaults = errorMessages[code] || errorMessages.UNKNOWN;
  
  return {
    code,
    title: defaults.title,
    message: customMessage || defaults.message,
    originalError: error,
  };
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: unknown, code: string): boolean {
  return getErrorCode(error) === code;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'UNAUTHORIZED' || code === 'FORBIDDEN';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return getErrorCode(error) === 'NETWORK_ERROR';
}

export default parseError;
