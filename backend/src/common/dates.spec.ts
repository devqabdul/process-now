import { addDays, dayRange, isDateString, today } from './dates.js';

describe('dates', () => {
  it('uses IST for today', () => {
    // 20:00 UTC on the 19th is 01:30 IST on the 20th
    expect(today(new Date('2026-09-19T20:00:00Z'))).toBe('2026-09-20');
  });

  it('gives the IST day as UTC instants', () => {
    expect(dayRange('2026-09-20')).toEqual({
      gte: new Date('2026-09-19T18:30:00Z'),
      lt: new Date('2026-09-20T18:30:00Z'),
    });
  });

  it('validates real dates', () => {
    expect(isDateString('2026-02-28')).toBe(true);
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('20-02-2026')).toBe(false);
  });

  it('adds days across months', () => {
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });
});
