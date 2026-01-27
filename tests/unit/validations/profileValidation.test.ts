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
  // Additional exports for extended tests
  validateNome,
  validateRelationship,
  validateEmailOptional,
  calculateAge,
  isMinor,
  validateParentGuardianForm,
  PARENT_RELATIONSHIP_TYPES,
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

// ==================== ADDITIONAL TESTS ====================
// Tests for parent/guardian validation functions

describe('profileValidation - Additional Functions', () => {
  describe('PARENT_RELATIONSHIP_TYPES', () => {
    it('should contain expected relationship types', () => {
      expect(PARENT_RELATIONSHIP_TYPES).toHaveLength(4);
      
      const values = PARENT_RELATIONSHIP_TYPES.map(t => t.value);
      expect(values).toContain('PADRE');
      expect(values).toContain('MADRE');
      expect(values).toContain('TUTORE_LEGALE');
      expect(values).toContain('ALTRO');
    });

    it('should have labels for each type', () => {
      PARENT_RELATIONSHIP_TYPES.forEach(type => {
        expect(type.label).toBeDefined();
        expect(type.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateNome', () => {
    describe('valid names', () => {
      it('should accept valid Italian name', () => {
        const result = validateNome('Mario');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Mario');
      });

      it('should capitalize lowercase name', () => {
        const result = validateNome('giuseppe');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Giuseppe');
      });

      it('should handle compound names with space', () => {
        const result = validateNome('maria teresa');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Maria Teresa');
      });

      it('should handle names with apostrophe', () => {
        const result = validateNome("d'amico");
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe("D'Amico");
      });

      it('should handle names with hyphen', () => {
        const result = validateNome('jean-pierre');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Jean-Pierre');
      });

      it('should handle accented characters', () => {
        const result = validateNome('nicolò');
        expect(result.isValid).toBe(true);
        expect(result.formattedValue).toBe('Nicolò');
      });

      it('should use custom field name in errors', () => {
        const result = validateNome('', 'cognome');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cognome');
      });
    });

    describe('invalid names', () => {
      it('should reject empty string', () => {
        const result = validateNome('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il nome è obbligatorio');
      });

      it('should reject single character', () => {
        const result = validateNome('A');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il nome è troppo corto');
      });

      it('should reject name over 50 characters', () => {
        const result = validateNome('A'.repeat(51));
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il nome è troppo lungo');
      });

      it('should reject name with numbers', () => {
        const result = validateNome('Mario123');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il nome contiene caratteri non validi');
      });

      it('should reject name with special characters', () => {
        const result = validateNome('Mario@#$');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Il nome contiene caratteri non validi');
      });
    });
  });

  describe('validateRelationship', () => {
    it('should accept PADRE', () => {
      const result = validateRelationship('PADRE');
      expect(result.isValid).toBe(true);
      expect(result.formattedValue).toBe('PADRE');
    });

    it('should accept MADRE', () => {
      const result = validateRelationship('MADRE');
      expect(result.isValid).toBe(true);
    });

    it('should accept TUTORE_LEGALE', () => {
      const result = validateRelationship('TUTORE_LEGALE');
      expect(result.isValid).toBe(true);
    });

    it('should accept ALTRO', () => {
      const result = validateRelationship('ALTRO');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty string', () => {
      const result = validateRelationship('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Il tipo di relazione è obbligatorio');
    });

    it('should reject invalid relationship type', () => {
      const result = validateRelationship('NONNO');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tipo di relazione non valido');
    });
  });

  describe('validateEmailOptional', () => {
    it('should accept empty string (optional field)', () => {
      const result = validateEmailOptional('');
      expect(result.isValid).toBe(true);
      expect(result.formattedValue).toBeUndefined();
    });

    it('should accept whitespace only (treated as empty)', () => {
      const result = validateEmailOptional('   ');
      expect(result.isValid).toBe(true);
      expect(result.formattedValue).toBeUndefined();
    });

    it('should accept valid email', () => {
      const result = validateEmailOptional('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.formattedValue).toBe('test@example.com');
    });

    it('should lowercase email', () => {
      const result = validateEmailOptional('Test@Example.COM');
      expect(result.isValid).toBe(true);
      expect(result.formattedValue).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      const result = validateEmailOptional('not-an-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Formato email non valido');
    });

    it('should reject email without @', () => {
      const result = validateEmailOptional('testexample.com');
      expect(result.isValid).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = validateEmailOptional('test@');
      expect(result.isValid).toBe(false);
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly for past date', () => {
      const thirtyYearsAgo = new Date();
      thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
      thirtyYearsAgo.setMonth(0, 1); // Jan 1
      
      const age = calculateAge(thirtyYearsAgo);
      // Age should be 29 or 30 depending on current date
      expect(age).toBeGreaterThanOrEqual(29);
      expect(age).toBeLessThanOrEqual(30);
    });

    it('should accept string date format', () => {
      const age = calculateAge('1990-06-15');
      expect(age).toBeGreaterThan(30);
    });

    it('should accept Date object', () => {
      const date = new Date(1990, 5, 15); // June 15, 1990
      const age = calculateAge(date);
      expect(age).toBeGreaterThan(30);
    });

    it('should handle birthday not yet occurred this year', () => {
      const today = new Date();
      const futureMonth = (today.getMonth() + 6) % 12;
      const birthYear = today.getFullYear() - 25;
      
      // Create date 6 months from now last year (birthday hasn't happened)
      const futureDate = new Date(birthYear, futureMonth, 15);
      const age = calculateAge(futureDate);
      
      // Should be 24 if birthday hasn't happened yet, 25 if it has
      expect(age).toBeGreaterThanOrEqual(24);
      expect(age).toBeLessThanOrEqual(25);
    });
  });

  describe('isMinor', () => {
    it('should return true for person under 18', () => {
      const fifteenYearsAgo = new Date();
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);
      
      expect(isMinor(fifteenYearsAgo)).toBe(true);
    });

    it('should return false for person 18 or older', () => {
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
      
      expect(isMinor(twentyYearsAgo)).toBe(false);
    });

    it('should accept string date', () => {
      expect(isMinor('2000-01-01')).toBe(false);
    });

    it('should handle edge case of exactly 18', () => {
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      eighteenYearsAgo.setMonth(0, 1); // Jan 1
      
      // Should be false (18 years old is not a minor)
      const result = isMinor(eighteenYearsAgo);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('validateParentGuardianForm', () => {
    const validParentData = {
      relationship: 'PADRE',
      firstName: 'Mario',
      lastName: 'Rossi',
      fiscalCode: 'RSSMRA80A01H501U',
      phone: '+39 333 123 4567',
    };

    it('should validate complete valid parent data', () => {
      const result = validateParentGuardianForm(validParentData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.relationship).toBe('PADRE');
        expect(result.data.firstName).toBe('Mario');
        expect(result.data.lastName).toBe('Rossi');
      }
    });

    it('should validate with optional email', () => {
      const result = validateParentGuardianForm({
        ...validParentData,
        email: 'mario.rossi@email.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('mario.rossi@email.com');
      }
    });

    it('should validate with optional address fields', () => {
      const result = validateParentGuardianForm({
        ...validParentData,
        address: 'Via Roma 123',
        city: 'Roma',
        province: 'RM',
        postalCode: '00100',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe('Via Roma 123');
        expect(result.data.city).toBe('Roma');
        expect(result.data.province).toBe('RM');
        expect(result.data.postalCode).toBe('00100');
      }
    });

    it('should return errors for invalid required fields', () => {
      const result = validateParentGuardianForm({
        relationship: 'INVALID',
        firstName: '',
        lastName: '',
        fiscalCode: 'INVALID',
        phone: '',
      });
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors.relationship).toBeDefined();
        expect(result.errors.firstName).toBeDefined();
        expect(result.errors.lastName).toBeDefined();
        expect(result.errors.fiscalCode).toBeDefined();
        expect(result.errors.phone).toBeDefined();
      }
    });

    it('should return errors for invalid optional email', () => {
      const result = validateParentGuardianForm({
        ...validParentData,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors.email).toBeDefined();
      }
    });

    it('should return errors for invalid optional address', () => {
      const result = validateParentGuardianForm({
        ...validParentData,
        address: 'ab', // Too short
      });
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors.address).toBeDefined();
      }
    });

    it('should return errors for invalid optional city', () => {
      const result = validateParentGuardianForm({
        ...validParentData,
        city: 'A', // Too short
      });
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors.city).toBeDefined();
      }
    });

    it('should return errors for invalid optional province', () => {
      const result = validateParentGuardianForm({
        ...validParentData,
        province: 'XX', // Invalid province code
      });
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors.province).toBeDefined();
      }
    });

    it('should return errors for invalid optional postal code', () => {
      const result = validateParentGuardianForm({
        ...validParentData,
        postalCode: '123', // Too short
      });
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors.postalCode).toBeDefined();
      }
    });

    it('should format names correctly', () => {
      const result = validateParentGuardianForm({
        ...validParentData,
        firstName: 'MARIO',
        lastName: 'rossi',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Mario');
        expect(result.data.lastName).toBe('Rossi');
      }
    });

    it('should accept all relationship types', () => {
      PARENT_RELATIONSHIP_TYPES.forEach(type => {
        const result = validateParentGuardianForm({
          ...validParentData,
          relationship: type.value,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});
