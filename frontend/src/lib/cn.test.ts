import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('keeps a form token next to a colour or a stock spacing class', () => {
    expect(cn('text-label text-fg-secondary')).toBe('text-label text-fg-secondary');
    expect(cn('h-11', 'h-control')).toBe('h-control');
    expect(cn('gap-x-field-x gap-y-field')).toBe('gap-x-field-x gap-y-field');
  });
});
