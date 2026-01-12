/**
 * Validation utilities for student profile data
 * Ensures consistent formatting and data quality in the database
 */

// Lista delle province italiane valide (sigle)
export const PROVINCE_ITALIANE = [
  'AG', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AT', 'AV', 'BA',
  'BG', 'BI', 'BL', 'BN', 'BO', 'BR', 'BS', 'BT', 'BZ', 'CA',
  'CB', 'CE', 'CH', 'CI', 'CL', 'CN', 'CO', 'CR', 'CS', 'CT',
  'CZ', 'EN', 'FC', 'FE', 'FG', 'FI', 'FM', 'FR', 'GE', 'GO',
  'GR', 'IM', 'IS', 'KR', 'LC', 'LE', 'LI', 'LO', 'LT', 'LU',
  'MB', 'MC', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NA', 'NO',
  'NU', 'OG', 'OR', 'OT', 'PA', 'PC', 'PD', 'PE', 'PG', 'PI',
  'PN', 'PO', 'PR', 'PT', 'PU', 'PV', 'PZ', 'RA', 'RC', 'RE',
  'RG', 'RI', 'RM', 'RN', 'RO', 'SA', 'SI', 'SO', 'SP', 'SR',
  'SS', 'SU', 'SV', 'TA', 'TE', 'TN', 'TO', 'TP', 'TR', 'TS',
  'TV', 'UD', 'VA', 'VB', 'VC', 'VE', 'VI', 'VR', 'VS', 'VT', 'VV'
] as const;

export type ProvinciaItaliana = typeof PROVINCE_ITALIANE[number];

/**
 * Validation result type
 */
export type ValidationResult = {
  isValid: boolean;
  error?: string;
  formattedValue?: string;
};

/**
 * Validates and formats Italian Fiscal Code (Codice Fiscale)
 * Format: 6 letters + 2 digits + 1 letter + 2 digits + 1 letter + 3 digits + 1 letter
 * Example: RSSMRA85M01H501Z
 */
export const validateCodiceFiscale = (value: string): ValidationResult => {
  // Remove spaces and convert to uppercase
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  
  if (!cleaned) {
    return { isValid: false, error: 'Il codice fiscale è obbligatorio' };
  }
  
  if (cleaned.length !== 16) {
    return { isValid: false, error: 'Il codice fiscale deve essere di 16 caratteri' };
  }
  
  // Regex pattern for Italian fiscal code
  const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  
  if (!cfRegex.test(cleaned)) {
    return { isValid: false, error: 'Formato codice fiscale non valido' };
  }
  
  // Validate check digit (carattere di controllo)
  if (!validateCodiceFiscaleCheckDigit(cleaned)) {
    return { isValid: false, error: 'Codice fiscale non valido (carattere di controllo errato)' };
  }
  
  return { isValid: true, formattedValue: cleaned };
};

/**
 * Validates the check digit of an Italian fiscal code
 */
const validateCodiceFiscaleCheckDigit = (cf: string): boolean => {
  const evenMap: { [key: string]: number } = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
    'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
  };
  
  const oddMap: { [key: string]: number } = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
  };
  
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = cf[i];
    sum += (i % 2 === 0) ? oddMap[char] : evenMap[char];
  }
  
  const expectedCheckChar = String.fromCharCode(65 + (sum % 26));
  return cf[15] === expectedCheckChar;
};

/**
 * Validates and formats Italian phone number
 * Accepts formats: +39..., 0039..., 3..., 0...
 * Returns standardized format: +39 XXX XXX XXXX
 */
