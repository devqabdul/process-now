import { afterEach, describe, expect, it, vi } from 'vitest';

import { LAYOUT_MODE_STORAGE_KEY, readStoredLayoutMode, storeLayoutMode } from './layout-mode';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('layout mode', () => {
  it('remembers the choice', () => {
    storeLayoutMode('top');
    expect(localStorage.getItem(LAYOUT_MODE_STORAGE_KEY)).toBe('top');
    expect(readStoredLayoutMode()).toBe('top');

    storeLayoutMode('sidebar');
    expect(readStoredLayoutMode()).toBe('sidebar');
  });

  it('falls back to the sidebar layout for unknown or missing values', () => {
    expect(readStoredLayoutMode()).toBe('sidebar');

    localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, 'split');
    expect(readStoredLayoutMode()).toBe('sidebar');
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => storeLayoutMode('top')).not.toThrow();
    expect(readStoredLayoutMode()).toBe('sidebar');
  });
});
