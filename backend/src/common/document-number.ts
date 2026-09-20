/**
 * Order and bill numbers stay plain integers in the database (that is what keeps
 * them gapless and unique per company); the prefix is presentation only.
 * "FN" + 1 → "FN-0001", no prefix → "1".
 */
export const formatDocumentNo = (prefix: string | null, no: number) =>
  prefix ? `${prefix}-${String(no).padStart(4, '0')}` : String(no);
