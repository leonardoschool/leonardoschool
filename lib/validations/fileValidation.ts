/**
 * File upload validation and security utilities
 * Prevents DoS attacks via oversized uploads and ensures file type safety
 */

// Maximum file sizes in bytes
export const MAX_FILE_SIZES = {
  CV: 5 * 1024 * 1024, // 5MB for CV/resume
  IMAGE: 2 * 1024 * 1024, // 2MB for images
  DOCUMENT: 10 * 1024 * 1024, // 10MB for general documents
  SIGNATURE: 500 * 1024, // 500KB for signature images
} as const;

// Allowed MIME types by category
export const ALLOWED_MIME_TYPES = {
  CV: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  IMAGE: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  SIGNATURE: [
    'image/png',
    'image/jpeg',
    'image/svg+xml',
  ],
} as const;

// File extensions that are always dangerous
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
  '.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.sh', '.bash', '.zsh',
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
  '.asp', '.aspx', '.cer', '.csr',
  '.jar', '.msi', '.dll', '.reg',
  '.hta', '.cpl', '.msc', '.scf',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

export type FileCategory = keyof typeof MAX_FILE_SIZES;

/**
 * Check if a file extension is dangerous
 */
export function hasDangerousExtension(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return DANGEROUS_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x00-\x1f\x7f]/g, '')
    // Keep only safe characters
    .replace(/[^a-zA-Z0-9_\-\.\s]/g, '_')
    // Trim whitespace
    .trim()
    // Limit length
    .substring(0, 200);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Validate file for a specific category
 */
export function validateFile(
  file: File | { name: string; size: number; type: string },
  category: FileCategory
): FileValidationResult {
  const maxSize = MAX_FILE_SIZES[category];
  const allowedTypes = ALLOWED_MIME_TYPES[category];
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024) * 10) / 10;
    return {
      valid: false,
      error: `Il file è troppo grande. Dimensione massima: ${maxSizeMB}MB`,
    };
  }
  
  // Check for empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Il file è vuoto',
    };
  }
  
  // Check MIME type
  const allowedTypesArray = allowedTypes as readonly string[];
  if (!allowedTypesArray.includes(file.type)) {
    const allowedExtensions = getExtensionsForMimeTypes([...allowedTypesArray]);
    return {
      valid: false,
      error: `Tipo di file non consentito. Formati accettati: ${allowedExtensions.join(', ')}`,
    };
  }
  
  // Check for dangerous extensions
  if (hasDangerousExtension(file.name)) {
    return {
      valid: false,
      error: 'Tipo di file non consentito per motivi di sicurezza',
    };
  }
  
  // Sanitize filename
  const sanitizedName = sanitizeFilename(file.name);
  
  if (!sanitizedName || sanitizedName.length < 3) {
    return {
      valid: false,
      error: 'Nome file non valido',
    };
  }
  
  return {
    valid: true,
    sanitizedName,
  };
}

/**
 * Validate CV file specifically
 */
export function validateCVFile(file: File | null | undefined): FileValidationResult {
  if (!file) {
    // CV is optional, so missing file is valid
    return { valid: true };
  }
  
  return validateFile(file, 'CV');
}

/**
 * Validate signature image (from canvas/data URL)
 */
export function validateSignatureDataUrl(dataUrl: string | null | undefined): FileValidationResult {
  if (!dataUrl) {
    return { valid: false, error: 'Firma obbligatoria' };
  }
  
  // Check if it's a valid data URL
  if (!dataUrl.startsWith('data:image/')) {
    return { valid: false, error: 'Formato firma non valido' };
  }
  
  // Check size (rough estimate from base64)
  const base64Data = dataUrl.split(',')[1] || '';
  const sizeInBytes = Math.round((base64Data.length * 3) / 4);
  
  if (sizeInBytes > MAX_FILE_SIZES.SIGNATURE) {
    return { valid: false, error: 'Firma troppo grande. Riprova con un tratto più semplice.' };
  }
  
  // Validate MIME type
  const mimeMatch = dataUrl.match(/^data:([^;]+);/);
  if (!mimeMatch) {
    return { valid: false, error: 'Formato firma non riconosciuto' };
  }
  
  const mimeType = mimeMatch[1];
  if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(mimeType)) {
    return { valid: false, error: 'Formato firma non supportato' };
  }
  
  return { valid: true };
}

/**
 * Get file extensions for MIME types (for error messages)
 */
function getExtensionsForMimeTypes(mimeTypes: string[]): string[] {
  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  
  return [...new Set(mimeTypes.map(mime => mimeToExt[mime] || mime))];
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimiterConfig> = {
  contact: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 per hour
  jobApplication: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  upload: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
};
