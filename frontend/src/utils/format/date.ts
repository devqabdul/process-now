// One spelling for every date in the app: "26 Sep", "Fri, 26 Sep", "26 Sep 2026". Written out
// rather than left to Intl, whose en-IN months are three letters except "Sept".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Dates are calendar days in the shop's timezone, so parse at local midnight, never as UTC.
const fromIsoDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);

const dayMonth = (date: Date) => `${date.getDate()} ${MONTHS[date.getMonth()]}`;

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const todayIso = () => toIsoDate(new Date());

export const shiftIsoDate = (iso: string, days: number) => {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

// "Fri, 26 Sep"
export const formatWeekdayDate = (iso: string) => {
  const date = fromIsoDate(iso);
  return `${WEEKDAYS[date.getDay()]}, ${dayMonth(date)}`;
};

export const formatDayLabel = (iso: string) => {
  const today = todayIso();
  if (iso === today) return 'Today';
  if (iso === shiftIsoDate(today, -1)) return 'Yesterday';
  return formatWeekdayDate(iso);
};

// "26 Sep"
export const formatShortDate = (iso: string) => dayMonth(fromIsoDate(iso));

// "26 Sep 2026". createdAt is a full UTC timestamp, not a calendar day, so it parses as-is.
export const formatCreatedOn = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${dayMonth(date)} ${date.getFullYear()}`;
};
