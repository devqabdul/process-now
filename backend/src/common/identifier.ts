// Mirrors frontend/src/utils/identifier.ts: phones are stored as 10 digits.

/** "+91 98000 22222", "919800022222", "098000 22222" → "9800022222". */
export const toMobileDigits = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

/** Login identifier → the unique column to look it up by. */
export const parseIdentifier = (
  raw: string,
): { email: string } | { phone: string } =>
  raw.includes('@')
    ? { email: normalizeEmail(raw) }
    : { phone: toMobileDigits(raw) };
