/**
 * Tests for fileValidation utility
 * Critical security tests for file upload validation
 */
import { describe, it, expect } from 'vitest';
import {
  MAX_FILE_SIZES,
  ALLOWED_MIME_TYPES,
  hasDangerousExtension,
  sanitizeFilename,
  getFileExtension,
  validateFile,
  validateCVFile,
  validateSignatureDataUrl,
  DEFAULT_RATE_LIMITS,
} from '@/lib/validations/fileValidation';

describe('fileValidation', () => {
  describe('MAX_FILE_SIZES', () => {
    it('should have correct CV size limit (5MB)', () => {
      expect(MAX_FILE_SIZES.CV).toBe(5 * 1024 * 1024);
    });

    it('should have correct IMAGE size limit (2MB)', () => {
      expect(MAX_FILE_SIZES.IMAGE).toBe(2 * 1024 * 1024);
    });

    it('should have correct DOCUMENT size limit (10MB)', () => {
      expect(MAX_FILE_SIZES.DOCUMENT).toBe(10 * 1024 * 1024);
    });

    it('should have correct SIGNATURE size limit (500KB)', () => {
      expect(MAX_FILE_SIZES.SIGNATURE).toBe(500 * 1024);
    });
  });

  describe('ALLOWED_MIME_TYPES', () => {
    it('should allow PDF for CV', () => {
      expect(ALLOWED_MIME_TYPES.CV).toContain('application/pdf');
    });

    it('should allow Word documents for CV', () => {
      expect(ALLOWED_MIME_TYPES.CV).toContain('application/msword');
      expect(ALLOWED_MIME_TYPES.CV).toContain(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('should allow common image formats for IMAGE', () => {
      expect(ALLOWED_MIME_TYPES.IMAGE).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES.IMAGE).toContain('image/png');
      expect(ALLOWED_MIME_TYPES.IMAGE).toContain('image/gif');
      expect(ALLOWED_MIME_TYPES.IMAGE).toContain('image/webp');
    });

    it('should allow Excel for DOCUMENT', () => {
      expect(ALLOWED_MIME_TYPES.DOCUMENT).toContain('application/vnd.ms-excel');
      expect(ALLOWED_MIME_TYPES.DOCUMENT).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should allow PNG and JPEG for SIGNATURE', () => {
      expect(ALLOWED_MIME_TYPES.SIGNATURE).toContain('image/png');
      expect(ALLOWED_MIME_TYPES.SIGNATURE).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES.SIGNATURE).toContain('image/svg+xml');
    });
  });

  describe('hasDangerousExtension', () => {
    describe('dangerous extensions', () => {
      it('should detect executable files', () => {
        expect(hasDangerousExtension('file.exe')).toBe(true);
        expect(hasDangerousExtension('file.bat')).toBe(true);
        expect(hasDangerousExtension('file.cmd')).toBe(true);
        expect(hasDangerousExtension('file.com')).toBe(true);
        expect(hasDangerousExtension('file.scr')).toBe(true);
      });

      it('should detect script files', () => {
        expect(hasDangerousExtension('file.js')).toBe(true);
        expect(hasDangerousExtension('file.vbs')).toBe(true);
        expect(hasDangerousExtension('file.ps1')).toBe(true);
        expect(hasDangerousExtension('file.sh')).toBe(true);
        expect(hasDangerousExtension('file.bash')).toBe(true);
      });

      it('should detect PHP files', () => {
        expect(hasDangerousExtension('file.php')).toBe(true);
        expect(hasDangerousExtension('file.phtml')).toBe(true);
        expect(hasDangerousExtension('file.php5')).toBe(true);
      });

      it('should detect server-side files', () => {
        expect(hasDangerousExtension('file.asp')).toBe(true);
        expect(hasDangerousExtension('file.aspx')).toBe(true);
        expect(hasDangerousExtension('file.jar')).toBe(true);
      });

      it('should detect Windows-specific dangerous files', () => {
        expect(hasDangerousExtension('file.msi')).toBe(true);
        expect(hasDangerousExtension('file.dll')).toBe(true);
        expect(hasDangerousExtension('file.reg')).toBe(true);
        expect(hasDangerousExtension('file.hta')).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(hasDangerousExtension('FILE.EXE')).toBe(true);
        expect(hasDangerousExtension('File.Exe')).toBe(true);
        expect(hasDangerousExtension('FILE.PHP')).toBe(true);
      });
    });

    describe('safe extensions', () => {
      it('should allow PDF files', () => {
        expect(hasDangerousExtension('document.pdf')).toBe(false);
      });

      it('should allow image files', () => {
        expect(hasDangerousExtension('photo.jpg')).toBe(false);
        expect(hasDangerousExtension('image.png')).toBe(false);
        expect(hasDangerousExtension('picture.gif')).toBe(false);
      });

      it('should allow Word documents', () => {
        expect(hasDangerousExtension('resume.doc')).toBe(false);
        expect(hasDangerousExtension('resume.docx')).toBe(false);
      });

      it('should allow Excel files', () => {
        expect(hasDangerousExtension('data.xls')).toBe(false);
        expect(hasDangerousExtension('data.xlsx')).toBe(false);
      });

      it('should allow text files', () => {
        expect(hasDangerousExtension('readme.txt')).toBe(false);
      });
    });
  });

  describe('sanitizeFilename', () => {
    describe('path traversal prevention', () => {
      it('should remove parent directory references', () => {
        expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
      });

      it('should remove forward slashes', () => {
        expect(sanitizeFilename('path/to/file.txt')).not.toContain('/');
      });

      it('should remove backslashes', () => {
        expect(sanitizeFilename('path\\to\\file.txt')).not.toContain('\\');
      });

      it('should remove null bytes', () => {
        expect(sanitizeFilename('file\x00.txt')).not.toContain('\x00');
      });

      it('should remove control characters', () => {
        expect(sanitizeFilename('file\x1f.txt')).not.toContain('\x1f');
      });
    });

    describe('character normalization', () => {
      it('should allow alphanumeric characters', () => {
        expect(sanitizeFilename('file123.txt')).toBe('file123.txt');
      });

      it('should allow underscores', () => {
        expect(sanitizeFilename('my_file.txt')).toBe('my_file.txt');
      });

      it('should allow hyphens', () => {
        expect(sanitizeFilename('my-file.txt')).toBe('my-file.txt');
      });

      it('should allow dots', () => {
        expect(sanitizeFilename('my.file.txt')).toBe('my.file.txt');
      });

      it('should allow spaces', () => {
        expect(sanitizeFilename('my file.txt')).toBe('my file.txt');
      });

      it('should replace special characters with underscores', () => {
        expect(sanitizeFilename('file@#$.txt')).toBe('file___.txt');
      });

      it('should handle unicode characters', () => {
        const result = sanitizeFilename('filé.txt');
        expect(result).not.toContain('é');
      });
    });

    describe('length and whitespace', () => {
      it('should trim whitespace', () => {
        expect(sanitizeFilename('  file.txt  ')).toBe('file.txt');
      });

      it('should limit length to 200 characters', () => {
        const longName = 'a'.repeat(300) + '.txt';
        expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(200);
      });
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(getFileExtension('document.pdf')).toBe('.pdf');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('document.PDF')).toBe('.pdf');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('my.file.name.txt')).toBe('.txt');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('filename')).toBe('');
    });

    it('should return empty string for trailing dot', () => {
      expect(getFileExtension('filename.')).toBe('');
    });
  });

  describe('validateFile', () => {
    const createMockFile = (
      name: string,
      size: number,
      type: string
    ): { name: string; size: number; type: string } => ({
      name,
      size,
      type,
    });

    describe('valid files', () => {
      it('should accept valid PDF for CV', () => {
        const file = createMockFile('resume.pdf', 1024 * 1024, 'application/pdf');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(true);
        expect(result.sanitizedName).toBe('resume.pdf');
      });

      it('should accept valid JPEG for IMAGE', () => {
        const file = createMockFile('photo.jpg', 500 * 1024, 'image/jpeg');
        const result = validateFile(file, 'IMAGE');
        expect(result.valid).toBe(true);
      });

      it('should accept valid DOCX for DOCUMENT', () => {
        const file = createMockFile(
          'report.docx',
          2 * 1024 * 1024,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        const result = validateFile(file, 'DOCUMENT');
        expect(result.valid).toBe(true);
      });

      it('should accept valid PNG for SIGNATURE', () => {
        const file = createMockFile('signature.png', 100 * 1024, 'image/png');
        const result = validateFile(file, 'SIGNATURE');
        expect(result.valid).toBe(true);
      });
    });

    describe('file size validation', () => {
      it('should reject file exceeding CV size limit', () => {
        const file = createMockFile('resume.pdf', 6 * 1024 * 1024, 'application/pdf');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('troppo grande');
        expect(result.error).toContain('5MB');
      });

      it('should reject file exceeding IMAGE size limit', () => {
        const file = createMockFile('photo.jpg', 3 * 1024 * 1024, 'image/jpeg');
        const result = validateFile(file, 'IMAGE');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('troppo grande');
      });

      it('should reject empty file', () => {
        const file = createMockFile('empty.pdf', 0, 'application/pdf');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('vuoto');
      });

      it('should accept file at exact size limit', () => {
        const file = createMockFile('resume.pdf', MAX_FILE_SIZES.CV, 'application/pdf');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(true);
      });
    });

    describe('MIME type validation', () => {
      it('should reject wrong MIME type for CV', () => {
        const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non consentito');
        expect(result.error).toContain('.pdf');
      });

      it('should reject wrong MIME type for IMAGE', () => {
        const file = createMockFile('doc.pdf', 1024, 'application/pdf');
        const result = validateFile(file, 'IMAGE');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non consentito');
      });

      it('should reject executable MIME type', () => {
        const file = createMockFile('program.exe', 1024, 'application/x-msdownload');
        const result = validateFile(file, 'DOCUMENT');
        expect(result.valid).toBe(false);
      });
    });

    describe('dangerous extension validation', () => {
      it('should reject files with dangerous extensions', () => {
        // Even if MIME type is spoofed
        const file = createMockFile('script.exe', 1024, 'application/pdf');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('sicurezza');
      });

      it('should reject PHP files', () => {
        const file = createMockFile('backdoor.php', 1024, 'application/pdf');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(false);
      });
    });

    describe('filename validation', () => {
      it('should reject file with invalid sanitized name', () => {
        const file = createMockFile('..', 1024, 'application/pdf');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Nome file non valido');
      });

      it('should sanitize filename and return in result', () => {
        const file = createMockFile('my file@#.pdf', 1024, 'application/pdf');
        const result = validateFile(file, 'CV');
        expect(result.valid).toBe(true);
        expect(result.sanitizedName).toBe('my file__.pdf');
      });
    });
  });

  describe('validateCVFile', () => {
    it('should return valid for null file (CV is optional)', () => {
      const result = validateCVFile(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined file', () => {
      const result = validateCVFile(undefined);
      expect(result.valid).toBe(true);
    });

    it('should validate file when provided', () => {
      const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      const result = validateCVFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSignatureDataUrl', () => {
    describe('valid signatures', () => {
      it('should accept valid PNG data URL', () => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
        const result = validateSignatureDataUrl(dataUrl);
        expect(result.valid).toBe(true);
      });

      it('should accept valid JPEG data URL', () => {
        const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
        const result = validateSignatureDataUrl(dataUrl);
        expect(result.valid).toBe(true);
      });

      it('should accept valid SVG data URL', () => {
        const dataUrl = 'data:image/svg+xml;base64,PHN2Zz4=';
        const result = validateSignatureDataUrl(dataUrl);
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid signatures', () => {
      it('should reject null', () => {
        const result = validateSignatureDataUrl(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('obbligatoria');
      });

      it('should reject undefined', () => {
        const result = validateSignatureDataUrl(undefined);
        expect(result.valid).toBe(false);
      });

      it('should reject empty string', () => {
        const result = validateSignatureDataUrl('');
        expect(result.valid).toBe(false);
      });

      it('should reject non-image data URL', () => {
        const dataUrl = 'data:application/pdf;base64,xxxxx';
        const result = validateSignatureDataUrl(dataUrl);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non valido');
      });

      it('should reject invalid data URL format', () => {
        const result = validateSignatureDataUrl('not-a-data-url');
        expect(result.valid).toBe(false);
      });

      it('should reject data URL exceeding size limit', () => {
        // Create a large base64 string (>500KB)
        const largeBase64 = 'A'.repeat(700 * 1024); // ~525KB after decoding
        const dataUrl = `data:image/png;base64,${largeBase64}`;
        const result = validateSignatureDataUrl(dataUrl);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('troppo grande');
      });

      it('should reject unsupported MIME type', () => {
        const dataUrl = 'data:image/webp;base64,xxxxx';
        const result = validateSignatureDataUrl(dataUrl);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non supportato');
      });
    });
  });

  describe('DEFAULT_RATE_LIMITS', () => {
    it('should have contact rate limit', () => {
      expect(DEFAULT_RATE_LIMITS.contact).toBeDefined();
      expect(DEFAULT_RATE_LIMITS.contact.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(DEFAULT_RATE_LIMITS.contact.maxRequests).toBe(5);
    });

    it('should have jobApplication rate limit', () => {
      expect(DEFAULT_RATE_LIMITS.jobApplication).toBeDefined();
      expect(DEFAULT_RATE_LIMITS.jobApplication.maxRequests).toBe(3);
    });

    it('should have upload rate limit', () => {
      expect(DEFAULT_RATE_LIMITS.upload).toBeDefined();
      expect(DEFAULT_RATE_LIMITS.upload.windowMs).toBe(60 * 1000); // 1 minute
      expect(DEFAULT_RATE_LIMITS.upload.maxRequests).toBe(10);
    });
  });

  describe('security scenarios', () => {
    it('should prevent double extension bypass', () => {
      const file = { name: 'file.pdf.exe', size: 1024, type: 'application/pdf' };
      const result = validateFile(file, 'CV');
      expect(result.valid).toBe(false);
    });

    it('should prevent null byte injection in filename', () => {
      const sanitized = sanitizeFilename('file.pdf\x00.exe');
      expect(sanitized).not.toContain('\x00');
    });

    it('should prevent path traversal in filename', () => {
      const sanitized = sanitizeFilename('../../../../etc/passwd');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('should prevent MIME type spoofing with extension check', () => {
      // Attacker spoofs MIME type but keeps dangerous extension
      const file = { name: 'backdoor.php', size: 1024, type: 'image/jpeg' };
      const result = validateFile(file, 'IMAGE');
      expect(result.valid).toBe(false);
    });
  });
});
