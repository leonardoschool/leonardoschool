/**
 * Profile Validation Tests
 * Tests for Italian profile data validation (Codice Fiscale, telefono, CAP, etc.)
 */

import { describe, it, expect } from 'vitest';
import {
  validateCodiceFiscale,
  validateTelefono,
  validateCAP,
  validateProvincia,
  formatCitta,
  formatIndirizzo,
  validateDataNascita,
  validateProfileForm,
  PROVINCE_ITALIANE,
} from '@/lib/validations/profileValidation';

describe('profileValidation', () => {
  describe('validateCodiceFiscale', () => {
    describe('valid codici fiscali', () => {
      // These are example codes with mathematically correct check digits
      const validCodes = [
        'RSSMRA80A01H501U', // Rossi Mario, nato a Roma il 01/01/1980
        'BNCLRD85M10H501A', // Bianchi Leonardo, nato a Roma il 10/08/1985
      ];

      it.each(validCodes)('should accept valid codice fiscale: %s', (cf) => {
        const result = validateCodiceFiscale(cf);
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe(cf.toUpperCase());
      });

      it('should convert lowercase to uppercase', () => {
        const result = validateCodiceFiscale('rssmra80a01h501u');
        expect(result.formattedValue).toBe('RSSMRA80A01H501U');
      });

      it('should remove spaces', () => {
        const result = validateCodiceFiscale('RSS MRA 80A01 H501U');
        expect(result.formattedValue).toBe('RSSMRA80A01H501U');
      });
    });

    describe('invalid codici fiscali', () => {
      it('should reject empty string', () => {
        const result = validateCodiceFiscale('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il codice fiscale è obbligatorio');
      });

      it('should reject short codice fiscale', () => {
        const result = validateCodiceFiscale('RSSMRA85M01');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il codice fiscale deve essere di 16 caratteri');
      });

      it('should reject long codice fiscale', () => {
        const result = validateCodiceFiscale('RSSMRA85M01H501ZZZ');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il codice fiscale deve essere di 16 caratteri');
      });

      it('should reject invalid format (wrong pattern)', () => {
        const result = validateCodiceFiscale('1234567890123456');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Formato codice fiscale non valido');
      });

      it('should reject codice fiscale with invalid check digit', () => {
        // Valid format but wrong check digit (Z -> A)
        const result = validateCodiceFiscale('RSSMRA85M01H501A');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Codice fiscale non valido (carattere di controllo errato)');
      });
    });
  });

  describe('validateTelefono', () => {
    describe('valid phone numbers', () => {
      it('should accept mobile number with +39 prefix', () => {
        const result = validateTelefono('+39 333 123 4567');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toMatch(/^\+39 \d{3} \d{3} \d+$/);
      });

      it('should accept mobile number without prefix', () => {
        const result = validateTelefono('3331234567');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toContain('+39');
      });

      it('should accept number with 0039 prefix', () => {
        const result = validateTelefono('00393331234567');
        expect(result.isValid).toBe(true);
      });

      it('should handle various formatting', () => {
        const result = validateTelefono('333-123-4567');
        expect(result.isValid).toBe(true);
      });
    });

    describe('invalid phone numbers', () => {
      it('should reject empty string', () => {
        const result = validateTelefono('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il numero di telefono è obbligatorio');
      });

      it('should reject too short number', () => {
        const result = validateTelefono('12345');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il numero di telefono deve avere 9-10 cifre');
      });

      it('should reject too long number', () => {
        const result = validateTelefono('123456789012345');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateCAP', () => {
    describe('valid CAPs', () => {
      const validCAPs = [
        '00100', // Roma
        '20100', // Milano
        '80100', // Napoli
        '10100', // Torino
        '50100', // Firenze
      ];

      it.each(validCAPs)('should accept valid CAP: %s', (cap) => {
        const result = validateCAP(cap);
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe(cap);
      });

      it('should remove non-digit characters', () => {
        const result = validateCAP('00-100');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('00100');
      });
    });

    describe('invalid CAPs', () => {
      it('should reject empty string', () => {
        const result = validateCAP('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il CAP è obbligatorio');
      });

      it('should reject CAP with wrong length', () => {
        const result = validateCAP('1234');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il CAP deve essere di 5 cifre');
      });

      it('should reject CAP out of valid range (too low)', () => {
        const result = validateCAP('00005');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('CAP non valido');
      });

      it('should reject CAP out of valid range (too high)', () => {
        const result = validateCAP('99999');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('CAP non valido');
      });
    });
  });

  describe('validateProvincia', () => {
    describe('valid provinces', () => {
      const sampleProvinces = ['RM', 'MI', 'NA', 'TO', 'FI', 'BO', 'PA', 'GE', 'VE', 'BA'];

      it.each(sampleProvinces)('should accept valid province: %s', (prov) => {
        const result = validateProvincia(prov);
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe(prov);
      });

      it('should convert lowercase to uppercase', () => {
        const result = validateProvincia('rm');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('RM');
      });

      it('should accept all Italian provinces', () => {
        PROVINCE_ITALIANE.forEach((prov) => {
          const result = validateProvincia(prov);
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('invalid provinces', () => {
      it('should reject empty string', () => {
        const result = validateProvincia('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('La provincia è obbligatoria');
      });

      it('should reject single character', () => {
        const result = validateProvincia('R');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('La provincia deve essere di 2 lettere (es. RM)');
      });

      it('should reject invalid province code', () => {
        const result = validateProvincia('XX');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Sigla provincia non valida');
      });

      it('should reject numbers', () => {
        const result = validateProvincia('12');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('formatCitta', () => {
    describe('valid cities', () => {
      it('should capitalize single word city', () => {
        const result = formatCitta('roma');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Roma');
      });

      it('should capitalize multi-word city', () => {
        const result = formatCitta('reggio emilia');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Reggio Emilia');
      });

      it('should handle all uppercase input', () => {
        const result = formatCitta('MILANO');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Milano');
      });

      it('should trim whitespace', () => {
        const result = formatCitta('  roma  ');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Roma');
      });
    });

    describe('invalid cities', () => {
      it('should reject empty string', () => {
        const result = formatCitta('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('La città è obbligatoria');
      });

      it('should reject single character', () => {
        const result = formatCitta('R');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il nome della città è troppo corto');
      });
    });
  });

  describe('formatIndirizzo', () => {
    describe('valid addresses', () => {
      it('should format simple address', () => {
        const result = formatIndirizzo('via roma 123');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Via Roma 123');
      });

      it('should keep numbers unchanged', () => {
        const result = formatIndirizzo('VIA GARIBALDI 45/A');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toContain('45');
      });

      it('should handle complex addresses', () => {
        const result = formatIndirizzo('piazza san marco 10');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Piazza San Marco 10');
      });
    });

    describe('invalid addresses', () => {
      it('should reject empty string', () => {
        const result = formatIndirizzo('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("L'indirizzo è obbligatorio");
      });

      it('should reject too short address', () => {
        const result = formatIndirizzo('via');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("L'indirizzo è troppo corto");
      });
    });
  });

  describe('validateDataNascita', () => {
    describe('valid dates', () => {
      it('should accept date for 18 year old', () => {
        const eighteenYearsAgo = new Date();
        eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
        const dateStr = eighteenYearsAgo.toISOString().split('T')[0];
        
        const result = validateDataNascita(dateStr);
        expect(result.isValid).toBe(true);
      });

      it('should accept date for 30 year old', () => {
        const result = validateDataNascita('1995-05-15');
        expect(result.isValid).toBe(true);
      });

      it('should accept Date object', () => {
        const date = new Date(1990, 5, 15);
        const result = validateDataNascita(date);
        expect(result.isValid).toBe(true);
      });
    });

    describe('invalid dates', () => {
      it('should reject empty value', () => {
        const result = validateDataNascita('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('La data di nascita è obbligatoria');
      });

      it('should reject date for person under 14', () => {
        const elevenYearsAgo = new Date();
        elevenYearsAgo.setFullYear(elevenYearsAgo.getFullYear() - 11);
        const dateStr = elevenYearsAgo.toISOString().split('T')[0];
        
        const result = validateDataNascita(dateStr);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Devi avere almeno 14 anni per registrarti');
      });

      it('should reject date for person over 100', () => {
        const result = validateDataNascita('1900-01-01');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Data di nascita non valida');
      });

      it('should reject invalid date format', () => {
        const result = validateDataNascita('invalid-date');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateProfileForm', () => {
    // Use a valid codice fiscale with correct check digit
    const validProfileData = {
      fiscalCode: 'RSSMRA80A01H501U',
      dateOfBirth: '1985-08-01',
      phone: '+39 333 123 4567',
      address: 'Via Roma 123',
      city: 'Roma',
      province: 'RM',
      postalCode: '00100',
    };

    it('should validate complete valid profile', () => {
      const result = validateProfileForm(validProfileData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fiscalCode).toBe('RSSMRA80A01H501U');
        expect(result.data.city).toBe('Roma');
        expect(result.data.province).toBe('RM');
      }
    });

    it('should return errors for invalid data', () => {
      const invalidData = {
        ...validProfileData,
        fiscalCode: 'INVALID',
        postalCode: '123',
      };

      const result = validateProfileForm(invalidData);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors.fiscalCode).toBeDefined();
        expect(result.errors.postalCode).toBeDefined();
      }
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const invalidData = {
        fiscalCode: '',
        dateOfBirth: '',
        phone: '',
        address: '',
        city: '',
        province: '',
        postalCode: '',
      };

      const result = validateProfileForm(invalidData);
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(Object.keys(result.errors).length).toBeGreaterThan(3);
      }
    });

    it('should format values correctly', () => {
      const result = validateProfileForm({
        ...validProfileData,
        city: 'ROMA',
        province: 'rm',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.city).toBe('Roma');
        expect(result.data.province).toBe('RM');
      }
    });
  });
});
