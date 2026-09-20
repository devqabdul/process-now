const DAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const SHORT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

// Dates are calendar days in the shop's timezone, so parse at local midnight, never as UTC.
const fromIsoDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const todayIso = () => toIsoDate(new Date());

export const shiftIsoDate = (iso: string, days: number) => {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

export const formatDayLabel = (iso: string) => {
  const today = todayIso();
  if (iso === today) return 'Today';
  if (iso === shiftIsoDate(today, -1)) return 'Yesterday';
  return DAY.format(fromIsoDate(iso));
};

export const formatShortDate = (iso: string) => SHORT.format(fromIsoDate(iso));

const CREATED_ON = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// createdAt is a full UTC timestamp, not a calendar day, so it parses as-is.
export const formatCreatedOn = (timestamp: string) => CREATED_ON.format(new Date(timestamp));
