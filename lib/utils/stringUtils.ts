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
