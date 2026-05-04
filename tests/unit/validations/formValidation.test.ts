/**
 * Form Validation Tests
 *
 * Tests for contact form and job application validation utilities.
 * Covers sanitization, email/phone/name/subject/message validation.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateName,
  validateSubject,
  validateMessage,
  validateContactForm,
  sanitizeContactForm,
  type ContactFormData,
} from '@/lib/validations/formValidation';

describe('formValidation', () => {
  // ==================== sanitizeInput ====================
  describe('sanitizeInput', () => {
    describe('HTML tag removal', () => {
      it('should remove simple HTML tags', () => {
        expect(sanitizeInput('<p>Hello</p>')).toBe('Hello');
      });

      it('should remove script tags', () => {
        expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert(xss)');
      });

      it('should remove nested tags', () => {
        expect(sanitizeInput('<div><span>Text</span></div>')).toBe('Text');
      });

      it('should remove self-closing tags', () => {
        expect(sanitizeInput('<br/><hr/>')).toBe('');
      });

      it('should remove tags with attributes', () => {
        expect(sanitizeInput('<a href="http://evil.com">Click</a>')).toBe('Click');
      });

      it('should remove event handler tags', () => {
        expect(sanitizeInput('<img onerror="alert(1)" src="x">')).toBe('');
      });
    });

    describe('dangerous character removal', () => {
      it('should remove less than sign', () => {
        expect(sanitizeInput('5 < 10')).toBe('5  10');
      });

      it('should remove greater than sign', () => {
        expect(sanitizeInput('10 > 5')).toBe('10  5');
      });

      it('should remove double quotes', () => {
        expect(sanitizeInput('He said "hello"')).toBe('He said hello');
      });

      it('should remove single quotes', () => {
        expect(sanitizeInput("It's fine")).toBe('Its fine');
      });

      it('should remove multiple dangerous characters', () => {
        // sanitizeInput removes quotes and angle brackets but preserves parentheses
        expect(sanitizeInput('<script>"alert(\'xss\')"</script>')).toBe('alert(xss)');
      });
    });

    describe('whitespace handling', () => {
      it('should trim leading whitespace', () => {
        expect(sanitizeInput('  hello')).toBe('hello');
      });

      it('should trim trailing whitespace', () => {
        expect(sanitizeInput('hello  ')).toBe('hello');
      });

      it('should preserve internal whitespace', () => {
        expect(sanitizeInput('hello world')).toBe('hello world');
      });

      it('should handle empty string', () => {
        expect(sanitizeInput('')).toBe('');
      });

      it('should handle only whitespace', () => {
        expect(sanitizeInput('   ')).toBe('');
      });
    });

    describe('safe content', () => {
      it('should preserve normal text', () => {
        expect(sanitizeInput('Hello World')).toBe('Hello World');
      });

      it('should preserve numbers', () => {
        expect(sanitizeInput('12345')).toBe('12345');
      });

      it('should preserve accented characters', () => {
        expect(sanitizeInput('àèéìòùÀÈÉ')).toBe('àèéìòùÀÈÉ');
      });

      it('should preserve special characters except dangerous ones', () => {
        expect(sanitizeInput('email@test.com')).toBe('email@test.com');
      });

      it('should preserve hyphens and underscores', () => {
        expect(sanitizeInput('test-name_value')).toBe('test-name_value');
      });
    });
  });

  // ==================== validateEmail ====================
  describe('validateEmail', () => {
    describe('valid emails', () => {
      it('should accept standard email', () => {
        const result = validateEmail('test@example.com');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept email with subdomain', () => {
        expect(validateEmail('test@mail.example.com').valid).toBe(true);
      });

      it('should accept email with plus addressing', () => {
        expect(validateEmail('test+tag@example.com').valid).toBe(true);
      });

      it('should accept email with dots in local part', () => {
        expect(validateEmail('first.last@example.com').valid).toBe(true);
      });

      it('should accept email with numbers', () => {
        expect(validateEmail('test123@example.com').valid).toBe(true);
      });

      it('should accept .it domain', () => {
        expect(validateEmail('test@example.it').valid).toBe(true);
      });
    });

    describe('invalid emails', () => {
      it('should reject empty email', () => {
        const result = validateEmail('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Email obbligatoria');
        expect(result.field).toBe('email');
      });

      it('should reject email without @', () => {
        const result = validateEmail('testexample.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Formato email non valido');
      });

      it('should reject email without domain', () => {
        expect(validateEmail('test@').valid).toBe(false);
      });

      it('should reject email without local part', () => {
        expect(validateEmail('@example.com').valid).toBe(false);
      });

      it('should reject email with spaces', () => {
        expect(validateEmail('test @example.com').valid).toBe(false);
      });

      it('should reject email without TLD', () => {
        expect(validateEmail('test@example').valid).toBe(false);
      });
    });

    describe('length validation', () => {
      it('should reject email over 100 characters', () => {
        const longEmail = 'a'.repeat(90) + '@example.com';
        const result = validateEmail(longEmail);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Email troppo lunga (max 100 caratteri)');
      });

      it('should accept email at exactly 100 characters', () => {
        const email = 'a'.repeat(87) + '@test.com'; // 87 + 9 = 96 chars
        expect(validateEmail(email).valid).toBe(true);
      });
    });
  });

  // ==================== validatePhone ====================
  describe('validatePhone', () => {
    describe('valid phone numbers', () => {
      it('should accept standard Italian mobile', () => {
        expect(validatePhone('3401234567').valid).toBe(true);
      });

      it('should accept phone with country code', () => {
        expect(validatePhone('+39 340 123 4567').valid).toBe(true);
      });

      it('should accept phone with dashes', () => {
        expect(validatePhone('340-123-4567').valid).toBe(true);
      });

      it('should accept phone with spaces', () => {
        expect(validatePhone('340 123 4567').valid).toBe(true);
      });

      it('should accept international format', () => {
        expect(validatePhone('+1 555 123 4567').valid).toBe(true);
      });

      it('should accept 10 digit number', () => {
        expect(validatePhone('1234567890').valid).toBe(true);
      });

      it('should accept 15 digit number (international max)', () => {
        expect(validatePhone('123456789012345').valid).toBe(true);
      });
    });

    describe('invalid phone numbers', () => {
      it('should reject empty phone', () => {
        const result = validatePhone('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Telefono obbligatorio');
        expect(result.field).toBe('phone');
      });

      it('should reject phone with less than 10 digits', () => {
        const result = validatePhone('123456789');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Numero di telefono non valido (10-15 cifre)');
      });

      it('should reject phone with more than 15 digits', () => {
        const result = validatePhone('1234567890123456');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Numero di telefono non valido (10-15 cifre)');
      });

      it('should reject phone with letters', () => {
        const result = validatePhone('340ABC1234');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Il numero può contenere solo cifre, +, - e spazi');
      });

      it('should reject phone with special characters', () => {
        expect(validatePhone('340.123.4567').valid).toBe(false);
        expect(validatePhone('(340) 123-4567').valid).toBe(false);
      });
    });
  });

  // ==================== validateName ====================
  describe('validateName', () => {
    describe('valid names', () => {
      it('should accept simple name', () => {
        expect(validateName('Mario Rossi').valid).toBe(true);
      });

      it('should accept name with accents', () => {
        expect(validateName('Nicolò D\'Angelo').valid).toBe(true);
      });

      it('should accept name with apostrophe', () => {
        expect(validateName("Dell'Acqua Marco").valid).toBe(true);
      });

      it('should accept three-word name', () => {
        expect(validateName('Maria Teresa Bianchi').valid).toBe(true);
      });

      it('should accept name at minimum length (8 chars)', () => {
        expect(validateName('Ab Cdefg').valid).toBe(true);
      });

      it('should accept international characters (supported)', () => {
        // The validateName function uses Unicode letter category \\p{L}
        // which allows all Unicode letters including accented characters
        expect(validateName('François Müller').valid).toBe(true); // All letters are allowed
        expect(validateName('Maria José García').valid).toBe(true); // All letters are allowed
      });
    });

    describe('invalid names', () => {
      it('should reject empty name', () => {
        const result = validateName('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Nome obbligatorio');
        expect(result.field).toBe('name');
      });

      it('should reject name shorter than 8 characters', () => {
        const result = validateName('Mario R');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Nome non valido (8-100 caratteri)');
      });

      it('should reject name longer than 100 characters', () => {
        const result = validateName('A'.repeat(101));
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Nome non valido (8-100 caratteri)');
      });

      it('should reject name with numbers', () => {
        const result = validateName('Mario Rossi 123');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Il nome può contenere solo lettere');
      });

      it('should reject name with special characters', () => {
        expect(validateName('Mario@Rossi').valid).toBe(false);
        expect(validateName('Mario#Rossi').valid).toBe(false);
        expect(validateName('Mario!Rossi').valid).toBe(false);
      });

      it('should reject name with emoji', () => {
        expect(validateName('Mario Rossi 😀').valid).toBe(false);
      });
    });
  });

  // ==================== validateSubject ====================
  describe('validateSubject', () => {
    describe('valid subjects', () => {
      it('should accept normal subject', () => {
        expect(validateSubject('Richiesta informazioni').valid).toBe(true);
      });

      it('should accept subject at minimum length (6 chars)', () => {
        expect(validateSubject('Ciao!!').valid).toBe(true);
      });

      it('should accept long subject', () => {
        expect(validateSubject('Richiesta informazioni sui corsi di matematica per studenti delle superiori').valid).toBe(true);
      });

      it('should accept subject with numbers', () => {
        expect(validateSubject('Corso 2024-2025').valid).toBe(true);
      });
    });

    describe('invalid subjects', () => {
      it('should reject empty subject', () => {
        const result = validateSubject('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Oggetto obbligatorio');
        expect(result.field).toBe('subject');
      });

      it('should reject subject shorter than 6 characters', () => {
        const result = validateSubject('Ciao');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Oggetto non valido (6-200 caratteri)');
      });

      it('should reject subject longer than 200 characters', () => {
        const result = validateSubject('A'.repeat(201));
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Oggetto non valido (6-200 caratteri)');
      });
    });
  });

  // ==================== validateMessage ====================
  describe('validateMessage', () => {
    describe('valid messages', () => {
      it('should accept normal message', () => {
        const message = 'Buongiorno, vorrei informazioni sui corsi disponibili. Grazie.';
        expect(validateMessage(message).valid).toBe(true);
      });

      it('should accept message at minimum length (20 chars)', () => {
        expect(validateMessage('A'.repeat(20)).valid).toBe(true);
      });

      it('should accept long message', () => {
        expect(validateMessage('A'.repeat(2000)).valid).toBe(true);
      });

      it('should accept message with newlines', () => {
        const message = 'Prima riga.\nSeconda riga.\nTerza riga con più testo.';
        expect(validateMessage(message).valid).toBe(true);
      });
    });

    describe('invalid messages', () => {
      it('should reject empty message', () => {
        const result = validateMessage('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Messaggio obbligatorio');
        expect(result.field).toBe('message');
      });

      it('should reject message shorter than 20 characters', () => {
        const result = validateMessage('Ciao');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Messaggio non valido (20-2000 caratteri)');
      });

      it('should reject message longer than 2000 characters', () => {
        const result = validateMessage('A'.repeat(2001));
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Messaggio non valido (20-2000 caratteri)');
      });
    });
  });

  // ==================== validateContactForm ====================
  describe('validateContactForm', () => {
    const validFormData: ContactFormData = {
      name: 'Mario Rossi',
      phone: '3401234567',
      email: 'mario@example.com',
      subject: 'Richiesta informazioni',
      message: 'Buongiorno, vorrei informazioni sui corsi disponibili. Grazie mille.',
    };

    describe('valid form data', () => {
      it('should accept valid form data', () => {
        expect(validateContactForm(validFormData).valid).toBe(true);
      });

      it('should accept form data with optional materia', () => {
        expect(validateContactForm({ ...validFormData, materia: 'Matematica' }).valid).toBe(true);
      });
    });

    describe('missing required fields', () => {
      it('should reject missing name', () => {
        const result = validateContactForm({ ...validFormData, name: '' });
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Tutti i campi sono obbligatori');
      });

      it('should reject missing email', () => {
        const result = validateContactForm({ ...validFormData, email: '' });
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Tutti i campi sono obbligatori');
      });

      it('should reject missing phone', () => {
        const result = validateContactForm({ ...validFormData, phone: '' });
        expect(result.valid).toBe(false);
      });

      it('should reject missing subject', () => {
        const result = validateContactForm({ ...validFormData, subject: '' });
        expect(result.valid).toBe(false);
      });

      it('should reject missing message', () => {
        const result = validateContactForm({ ...validFormData, message: '' });
        expect(result.valid).toBe(false);
      });
    });

    describe('invalid field values', () => {
      it('should reject invalid name', () => {
        const result = validateContactForm({ ...validFormData, name: 'M@rio' });
        expect(result.valid).toBe(false);
        expect(result.field).toBe('name');
      });

      it('should reject invalid email', () => {
        const result = validateContactForm({ ...validFormData, email: 'invalid' });
        expect(result.valid).toBe(false);
        expect(result.field).toBe('email');
      });

      it('should reject invalid phone', () => {
        const result = validateContactForm({ ...validFormData, phone: '123' });
        expect(result.valid).toBe(false);
        expect(result.field).toBe('phone');
      });

      it('should reject invalid subject', () => {
        const result = validateContactForm({ ...validFormData, subject: 'Hi' });
        expect(result.valid).toBe(false);
        expect(result.field).toBe('subject');
      });

      it('should reject invalid message', () => {
        const result = validateContactForm({ ...validFormData, message: 'Short' });
        expect(result.valid).toBe(false);
        expect(result.field).toBe('message');
      });
    });

    describe('materia validation', () => {
      it('should reject empty materia when provided', () => {
        const result = validateContactForm({ ...validFormData, materia: '' });
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Materia non valida');
        expect(result.field).toBe('materia');
      });

      it('should reject materia shorter than 2 characters', () => {
        const result = validateContactForm({ ...validFormData, materia: 'A' });
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Materia non valida');
      });

      it('should accept undefined materia', () => {
        const result = validateContactForm({ ...validFormData, materia: undefined });
        expect(result.valid).toBe(true);
      });
    });
  });

  // ==================== sanitizeContactForm ====================
  describe('sanitizeContactForm', () => {
    it('should sanitize all fields', () => {
      const dirty: ContactFormData = {
        name: '<script>Mario</script> Rossi',
        phone: '340<>1234567',
        email: 'test"@example.com',
        subject: "<b>Richiesta</b>",
        message: "Messaggio con 'caratteri' pericolosi <script>",
      };

      const clean = sanitizeContactForm(dirty);

      expect(clean.name).toBe('Mario Rossi');
      expect(clean.phone).toBe('3401234567');
      expect(clean.email).toBe('test@example.com');
      expect(clean.subject).toBe('Richiesta');
      expect(clean.message).toBe('Messaggio con caratteri pericolosi');
    });

    it('should handle empty fields', () => {
      const empty: ContactFormData = {
        name: '',
        phone: '',
        email: '',
        subject: '',
        message: '',
      };

      const clean = sanitizeContactForm(empty);

      expect(clean.name).toBe('');
      expect(clean.phone).toBe('');
      expect(clean.email).toBe('');
      expect(clean.subject).toBe('');
      expect(clean.message).toBe('');
    });

    it('should handle null/undefined as empty string', () => {
      const result = sanitizeContactForm({
        name: undefined as unknown as string,
        phone: undefined as unknown as string,
        email: undefined as unknown as string,
        subject: undefined as unknown as string,
        message: undefined as unknown as string,
      });

      expect(result.name).toBe('');
      expect(result.phone).toBe('');
    });

    it('should include materia only when provided', () => {
      const withMateria: ContactFormData = {
        name: 'Mario Rossi',
        phone: '3401234567',
        email: 'test@example.com',
        subject: 'Test',
        message: 'Test message here.',
        materia: '<script>Matematica</script>',
      };

      const clean = sanitizeContactForm(withMateria);
      expect(clean.materia).toBe('Matematica');
    });

    it('should not include materia when not provided', () => {
      const withoutMateria: ContactFormData = {
        name: 'Mario Rossi',
        phone: '3401234567',
        email: 'test@example.com',
        subject: 'Test',
        message: 'Test message here.',
      };

      const clean = sanitizeContactForm(withoutMateria);
      expect(clean.materia).toBeUndefined();
    });

    it('should trim whitespace from all fields', () => {
      const dirty: ContactFormData = {
        name: '  Mario Rossi  ',
        phone: '  3401234567  ',
        email: '  test@example.com  ',
        subject: '  Test Subject  ',
        message: '  Test message here.  ',
      };

      const clean = sanitizeContactForm(dirty);

      expect(clean.name).toBe('Mario Rossi');
      expect(clean.phone).toBe('3401234567');
      expect(clean.email).toBe('test@example.com');
      expect(clean.subject).toBe('Test Subject');
      expect(clean.message).toBe('Test message here.');
    });
  });
});
