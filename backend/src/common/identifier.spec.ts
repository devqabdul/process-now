import { parseIdentifier, toMobileDigits } from './identifier.js';

describe('identifier', () => {
  it.each([
    ['98000 22222', '9800022222'],
    ['+91 98000 22222', '9800022222'],
    ['919800022222', '9800022222'],
    ['098000-22222', '9800022222'],
  ])('normalizes %s', (raw, expected) => {
    expect(toMobileDigits(raw)).toBe(expected);
  });

  it('routes by @', () => {
    expect(parseIdentifier(' Admin@FuseNow.in ')).toEqual({
      email: 'admin@fusenow.in',
    });
    expect(parseIdentifier('+91 98000 22222')).toEqual({ phone: '9800022222' });
  });
});
