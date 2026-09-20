import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyTheme,
  readStoredTheme,
  setTheme,
  THEME_STORAGE_KEY,
  THEME_SWITCHING_CLASS,
} from './theme';
import { useTheme } from './use-theme';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  applyTheme('light');
  document.documentElement.classList.remove(THEME_SWITCHING_CLASS);
});

describe('theme', () => {
  it('sets data-theme on <html> and remembers the choice', () => {
    setTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');

    setTheme('light');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(readStoredTheme()).toBe('light');
  });

  it('falls back to light for unknown stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(readStoredTheme()).toBe('light');
  });

  it('still applies the theme when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => setTheme('dark')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(readStoredTheme()).toBe('light');
  });

  it('only marks <html> as switching for the length of the cross-fade', () => {
    vi.useFakeTimers();
    const root = document.documentElement;

    setTheme('dark');
    expect(root).toHaveClass(THEME_SWITCHING_CLASS);

    // A second toggle mid-flight restarts the window instead of cutting it short.
    vi.advanceTimersByTime(200);
    setTheme('light');
    vi.advanceTimersByTime(200);
    expect(root).toHaveClass(THEME_SWITCHING_CLASS);

    vi.advanceTimersByTime(100);
    expect(root).not.toHaveClass(THEME_SWITCHING_CLASS);
  });

  it('keeps every useTheme() consumer on the same value', () => {
    const topBar = renderHook(() => useTheme());
    const sheet = renderHook(() => useTheme());

    act(() => topBar.result.current.toggleTheme());
    expect(topBar.result.current.theme).toBe('dark');
    expect(sheet.result.current.theme).toBe('dark');

    act(() => sheet.result.current.toggleTheme());
    expect(topBar.result.current.theme).toBe('light');
    expect(sheet.result.current.theme).toBe('light');
  });
});
