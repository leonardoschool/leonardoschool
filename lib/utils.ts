import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a cryptographically secure random ID
 * Uses crypto.randomUUID() which is secure for IDs
 */
export function generateSecureId(prefix = ''): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/**
 * Fisher-Yates shuffle algorithm with crypto-secure randomness
 * Use this for shuffling arrays where randomness matters (e.g., quiz questions)
 */
export function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  const randomValues = new Uint32Array(shuffled.length);
  crypto.getRandomValues(randomValues);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if we should show snowfall effect (December to January)
 */
export function shouldShowSnowfall(): boolean {
  const currentMonth = new Date().getMonth() + 1;
  return currentMonth >= 12 || currentMonth < 2;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

/**
 * Validate email format
 * Uses structural checks instead of regex to avoid backtracking vulnerabilities
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  
  const atIndex = email.indexOf('@');
  if (atIndex < 1 || atIndex === email.length - 1) return false;
  
  const dotIndex = email.lastIndexOf('.');
  if (dotIndex < atIndex + 2 || dotIndex === email.length - 1) return false;
  
  if (email.includes(' ')) return false;
  
  return true;
}
