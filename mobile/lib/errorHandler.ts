/**
 * Leonardo School Mobile - Error Handler
 * 
 * Gestione centralizzata degli errori con messaggi user-friendly in italiano.
 */

import { Alert } from 'react-native';

// Error types
export type ErrorType = 
  | 'NETWORK'
  | 'AUTH'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'PERMISSION'
  | 'SERVER'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ParsedError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
}

/**
 * Parse any error to a user-friendly format
 */
export function parseError(error: unknown): ParsedError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('Network request failed')) {
    return {
      type: 'NETWORK',
      message: 'Connessione assente. Verifica la tua connessione internet.',
      originalError: error,
    };
  }

  // Firebase auth errors
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message?: string };
    const message = parseFirebaseError(firebaseError.code);
    return {
      type: 'AUTH',
      message,
      originalError: error,
    };
  }

  // Standard Error
  if (error instanceof Error) {
    // Timeout
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return {
        type: 'TIMEOUT',
        message: 'La richiesta ha impiegato troppo tempo. Riprova.',
        originalError: error,
      };
    }

    // Generic error
    return {
      type: 'UNKNOWN',
      message: error.message || 'Si è verificato un errore.',
      originalError: error,
    };
  }

  // String error
  if (typeof error === 'string') {
    return {
      type: 'UNKNOWN',
      message: error,
      originalError: error,
    };
  }

  // Unknown error
  return {
    type: 'UNKNOWN',
    message: 'Si è verificato un errore sconosciuto.',
    originalError: error,
  };
}

/**
 * Parse Firebase auth error codes to Italian messages
 */
function parseFirebaseError(code: string): string {
  const errorMessages: Record<string, string> = {
    // Auth errors
    'auth/invalid-email': 'Indirizzo email non valido.',
    'auth/user-disabled': 'Questo account è stato disabilitato.',
    'auth/user-not-found': 'Nessun account trovato con questa email.',
    'auth/wrong-password': 'Password non corretta.',
    'auth/email-already-in-use': 'Questa email è già registrata.',
    'auth/weak-password': 'La password deve contenere almeno 6 caratteri.',
    'auth/invalid-credential': 'Credenziali non valide. Verifica email e password.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova più tardi.',
    'auth/network-request-failed': 'Errore di rete. Verifica la connessione.',
    'auth/requires-recent-login': 'Effettua nuovamente il login per questa operazione.',
    'auth/operation-not-allowed': 'Operazione non consentita.',
    'auth/expired-action-code': 'Il link è scaduto. Richiedi un nuovo link.',
    'auth/invalid-action-code': 'Il link non è valido. Richiedi un nuovo link.',
  };

  return errorMessages[code] || 'Errore di autenticazione. Riprova.';
}

/**
 * Show error alert
 */
export function showErrorAlert(
  error: unknown,
  title = 'Errore',
  onDismiss?: () => void
): void {
  const parsed = parseError(error);
  
  Alert.alert(
    title,
    parsed.message,
    [{ text: 'OK', onPress: onDismiss }],
    { cancelable: true }
  );
}

/**
 * Show confirmation alert
 */
export function showConfirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText = 'Conferma',
  cancelText = 'Annulla'
): void {
  Alert.alert(
    title,
    message,
    [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      { text: confirmText, style: 'destructive', onPress: onConfirm },
    ],
    { cancelable: true }
  );
}

/**
 * Show success alert
 */
export function showSuccessAlert(
  title: string,
  message: string,
  onDismiss?: () => void
): void {
  Alert.alert(
    title,
    message,
    [{ text: 'OK', onPress: onDismiss }],
    { cancelable: true }
  );
}

/**
 * Log error for debugging (only in dev)
 */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.error(`[${context}]`, error);
  }
  // In production, you would send to a crash reporting service
  // e.g., Sentry, Crashlytics, etc.
}

const errorHandlerExports = {
  parseError,
  showErrorAlert,
  showConfirmAlert,
  showSuccessAlert,
  logError,
};

export default errorHandlerExports;
