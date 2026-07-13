/**
 * Virtual Room helpers - participant ordering
 *
 * The staff grid must keep a stable alphabetical-by-surname order so cards
 * never reshuffle between real-time (SSE) refreshes.
 */

import { describe, it, expect } from 'vitest';
import {
  surnameSortKey,
  sortParticipantsBySurname,
} from '@/server/trpc/routers/virtualRoom.helpers';

describe('surnameSortKey', () => {
  it('prefers the structured lastName', () => {
    expect(surnameSortKey('Francesco Giovanni Verdi', 'Verdi')).toBe('verdi');
  });

  it('falls back to the last token of the full name when lastName is missing', () => {
    expect(surnameSortKey('Mario Rossi', null)).toBe('rossi');
    expect(surnameSortKey('Mario Rossi')).toBe('rossi');
  });

  it('keeps multi-word first names out of the fallback surname', () => {
    // Without a lastName we can only take the last token; the structured
    // lastName (above) is what makes multi-word first names correct.
    expect(surnameSortKey('Anna Maria De Luca', 'De Luca')).toBe('de luca');
  });

  it('is case-insensitive', () => {
    expect(surnameSortKey('mario ROSSI', 'ROSSI')).toBe('rossi');
  });

  it('handles nobiliary particles in the fallback (consistent with the Utenti page)', () => {
    // No structured lastName → derive via splitPersonName, which keeps the
    // particle with the surname ("De Luca"), not just the last token ("Luca").
    expect(surnameSortKey('Matteo De Luca')).toBe('de luca');
    expect(surnameSortKey('Anna Maria Della Valle', null)).toBe('della valle');
  });

  it('handles empty input without throwing', () => {
    expect(surnameSortKey('')).toBe('');
  });
});

describe('sortParticipantsBySurname', () => {
  const make = (id: string, name: string, lastName?: string | null) => ({
    item: { id, name },
    name,
    lastName,
    id,
  });

  it('orders participants alphabetically by surname', () => {
    const sorted = sortParticipantsBySurname([
      make('1', 'Mario Rossi', 'Rossi'),
      make('2', 'Anna Bianchi', 'Bianchi'),
      make('3', 'Luca Verdi', 'Verdi'),
    ]);
    expect(sorted.map((p) => p.name)).toEqual([
      'Anna Bianchi',
      'Mario Rossi',
      'Luca Verdi',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [
      make('1', 'Mario Rossi', 'Rossi'),
      make('2', 'Anna Bianchi', 'Bianchi'),
    ];
    const snapshot = input.map((p) => p.id);
    sortParticipantsBySurname(input);
    expect(input.map((p) => p.id)).toEqual(snapshot);
  });

  it('breaks ties deterministically by full name then id', () => {
    const first = sortParticipantsBySurname([
      make('b', 'Marco Rossi', 'Rossi'),
      make('a', 'Anna Rossi', 'Rossi'),
      make('c', 'Anna Rossi', 'Rossi'),
    ]);
    // Same surname -> ordered by full name (Anna before Marco),
    // identical full name -> ordered by id (a before c).
    expect(first.map((p) => p.id)).toEqual(['a', 'c', 'b']);

    // Re-running with a shuffled input yields the same order (stability).
    const second = sortParticipantsBySurname([
      make('c', 'Anna Rossi', 'Rossi'),
      make('b', 'Marco Rossi', 'Rossi'),
      make('a', 'Anna Rossi', 'Rossi'),
    ]);
    expect(second.map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });

  it('falls back to the full name when lastName is not backfilled', () => {
    const sorted = sortParticipantsBySurname([
      make('1', 'Mario Rossi', null),
      make('2', 'Anna Bianchi', null),
    ]);
    expect(sorted.map((p) => p.name)).toEqual(['Anna Bianchi', 'Mario Rossi']);
  });
});
