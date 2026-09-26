import { describe, expect, it } from 'vitest';

import { formatCreatedOn, formatShortDate, formatWeekdayDate } from './date';

describe('date formats', () => {
  it('spells every month in three letters, September too', () => {
    expect(formatShortDate('2026-08-28')).toBe('28 Aug');
    expect(formatShortDate('2026-09-26')).toBe('26 Sep');
    expect(formatWeekdayDate('2026-09-26')).toBe('Sat, 26 Sep');
    expect(formatCreatedOn('2026-09-01T06:00:00.000Z')).toBe('1 Sep 2026');
  });

  it('dates a timestamp by its IST day, not its UTC one', () => {
    // 18:31 UTC on the 26th is 00:01 IST on the 27th
    expect(formatShortDate('2026-09-26T18:31:48.621Z')).toBe('27 Sep');
    expect(formatShortDate('2026-09-26T09:30:00.000Z')).toBe('26 Sep');
  });
});
