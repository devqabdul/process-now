// ponytail: one business timezone for every company. Add companies.timezone
// if a company outside India signs up.
export const BUSINESS_TZ = 'Asia/Kolkata';
const OFFSET = '+05:30';

/** Today as YYYY-MM-DD in the business timezone. */
export const today = (now = new Date()) =>
  now.toLocaleDateString('en-CA', { timeZone: BUSINESS_TZ });

/** [start, end) of a business day, as UTC instants, for timestamp columns. */
export const dayRange = (date: string) => {
  const start = new Date(`${date}T00:00:00${OFFSET}`);
  return { gte: start, lt: new Date(start.getTime() + 86_400_000) };
};

/** YYYY-MM-DD → value for a Postgres DATE column. */
export const toDateColumn = (date: string) => new Date(`${date}T00:00:00Z`);

/** Postgres DATE column → YYYY-MM-DD. */
export const fromDateColumn = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (date: string, days: number) =>
  fromDateColumn(new Date(toDateColumn(date).getTime() + days * 86_400_000));

/** Real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
export const isDateString = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(toDateColumn(s).getTime()) &&
  fromDateColumn(toDateColumn(s)) === s;
