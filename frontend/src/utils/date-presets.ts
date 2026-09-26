import { shiftIsoDate, todayIso } from '@utils/format/date';

export const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisYear', label: 'This year' },
] as const;

export type DatePresetId = (typeof DATE_PRESETS)[number]['id'];
export interface DateRange {
  from: string;
  to: string;
}

// What a list shows with no from/to in the URL — the API's own default window.
export const DEFAULT_DATE_PRESET: DatePresetId = 'last30';
// The API refuses a window longer than this.
const MAX_SPAN_DAYS = 366;

const startOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;

const rawRange = (id: DatePresetId, today: string): DateRange => {
  switch (id) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const day = shiftIsoDate(today, -1);
      return { from: day, to: day };
    }
    case 'thisWeek': {
      // Weeks start on Monday; getDay() counts from Sunday.
      const weekday = new Date(`${today}T00:00:00`).getDay();
      return { from: shiftIsoDate(today, -((weekday + 6) % 7)), to: today };
    }
    case 'thisMonth':
      return { from: startOfMonth(today), to: today };
    case 'lastMonth': {
      const end = shiftIsoDate(startOfMonth(today), -1);
      return { from: startOfMonth(end), to: end };
    }
    case 'last30':
      return { from: shiftIsoDate(today, -29), to: today };
    case 'thisYear':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
};

// Nothing runs past today, and no window is longer than the API accepts.
export const presetRange = (id: DatePresetId, today = todayIso()): DateRange => {
  const { from, to } = rawRange(id, today);
  const end = to < today ? to : today;
  const earliest = shiftIsoDate(end, -MAX_SPAN_DAYS);
  return { from: from > earliest ? from : earliest, to: end };
};

// The first preset that spans exactly this range, or undefined for a custom one.
export const matchPreset = (range: DateRange, today = todayIso()) =>
  DATE_PRESETS.find(({ id }) => {
    const preset = presetRange(id, today);
    return preset.from === range.from && preset.to === range.to;
  })?.id;
