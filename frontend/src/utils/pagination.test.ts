import { describe, expect, it } from 'vitest';

import { pageCountOf, pageItems } from './pagination';

describe('pageItems', () => {
  it('returns nothing for no pages and a lone page for one', () => {
    expect(pageItems(1, 0)).toEqual([]);
    expect(pageItems(1, 1)).toEqual([1]);
  });

  it('lists every page when there are too few to elide', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('elides the middle from either edge', () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 'ellipsis', 5]);
    expect(pageItems(5, 5)).toEqual([1, 'ellipsis', 4, 5]);
  });

  it('elides both sides around the current page', () => {
    expect(pageItems(5, 20)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 20]);
  });

  it('shows a single hidden page instead of an ellipsis', () => {
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
    expect(pageItems(1, 4)).toEqual([1, 2, 3, 4]);
  });

  it('counts pages from a total', () => {
    expect(pageCountOf(0, 15)).toBe(0);
    expect(pageCountOf(15, 15)).toBe(1);
    expect(pageCountOf(16, 15)).toBe(2);
  });
});
