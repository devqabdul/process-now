export type Theme = 'light' | 'dark';

// Same key the design files use, so a choice made there carries over.
export const THEME_STORAGE_KEY = 'pn.colorMode';

const systemTheme = (): Theme =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

// No stored choice yet: follow the phone's own setting rather than forcing light.
export const readStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Storage blocked: fall through to the system preference.
  }
  return systemTheme();
};

export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

// <html> is the single source of truth; these let every useTheme() re-read it together
// instead of each hook instance keeping its own copy.
const listeners = new Set<() => void>();

export const subscribeTheme = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

export const applyTheme = (theme: Theme) => {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  listeners.forEach((notify) => notify());
};

// Cross-fade colours only while the theme is actually changing. The transition used to sit on
// `:root[data-theme='dark'] *` permanently, so every hover animated a style recalc across the tree.
export const THEME_SWITCHING_CLASS = 'theme-switching';
const THEME_SWITCH_MS = 250;
let switchTimer: ReturnType<typeof setTimeout> | undefined;

export const setTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.add(THEME_SWITCHING_CLASS);
  clearTimeout(switchTimer);
  switchTimer = setTimeout(() => root.classList.remove(THEME_SWITCHING_CLASS), THEME_SWITCH_MS);

  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the theme still applies for this visit.
  }
};
