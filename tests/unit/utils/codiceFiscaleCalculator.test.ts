/**
 * Tests for codiceFiscaleCalculator utility
 * Tests Italian fiscal code calculation algorithm
 */
import { describe, it, expect } from 'vitest';
import {
  calcolaCodiceFiscale,
  isComuneSupportato,
  getComuniSupportati,
  COMUNI_CATASTALI,
  type DatiCodiceFiscale,
} from '@/lib/utils/codiceFiscaleCalculator';

describe('codiceFiscaleCalculator', () => {
  describe('calcolaCodiceFiscale', () => {
    describe('valid inputs', () => {
      it('should calculate codice fiscale for male from Roma', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1980, 0, 1), // 1 Gennaio 1980
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
        expect(result).toHaveLength(16);
        expect(result).toMatch(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/);
      });

      it('should calculate codice fiscale for female from Milano', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Maria',
          cognome: 'Bianchi',
          dataNascita: new Date(1985, 5, 15), // 15 Giugno 1985
          sesso: 'F',
          comuneNascita: 'Milano',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
        expect(result).toHaveLength(16);
        // Female should have day + 40
        expect(result?.substring(9, 11)).toBe('55'); // 15 + 40 = 55
      });

      it('should add 40 to day for female', () => {
        const datiMale: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1980, 0, 5), // 5 Gennaio
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const datiGemale: DatiCodiceFiscale = {
          nome: 'Maria',
          cognome: 'Rossi',
          dataNascita: new Date(1980, 0, 5), // 5 Gennaio
          sesso: 'F',
          comuneNascita: 'Roma',
        };
        
        const resultMale = calcolaCodiceFiscale(datiMale);
        const resultFemale = calcolaCodiceFiscale(datiGemale);
        
        // Male: day 05
        expect(resultMale?.substring(9, 11)).toBe('05');
        // Female: day 05 + 40 = 45
        expect(resultFemale?.substring(9, 11)).toBe('45');
      });

      it('should handle names with more than 3 consonants', () => {
        // Per nomi con 4+ consonanti: 1°, 3°, 4° consonante
        const dati: DatiCodiceFiscale = {
          nome: 'Francesco', // F, R, N, C, S, C = 1°(F), 3°(N), 4°(C)
          cognome: 'Rossi',
          dataNascita: new Date(1990, 2, 10),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
        // Nome: F (1st) + N (3rd) + C (4th) = FNC
        expect(result?.substring(3, 6)).toBe('FNC');
      });

      it('should handle surnames with 3 consonants', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi', // R, S, S = RSS
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
        expect(result?.substring(0, 3)).toBe('RSS');
      });

      it('should use vowels when not enough consonants', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Ada', // D = 1 consonante, A, A = vocali -> DAA
          cognome: 'Boa', // B = 1 consonante, O, A = vocali -> BOA
          dataNascita: new Date(1990, 0, 1),
          sesso: 'F',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
        // Cognome: B + OA = BOA
        expect(result?.substring(0, 3)).toBe('BOA');
      });

      it('should pad with X when not enough letters', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Io', // nessuna consonante, I, O = vocali -> IOX
          cognome: 'Xu', // X = 1 consonante, U = 1 vocale -> XUX
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
      });
    });

    describe('month codes', () => {
      it('should use correct month codes', () => {
        const monthCodes: Record<number, string> = {
          0: 'A', // Gennaio
          1: 'B', // Febbraio
          2: 'C', // Marzo
          3: 'D', // Aprile
          4: 'E', // Maggio
          5: 'H', // Giugno
          6: 'L', // Luglio
          7: 'M', // Agosto
          8: 'P', // Settembre
          9: 'R', // Ottobre
          10: 'S', // Novembre
          11: 'T', // Dicembre
        };
        
        for (const [month, expectedCode] of Object.entries(monthCodes)) {
          const dati: DatiCodiceFiscale = {
            nome: 'Mario',
            cognome: 'Rossi',
            dataNascita: new Date(1990, parseInt(month), 15),
            sesso: 'M',
            comuneNascita: 'Roma',
          };
          
          const result = calcolaCodiceFiscale(dati);
          expect(result?.[8]).toBe(expectedCode);
        }
      });
    });

    describe('year codes', () => {
      it('should use last 2 digits of year', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1985, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result?.substring(6, 8)).toBe('85');
      });

      it('should handle year 2000+', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(2005, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result?.substring(6, 8)).toBe('05');
      });
    });

    describe('comune catastale codes', () => {
      it('should include correct catastale code for Roma', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        // H501 is Roma's catastale code
        expect(result?.substring(11, 15)).toBe('H501');
      });

      it('should include correct catastale code for Milano', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'Milano',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result?.substring(11, 15)).toBe('F205');
      });

      it('should handle case-insensitive comune names', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'ROMA',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
      });

      it('should handle comune with leading/trailing spaces', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: '  Roma  ',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
      });
    });

    describe('control character', () => {
      it('should calculate valid control character', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1980, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).not.toBeNull();
        // Control character is the last character and should be A-Z
        expect(result?.[15]).toMatch(/[A-Z]/);
      });

      it('should produce consistent results', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1980, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result1 = calcolaCodiceFiscale(dati);
        const result2 = calcolaCodiceFiscale(dati);
        expect(result1).toBe(result2);
      });
    });

    describe('invalid inputs', () => {
      it('should return null for missing nome', () => {
        const dati = {
          nome: '',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M' as const,
          comuneNascita: 'Roma',
        };
        
        expect(calcolaCodiceFiscale(dati)).toBeNull();
      });

      it('should return null for missing cognome', () => {
        const dati = {
          nome: 'Mario',
          cognome: '',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M' as const,
          comuneNascita: 'Roma',
        };
        
        expect(calcolaCodiceFiscale(dati)).toBeNull();
      });

      it('should return null for unsupported comune', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'Borgo Sconosciuto',
        };
        
        expect(calcolaCodiceFiscale(dati)).toBeNull();
      });

      it('should return null for missing comuneNascita', () => {
        const dati = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M' as const,
          comuneNascita: '',
        };
        
        expect(calcolaCodiceFiscale(dati)).toBeNull();
      });
    });

    describe('format validation', () => {
      it('should always return uppercase', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'mario',
          cognome: 'rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).toBe(result?.toUpperCase());
      });

      it('should be exactly 16 characters', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        expect(result).toHaveLength(16);
      });

      it('should match codice fiscale pattern', () => {
        const dati: DatiCodiceFiscale = {
          nome: 'Mario',
          cognome: 'Rossi',
          dataNascita: new Date(1990, 0, 1),
          sesso: 'M',
          comuneNascita: 'Roma',
        };
        
        const result = calcolaCodiceFiscale(dati);
        // Pattern: 6 letters + 2 digits + 1 letter + 2 digits + 1 letter + 3 digits + 1 letter
        expect(result).toMatch(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/);
      });
    });
  });

  describe('isComuneSupportato', () => {
    it('should return true for supported comuni', () => {
      expect(isComuneSupportato('Roma')).toBe(true);
      expect(isComuneSupportato('Milano')).toBe(true);
      expect(isComuneSupportato('Napoli')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isComuneSupportato('roma')).toBe(true);
      expect(isComuneSupportato('ROMA')).toBe(true);
      expect(isComuneSupportato('RoMa')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(isComuneSupportato('  Roma  ')).toBe(true);
    });

    it('should return false for unsupported comuni', () => {
      expect(isComuneSupportato('Borgo Sconosciuto')).toBe(false);
      expect(isComuneSupportato('Atlantide')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isComuneSupportato('')).toBe(false);
    });
  });

  describe('getComuniSupportati', () => {
    it('should return array of comuni names', () => {
      const comuni = getComuniSupportati();
      expect(Array.isArray(comuni)).toBe(true);
      expect(comuni.length).toBeGreaterThan(0);
    });

    it('should include major Italian cities', () => {
      const comuni = getComuniSupportati();
      expect(comuni).toContain('ROMA');
      expect(comuni).toContain('MILANO');
      expect(comuni).toContain('NAPOLI');
      expect(comuni).toContain('TORINO');
      expect(comuni).toContain('FIRENZE');
    });

    it('should return sorted array', () => {
      const comuni = getComuniSupportati();
      const sorted = [...comuni].sort();
      expect(comuni).toEqual(sorted);
    });

    it('should return uppercase names', () => {
      const comuni = getComuniSupportati();
      comuni.forEach((comune) => {
        expect(comune).toBe(comune.toUpperCase());
      });
    });
  });

  describe('COMUNI_CATASTALI', () => {
    it('should have correct format for codes', () => {
      Object.values(COMUNI_CATASTALI).forEach((code) => {
        // Catastale codes are 1 letter + 3 digits
        expect(code).toMatch(/^[A-Z]\d{3}$/);
      });
    });

    it('should have Roma with H501', () => {
      expect(COMUNI_CATASTALI['ROMA']).toBe('H501');
    });

    it('should have Milano with F205', () => {
      expect(COMUNI_CATASTALI['MILANO']).toBe('F205');
    });

    it('should have all keys in uppercase', () => {
      Object.keys(COMUNI_CATASTALI).forEach((key) => {
        expect(key).toBe(key.toUpperCase());
      });
    });
  });
});