export const validateTelefono = (value: string): ValidationResult => {
  // Remove all non-digit characters except +
  let cleaned = value.replace(/[^\d+]/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'Il numero di telefono è obbligatorio' };
  }
  
  // Remove country code if present
  if (cleaned.startsWith('+39')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('0039')) {
    cleaned = cleaned.substring(4);
  }
  
  // Remove leading zeros for mobile numbers
  if (cleaned.startsWith('0') && cleaned.length > 10) {
    // Keep leading 0 for landlines
  }
  
  // Italian phone numbers are 9-10 digits (without country code)
  if (cleaned.length < 9 || cleaned.length > 11) {
    return { isValid: false, error: 'Il numero di telefono deve avere 9-10 cifre' };
  }
  
  // Format as +39 XXX XXX XXXX
  const formatted = `+39 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  
  return { isValid: true, formattedValue: formatted };
};

/**
 * Validates and formats Italian CAP (Postal Code)
 * Must be exactly 5 digits
 */
export const validateCAP = (value: string): ValidationResult => {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'Il CAP è obbligatorio' };
  }
  
  if (cleaned.length !== 5) {
    return { isValid: false, error: 'Il CAP deve essere di 5 cifre' };
  }
  
  // Italian CAPs range from 00010 to 98168
  const capNum = parseInt(cleaned, 10);
  if (capNum < 10 || capNum > 98168) {
    return { isValid: false, error: 'CAP non valido' };
  }
  
  return { isValid: true, formattedValue: cleaned };
};

/**
 * Validates Italian province abbreviation
 * Must be a valid 2-letter province code
 */
export const validateProvincia = (value: string): ValidationResult => {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  
  if (!cleaned) {
    return { isValid: false, error: 'La provincia è obbligatoria' };
  }
  
  if (cleaned.length !== 2) {
    return { isValid: false, error: 'La provincia deve essere di 2 lettere (es. RM)' };
  }
  
  if (!PROVINCE_ITALIANE.includes(cleaned as ProvinciaItaliana)) {
    return { isValid: false, error: 'Sigla provincia non valida' };
  }
  
  return { isValid: true, formattedValue: cleaned };
};

/**
 * Formats city name with proper capitalization
 * "roma" -> "Roma", "reggio emilia" -> "Reggio Emilia"
 */
export const formatCitta = (value: string): ValidationResult => {
  const cleaned = value.trim();
  
  if (!cleaned) {
    return { isValid: false, error: 'La città è obbligatoria' };
  }
  
  if (cleaned.length < 2) {
    return { isValid: false, error: 'Il nome della città è troppo corto' };
  }
  
  // Capitalize first letter of each word
  const formatted = cleaned
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return { isValid: true, formattedValue: formatted };
};

/**
 * Formats address with proper capitalization
 * "via roma 123" -> "Via Roma 123"
 */
export const formatIndirizzo = (value: string): ValidationResult => {
  const cleaned = value.trim();
  
  if (!cleaned) {
    return { isValid: false, error: "L'indirizzo è obbligatorio" };
  }
  
  if (cleaned.length < 5) {
    return { isValid: false, error: "L'indirizzo è troppo corto" };
  }
  
  // Capitalize first letter of each word, keep numbers as-is
  const formatted = cleaned
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Don't capitalize if it's a number or contains numbers
      if (/^\d+/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  return { isValid: true, formattedValue: formatted };
};

/**
 * Validates date of birth
 * Must be between 14 and 100 years old
 */
export const validateDataNascita = (value: string | Date): ValidationResult => {
  if (!value) {
    return { isValid: false, error: 'La data di nascita è obbligatoria' };
  }
  
  let date: Date;
  
  if (typeof value === 'string') {
    // Parse YYYY-MM-DD format explicitly to avoid timezone issues
    const parts = value.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      return { isValid: false, error: 'Formato data non valido' };
    }
  } else {
    date = value;
  }
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Data di nascita non valida' };
  }
  
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()) 
    ? age - 1 
    : age;
  
  if (actualAge < 14) {
    return { isValid: false, error: 'Devi avere almeno 14 anni per registrarti' };
  }
  
  if (actualAge > 100) {
    return { isValid: false, error: 'Data di nascita non valida' };
  }
  
  // Return formatted date string
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { isValid: true, formattedValue: formattedDate };
};

/**
 * Profile form data type
 */
export type ProfileFormData = {
  fiscalCode: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  // Optional fields for fiscal code calculation
  birthPlace?: string;
  gender?: 'M' | 'F';
};

/**
 * Validated profile data type (ready for database)
 */
export type ValidatedProfileData = {
  fiscalCode: string;
  dateOfBirth: Date;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
};

/**
 * Validates and formats all profile fields
 * Returns either validated data or list of errors
 */
export const validateProfileForm = (data: ProfileFormData): 
  { success: true; data: ValidatedProfileData } | 
  { success: false; errors: Record<string, string> } => {
  
  const errors: Record<string, string> = {};
  
  const cfResult = validateCodiceFiscale(data.fiscalCode);
  if (!cfResult.isValid) errors.fiscalCode = cfResult.error!;
  
  const dobResult = validateDataNascita(data.dateOfBirth);
  if (!dobResult.isValid) errors.dateOfBirth = dobResult.error!;
  
  const phoneResult = validateTelefono(data.phone);
  if (!phoneResult.isValid) errors.phone = phoneResult.error!;
  
  const addressResult = formatIndirizzo(data.address);
  if (!addressResult.isValid) errors.address = addressResult.error!;
  
  const cityResult = formatCitta(data.city);
  if (!cityResult.isValid) errors.city = cityResult.error!;
  
  const provinceResult = validateProvincia(data.province);
  if (!provinceResult.isValid) errors.province = provinceResult.error!;
  
  const capResult = validateCAP(data.postalCode);
  if (!capResult.isValid) errors.postalCode = capResult.error!;
  
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }
  
  return {
    success: true,
    data: {
      fiscalCode: cfResult.formattedValue!,
      dateOfBirth: new Date(data.dateOfBirth),
      phone: phoneResult.formattedValue!,
      address: addressResult.formattedValue!,
      city: cityResult.formattedValue!,
      province: provinceResult.formattedValue!,
      postalCode: capResult.formattedValue!,
    }
  };
};

// ==================== PARENT/GUARDIAN VALIDATION ====================

/**
 * Parent/Guardian relationship types
 */
export const PARENT_RELATIONSHIP_TYPES = [
  { value: 'PADRE', label: 'Padre' },
  { value: 'MADRE', label: 'Madre' },
  { value: 'TUTORE_LEGALE', label: 'Tutore Legale' },
  { value: 'ALTRO', label: 'Altro' },
] as const;

export type ParentRelationshipType = typeof PARENT_RELATIONSHIP_TYPES[number]['value'];

/**
 * Parent/Guardian form data type
 */
export type ParentGuardianFormData = {
  relationship: string;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  // Optional fields for fiscal code calculation
  birthPlace?: string;
  dateOfBirth?: string;
  gender?: 'M' | 'F';
};

/**
 * Validated parent/guardian data type (ready for database)
 */
export type ValidatedParentGuardianData = {
  relationship: string;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

/**
 * Validates a name field (first name or last name)
 */
export const validateNome = (value: string, fieldName: string = 'nome'): ValidationResult => {
  const cleaned = value.trim();
  
  if (!cleaned) {
    return { isValid: false, error: `Il ${fieldName} è obbligatorio` };
  }
  
  if (cleaned.length < 2) {
    return { isValid: false, error: `Il ${fieldName} è troppo corto` };
  }
  
  if (cleaned.length > 50) {
    return { isValid: false, error: `Il ${fieldName} è troppo lungo` };
  }
  
  // Check for valid characters (letters, spaces, apostrophes, hyphens)
  if (!/^[A-Za-zÀ-ÿ\s'-]+$/.test(cleaned)) {
    return { isValid: false, error: `Il ${fieldName} contiene caratteri non validi` };
  }
  
  // Capitalize first letter of each word
  const formatted = cleaned
    .toLowerCase()
    .split(/(\s+|'|-)/)
    .map((part, _index, _array) => {
      // Don't capitalize separators
      if (part === ' ' || part === "'" || part === '-') return part;
      // Capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
  
  return { isValid: true, formattedValue: formatted };
};

/**
 * Validates parent/guardian relationship type
 */
export const validateRelationship = (value: string): ValidationResult => {
  if (!value) {
    return { isValid: false, error: 'Il tipo di relazione è obbligatorio' };
  }
  
  const validTypes = PARENT_RELATIONSHIP_TYPES.map(t => t.value);
  if (!validTypes.includes(value as ParentRelationshipType)) {
    return { isValid: false, error: 'Tipo di relazione non valido' };
  }
  
  return { isValid: true, formattedValue: value };
};

/**
 * Validates email (optional field for parent/guardian)
 */
export const validateEmailOptional = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true, formattedValue: undefined };
  }
  
  const cleaned = value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(cleaned)) {
    return { isValid: false, error: 'Formato email non valido' };
  }
  
  return { isValid: true, formattedValue: cleaned };
};

/**
 * Calculates age from date of birth
 */
export const calculateAge = (dateOfBirth: string | Date): number => {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Checks if a student is a minor based on date of birth
 */
export const isMinor = (dateOfBirth: string | Date): boolean => {
  return calculateAge(dateOfBirth) < 18;
};

/**
 * Validates and formats all parent/guardian fields
 * Returns either validated data or list of errors
 */
export const validateParentGuardianForm = (data: ParentGuardianFormData): 
  { success: true; data: ValidatedParentGuardianData } | 
  { success: false; errors: Record<string, string> } => {
  
  const errors: Record<string, string> = {};
  
  const relationshipResult = validateRelationship(data.relationship);
  if (!relationshipResult.isValid) errors.relationship = relationshipResult.error!;
  
  const firstNameResult = validateNome(data.firstName, 'nome');
  if (!firstNameResult.isValid) errors.firstName = firstNameResult.error!;
  
  const lastNameResult = validateNome(data.lastName, 'cognome');
  if (!lastNameResult.isValid) errors.lastName = lastNameResult.error!;
  
  const cfResult = validateCodiceFiscale(data.fiscalCode);
  if (!cfResult.isValid) errors.fiscalCode = cfResult.error!;
  
  const phoneResult = validateTelefono(data.phone);
  if (!phoneResult.isValid) errors.phone = phoneResult.error!;
  
  // Optional fields
  const emailResult = data.email ? validateEmailOptional(data.email) : { isValid: true, formattedValue: undefined };
  if (!emailResult.isValid) errors.email = emailResult.error!;
  
  // Optional address fields (only validate if provided)
  let addressFormatted: string | undefined;
  let cityFormatted: string | undefined;
  let provinceFormatted: string | undefined;
  let postalCodeFormatted: string | undefined;
  
  if (data.address && data.address.trim()) {
    const addressResult = formatIndirizzo(data.address);
    if (!addressResult.isValid) errors.address = addressResult.error!;
    else addressFormatted = addressResult.formattedValue;
  }
  
  if (data.city && data.city.trim()) {
    const cityResult = formatCitta(data.city);
    if (!cityResult.isValid) errors.city = cityResult.error!;
    else cityFormatted = cityResult.formattedValue;
  }
  
  if (data.province && data.province.trim()) {
    const provinceResult = validateProvincia(data.province);
    if (!provinceResult.isValid) errors.province = provinceResult.error!;
    else provinceFormatted = provinceResult.formattedValue;
  }
  
  if (data.postalCode && data.postalCode.trim()) {
    const capResult = validateCAP(data.postalCode);
    if (!capResult.isValid) errors.postalCode = capResult.error!;
    else postalCodeFormatted = capResult.formattedValue;
  }
  
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }
  
  return {
    success: true,
    data: {
      relationship: relationshipResult.formattedValue!,
      firstName: firstNameResult.formattedValue!,
      lastName: lastNameResult.formattedValue!,
      fiscalCode: cfResult.formattedValue!,
      phone: phoneResult.formattedValue!,
      email: emailResult.formattedValue,
      address: addressFormatted,
      city: cityFormatted,
      province: provinceFormatted,
      postalCode: postalCodeFormatted,
    }
  };
};
