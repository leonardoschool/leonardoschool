/**
 * Shared validation utilities for API routes
 * Consolidates common validation logic used across contact and job application forms
 */

export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  materia?: string; // Optional, only for job applications
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

/**
 * Sanitize input by removing HTML tags and dangerous characters
 * Uses iterative approach to avoid regex backtracking vulnerabilities
 */
export function sanitizeInput(input: string): string {
  let result = input;
  
  // Remove HTML tags iteratively
  let startIdx = result.indexOf('<');
  while (startIdx !== -1) {
    const endIdx = result.indexOf('>', startIdx);
    if (endIdx === -1) break;
    result = result.slice(0, startIdx) + result.slice(endIdx + 1);
    startIdx = result.indexOf('<');
  }
  
  // Remove dangerous characters
  result = result
    .split('<').join('')
    .split('>').join('')
    .split('"').join('')
    .split("'").join('');
  
  return result.trim();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { valid: false, error: 'Email obbligatoria', field: 'email' };
  }
  
  if (email.length > 100) {
    return { valid: false, error: 'Email troppo lunga (max 100 caratteri)', field: 'email' };
  }
  
  // Simple structural check without regex (avoids backtracking vulnerabilities)
  const atIndex = email.indexOf('@');
  if (atIndex < 1 || atIndex === email.length - 1) {
    return { valid: false, error: 'Formato email non valido', field: 'email' };
  }
  
  const dotIndex = email.lastIndexOf('.');
  if (dotIndex < atIndex + 2 || dotIndex === email.length - 1) {
    return { valid: false, error: 'Formato email non valido', field: 'email' };
  }
  
  if (email.includes(' ')) {
    return { valid: false, error: 'Formato email non valido', field: 'email' };
  }
  
  return { valid: true };
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { valid: false, error: 'Telefono obbligatorio', field: 'phone' };
  }
  
  const phoneDigits = phone.replaceAll(/[\s\-\+]/g, '');
  
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { valid: false, error: 'Numero di telefono non valido (10-15 cifre)', field: 'phone' };
  }
  
  if (!/^[0-9+\s\-]+$/.test(phone)) {
    return { valid: false, error: 'Il numero può contenere solo cifre, +, - e spazi', field: 'phone' };
  }
  
  return { valid: true };
}

/**
 * Validate name (letters only, with accents)
 */
export function validateName(name: string): ValidationResult {
  if (!name) {
    return { valid: false, error: 'Nome obbligatorio', field: 'name' };
  }
  
  if (name.length < 8 || name.length > 100) {
    return { valid: false, error: 'Nome non valido (8-100 caratteri)', field: 'name' };
  }
  
  // Allow letters (including accented), spaces, and apostrophes
  // Using Unicode categories for better coverage and no duplicates
  if (!/^[\p{L}\s']+$/u.test(name)) {
    return { valid: false, error: 'Il nome può contenere solo lettere', field: 'name' };
  }
  
  return { valid: true };
}

/**
 * Validate subject
 */
export function validateSubject(subject: string): ValidationResult {
  if (!subject) {
    return { valid: false, error: 'Oggetto obbligatorio', field: 'subject' };
  }
  
  if (subject.length < 6 || subject.length > 200) {
    return { valid: false, error: 'Oggetto non valido (6-200 caratteri)', field: 'subject' };
  }
  
  return { valid: true };
}

/**
 * Validate message
 */
export function validateMessage(message: string): ValidationResult {
  if (!message) {
    return { valid: false, error: 'Messaggio obbligatorio', field: 'message' };
  }
  
  if (message.length < 20 || message.length > 2000) {
    return { valid: false, error: 'Messaggio non valido (20-2000 caratteri)', field: 'message' };
  }
  
  return { valid: true };
}

/**
 * Validate complete contact form data
 */
export function validateContactForm(data: ContactFormData): ValidationResult {
  // Required fields check
  if (!data.name || !data.phone || !data.email || !data.subject || !data.message) {
    return { valid: false, error: 'Tutti i campi sono obbligatori' };
  }
  
  // Individual field validations
  const nameResult = validateName(data.name);
  if (!nameResult.valid) return nameResult;
  
  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) return emailResult;
  
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.valid) return phoneResult;
  
  const subjectResult = validateSubject(data.subject);
  if (!subjectResult.valid) return subjectResult;
  
  const messageResult = validateMessage(data.message);
  if (!messageResult.valid) return messageResult;
  
  // Validate materia if provided
  if (data.materia !== undefined && (!data.materia || data.materia.length < 2)) {
    return { valid: false, error: 'Materia non valida', field: 'materia' };
  }
  
  return { valid: true };
}

/**
 * Sanitize all fields in form data
 */
export function sanitizeContactForm(data: ContactFormData): ContactFormData {
  return {
    name: sanitizeInput(data.name || ''),
    phone: sanitizeInput(data.phone || ''),
    email: sanitizeInput(data.email || ''),
    subject: sanitizeInput(data.subject || ''),
    message: sanitizeInput(data.message || ''),
    ...(data.materia ? { materia: sanitizeInput(data.materia) } : {}),
  };
}
