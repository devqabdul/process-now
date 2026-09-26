import { describe, expect, it } from 'vitest';

import { estimateElectricityCost } from './daily-log-fields';

// Exact half-up rounding in whole numbers, the way the server's Decimal does it.
const exact = (hundredths: number, ratePaise: number) =>
  (Math.floor((hundredths * ratePaise + 50) / 100) / 100).toFixed(2);

describe('estimateElectricityCost', () => {
  it('agrees with the server to the paisa', () => {
    expect(estimateElectricityCost('1.38', 9.25)).toBe('12.77');
    for (let hundredths = 1; hundredths <= 20_000; hundredths += 1)
      expect(estimateElectricityCost(String(hundredths / 100), 9.25)).toBe(exact(hundredths, 925));
  });

  it('shows nothing without a rate or a number', () => {
    expect(estimateElectricityCost('12', undefined)).toBeUndefined();
    expect(estimateElectricityCost('abc', 9.25)).toBeUndefined();
  });
});
