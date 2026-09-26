/**
 * Order and bill numbers stay plain integers in the database (that is what keeps
 * them gapless and unique per company); the prefix is presentation only.
 * "FN" + 1 → "FN-0001", no prefix → "1".
 */
export const formatDocumentNo = (prefix: string | null, no: number) =>
  prefix ? `${prefix}-${String(no).padStart(4, '0')}` : String(no);

/**
 * The number a search term names: "FN-0012", "0012" and "12" are all 12. Anything else
 * (or past int4, which would be a Postgres range error) is undefined.
 */
export const parseDocumentNo = (term: string) => {
  const digits = term.replace(/^[A-Za-z]{2,6}-/, '');
  return /^\d{1,10}$/.test(digits) && Number(digits) <= 2_147_483_647
    ? Number(digits)
    : undefined;
};
