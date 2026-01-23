/**
 * Validation utilities for authentication forms
 */

import { colors } from '@/lib/theme/colors';

/**
 * Validates email format using structural checks
 * @param email - Email address to validate
 * @returns true if email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  // Prevent DoS by limiting input length before validation
  if (!email || email.length > 254) return false;
  
  // Check for any whitespace characters (space, tab, newline, etc.)
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    if (char <= 32 || char === 127) return false; // Control characters and space
  }
  
  // Simple structural check without regex (faster for basic validation)
  const atIndex = email.indexOf('@');
  if (atIndex < 1 || atIndex === email.length - 1) return false;
  
  // Check for multiple @ symbols
  if (email.indexOf('@', atIndex + 1) !== -1) return false;
  
  const dotIndex = email.lastIndexOf('.');
  if (dotIndex < atIndex + 2 || dotIndex === email.length - 1) return false;
  
  return true;
};

/**
 * Password strength levels
 */
export type PasswordStrength = {
  score: number;
  label: string;
  color: string;
  textColor: string;
};

/**
 * Calculates password strength based on various criteria
 * @param password - Password to evaluate
 * @returns Object with score (0-5), label, color class, and text color class
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  
  // Length criteria
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  // Return strength evaluation using centralized colors
  if (score <= 1) return { 
    score, 
    label: 'Molto debole', 
    color: colors.validation.strength.veryWeak.bg,
    textColor: colors.validation.strength.veryWeak.text,
  };
  if (score === 2) return { 
    score, 
    label: 'Debole', 
    color: colors.validation.strength.weak.bg,
    textColor: colors.validation.strength.weak.text,
  };
  if (score === 3) return { 
    score, 
    label: 'Media', 
    color: colors.validation.strength.medium.bg,
    textColor: colors.validation.strength.medium.text,
  };
  if (score === 4) return { 
    score, 
    label: 'Forte', 
    color: colors.validation.strength.strong.bg,
    textColor: colors.validation.strength.strong.text,
  };
  return { 
    score, 
    label: 'Molto forte', 
    color: colors.validation.strength.veryStrong.bg,
    textColor: colors.validation.strength.veryStrong.text,
  };
};
