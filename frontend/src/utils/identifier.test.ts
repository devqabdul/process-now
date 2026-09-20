import { describe, expect, it } from 'vitest';

import { toMobileInput } from './identifier';

describe('toMobileInput', () => {
  it('keeps a ten-digit number that starts with 91', () => {
    expect(toMobileInput('9198765432')).toBe('9198765432');
  });

  it('drops a country code or leading zero only once there are too many digits', () => {
    expect(toMobileInput('+91 98000 22222')).toBe('9800022222');
    expect(toMobileInput('098000 22222')).toBe('9800022222');
  });

  it('never holds more than ten digits, typed one at a time or pasted', () => {
    const typed = '+91 98000 33333'
      .split('')
      .reduce((value, char) => toMobileInput(value + char), '');
    expect(typed).toBe('9800033333');
    expect(toMobileInput('98000222229999')).toHaveLength(10);
  });
});
