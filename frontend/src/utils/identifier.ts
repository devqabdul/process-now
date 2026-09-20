export type IdentifierKind = 'email' | 'mobile';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// Digits-and-phone-punctuation only ⇒ mobile; anything else (an @, letters) ⇒ email.
export const detectIdentifierKind = (raw: string): IdentifierKind | null => {
  const value = raw.trim();
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (/^[+\d\s()-]+$/.test(value) && digits.length >= 4) return 'mobile';
  return 'email';
};

// "98000 22222", "+91 98000 22222", "919800022222" and "098000 22222" are the same number
// (matches how the API stores phones: 10 digits, no +91 or leading 0).
export const toMobileDigits = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

/**
 * What a ten-digit mobile field holds while it is being typed into. Only once there are more
 * than ten digits does a +91 or a leading zero give way — so 9198765432, a real number that
 * happens to start 91, survives being typed in full.
 */
export const toMobileInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  return (digits.length > 10 ? digits.replace(/^(?:91|0)/, '') : digits).slice(0, 10);
};

export const isValidEmail = (raw: string) => EMAIL_PATTERN.test(raw.trim());

export const isValidMobile = (raw: string) => toMobileDigits(raw).length === 10;

export const isValidIdentifier = (raw: string) => {
  const kind = detectIdentifierKind(raw);
  if (kind === 'mobile') return isValidMobile(raw);
  if (kind === 'email') return isValidEmail(raw);
  return false;
};

// The value the API receives: lower-cased email or a bare 10-digit mobile number.
export const normalizeIdentifier = (raw: string) =>
  detectIdentifierKind(raw) === 'mobile' ? toMobileDigits(raw) : raw.trim().toLowerCase();

export const displayIdentifier = (raw: string) =>
  detectIdentifierKind(raw) === 'mobile' ? `+91 ${toMobileDigits(raw)}` : raw.trim();
