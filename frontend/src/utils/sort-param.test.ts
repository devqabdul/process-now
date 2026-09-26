import { describe, expect, it } from 'vitest';

import { fromSortParam, toSortParam } from './sort-param';

describe('sort param', () => {
  it('maps table sorting to the API string', () => {
    expect(toSortParam([])).toBeUndefined();
    expect(toSortParam([{ id: 'name', desc: false }])).toBe('name');
    expect(toSortParam([{ id: 'name', desc: true }])).toBe('-name');
  });

  it('maps the API string back to table sorting', () => {
    expect(fromSortParam(undefined)).toEqual([]);
    expect(fromSortParam('')).toEqual([]);
    expect(fromSortParam('-')).toEqual([]);
    expect(fromSortParam('createdAt')).toEqual([{ id: 'createdAt', desc: false }]);
    expect(fromSortParam('-createdAt')).toEqual([{ id: 'createdAt', desc: true }]);
  });

  it('round-trips', () => {
    expect(fromSortParam(toSortParam([{ id: 'total', desc: true }]))).toEqual([
      { id: 'total', desc: true },
    ]);
  });
});
