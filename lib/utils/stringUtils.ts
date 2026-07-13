/**
 * String utilities for data normalization
 */

/**
 * Normalizes a person's name by capitalizing first letter of each word
 * and converting the rest to lowercase
 * @param name - Name to normalize
 * @returns Normalized name (e.g., "mario rossi" -> "Mario Rossi")
 */
export const normalizeName = (name: string): string => {
  return name
    .trim()
    .split(/\s+/) // Split by one or more spaces
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Normalizes email to lowercase and trims whitespace
 * @param email - Email to normalize
 * @returns Normalized email
 */
export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

// Nobiliary/patronymic particles that belong to the surname (Italian + a few common foreign ones),
// so "Matteo De Luca" is split as given "Matteo" / surname "De Luca" rather than surname "Luca".
const SURNAME_PARTICLES = new Set([
  'de', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'di', 'da', 'dal', 'dalla',
  'lo', 'la', 'li', 'du', 'des', 'le', 'van', 'von', 'der', 'den', 'mac', 'mc',
]);

/**
 * Splits a person's name into given name and surname. Prefers the structured
 * firstName/lastName when both are present; otherwise derives them from the full
 * name, treating the last token (plus any preceding particles) as the surname.
 */
export const splitPersonName = (
  name: string,
  firstName?: string | null,
  lastName?: string | null
): { given: string; surname: string } => {
  const full = (name || '').trim();
  if (firstName?.trim() && lastName?.trim()) {
    return { given: firstName.trim(), surname: lastName.trim() };
  }
  const tokens = full.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return { given: '', surname: full };

  let start = tokens.length - 1; // surname starts at the last token…
  // …and grows backwards over particles, always leaving at least one given-name token.
  while (start - 1 >= 1 && SURNAME_PARTICLES.has(tokens[start - 1].toLowerCase())) {
    start--;
  }
  const givenTokens = tokens.slice(0, start);
  // If the leftover "given" part is only nobiliary particles (e.g. name is just
  // "De Luca" with no first name), treat the whole string as the surname.
  if (givenTokens.every((t) => SURNAME_PARTICLES.has(t.toLowerCase()))) {
    return { given: '', surname: full };
  }
  return { given: givenTokens.join(' '), surname: tokens.slice(start).join(' ') };
};

/**
 * Formats a name surname-first ("Cognome Nome"), e.g. "Matteo De Luca" -> "De Luca Matteo".
 */
export const formatSurnameFirst = (
  name: string,
  firstName?: string | null,
  lastName?: string | null
): string => {
  const { given, surname } = splitPersonName(name, firstName, lastName);
  return given ? `${surname} ${given}` : surname;
};

/**
 * Case-insensitive, locale-aware sort key for ordering people by surname.
 */
export const surnameSortKey = (
  name: string,
  lastName?: string | null,
  firstName?: string | null
): string => {
  return splitPersonName(name, firstName, lastName).surname.toLocaleLowerCase('it');
};
