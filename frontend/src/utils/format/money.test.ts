import { describe, expect, it } from 'vitest';

import { formatMoney } from './money';

describe('formatMoney', () => {
  it('never rounds paise away — the screen is what a vendor pays from', () => {
    expect(formatMoney('531.50')).toBe('₹531.50');
    expect(formatMoney('99.99')).toBe('₹99.99');
    expect(formatMoney('2468.75')).toBe('₹2,468.75');
  });

  it('drops paise only when they are zero', () => {
    expect(formatMoney('246800.00')).toBe('₹2,46,800');
    expect(formatMoney('450')).toBe('₹450');
  });

  it('shows a dash rather than ₹NaN for a malformed amount', () => {
    expect(formatMoney('')).toBe('—');
    expect(formatMoney('not-a-number')).toBe('—');
  });
});
