// Validations barrel export
export * from './authValidation';
export * from './profileValidation';
export * from './questionValidation';

// Re-export formValidation with renamed types to avoid conflicts
export {
  validateEmail,
  validatePhone,
  validateName,
  validateSubject,
  validateMessage,
  validateContactForm,
  sanitizeContactForm,
  type ContactFormData,
  type ValidationResult as FormValidationResult,
} from './formValidation';

// Re-export fileValidation
export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  validateFile,
  validateCVFile,
  validateSignatureDataUrl,
  hasDangerousExtension,
  sanitizeFilename,
  getFileExtension,
  type FileValidationResult,
  type FileCategory,
  DEFAULT_RATE_LIMITS,
  type RateLimiterConfig,
} from './fileValidation';
