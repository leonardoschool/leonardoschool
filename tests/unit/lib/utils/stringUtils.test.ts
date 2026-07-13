import { describe, it, expect } from 'vitest';
import { splitPersonName, formatSurnameFirst, surnameSortKey } from '@/lib/utils/stringUtils';

describe('splitPersonName', () => {
  it('prefers structured firstName + lastName when both present', () => {
    expect(splitPersonName('Francesco Giovanni Verdi', 'Francesco Giovanni', 'Verdi'))
      .toEqual({ given: 'Francesco Giovanni', surname: 'Verdi' });
  });

  it('derives given/surname from a simple full name', () => {
    expect(splitPersonName('Mario Rossi')).toEqual({ given: 'Mario', surname: 'Rossi' });
  });

  it('keeps nobiliary particles with the surname', () => {
    expect(splitPersonName('Matteo De Luca')).toEqual({ given: 'Matteo', surname: 'De Luca' });
    expect(splitPersonName('Anna Maria Della Valle'))
      .toEqual({ given: 'Anna Maria', surname: 'Della Valle' });
  });

  it('treats a particle-only "given" part as all surname (no first name)', () => {
    // Regression: "De Luca" alone must not split into given "De" / surname "Luca".
    expect(splitPersonName('De Luca')).toEqual({ given: '', surname: 'De Luca' });
    expect(splitPersonName('Van Der Berg')).toEqual({ given: '', surname: 'Van Der Berg' });
  });

  it('handles a single token', () => {
    expect(splitPersonName('Rossi')).toEqual({ given: '', surname: 'Rossi' });
  });
});

describe('formatSurnameFirst', () => {
  it('renders "Cognome Nome"', () => {
    expect(formatSurnameFirst('Mario Rossi')).toBe('Rossi Mario');
    expect(formatSurnameFirst('Matteo De Luca')).toBe('De Luca Matteo');
  });

  it('returns just the surname when there is no given name', () => {
    expect(formatSurnameFirst('De Luca')).toBe('De Luca');
  });
});

describe('surnameSortKey', () => {
  it('is locale-lowercased and particle-aware', () => {
    expect(surnameSortKey('Matteo De Luca')).toBe('de luca');
    expect(surnameSortKey('Mario ROSSI')).toBe('rossi');
  });
});
