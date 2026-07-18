import { describe, it, expect } from 'vitest';
import { getDidatticaBadgeCount, getGestioneBadgeCount } from '@/components/layout/appHeaderParts/helpers';

describe('getDidatticaBadgeCount', () => {
  it('puts the pending question reports on the Domande item', () => {
    expect(getDidatticaBadgeCount('/domande', 3)).toBe(3);
  });

  it('leaves the other Didattica items without a badge', () => {
    for (const href of ['/tags', '/materiali', '/simulazioni']) {
      expect(getDidatticaBadgeCount(href, 3)).toBe(0);
    }
  });

  it('returns 0 when there is nothing pending, so no empty bubble is rendered', () => {
    expect(getDidatticaBadgeCount('/domande', 0)).toBe(0);
  });
});

describe('getGestioneBadgeCount', () => {
  it('keeps routing each Gestione counter to its own item', () => {
    expect(getGestioneBadgeCount('/utenti', true, 5, 2, 1)).toBe(5);
    expect(getGestioneBadgeCount('/candidature', true, 5, 2, 1)).toBe(2);
    expect(getGestioneBadgeCount('/richieste', true, 5, 2, 1)).toBe(1);
  });

  it('stays hidden for non-admins', () => {
    expect(getGestioneBadgeCount('/utenti', false, 5, 2, 1)).toBe(0);
  });
});
