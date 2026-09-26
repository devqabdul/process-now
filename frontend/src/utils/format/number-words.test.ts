import { describe, expect, it } from 'vitest';

import { numberInWords } from './number-words';

describe('numberInWords', () => {
  it('reads money in lakh and crore, with paise', () => {
    expect(numberInWords('125000.5', { money: true })).toEqual({
      digits: '₹1,25,000.5',
      words: 'One Lakh Twenty Five Thousand Rupees And Fifty Paise',
    });
    expect(numberInWords('10000000', { money: true })?.words).toBe('One Crore Rupees');
  });

  it('switches to thousand and million, still in rupees', () => {
    expect(numberInWords('1250000', { money: true, system: 'international' })?.words).toBe(
      'One Million Two Hundred Fifty Thousand Rupees',
    );
  });

  it('names the unit of a quantity and ignores half-typed input', () => {
    expect(numberInWords('95', { unit: 'kg' })?.words).toBe('Ninety Five kg');
    expect(numberInWords('')).toBeNull();
    expect(numberInWords('12.')).toBeNull();
    expect(numberInWords('-4')).toBeNull();
  });
});
