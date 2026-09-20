export type LayoutMode = 'sidebar' | 'top';

// Desktop chrome preference; the phone layout (top bar + bottom tabs) ignores it.
export const LAYOUT_MODE_STORAGE_KEY = 'pn.layout';

export const readStoredLayoutMode = (): LayoutMode => {
  try {
    return localStorage.getItem(LAYOUT_MODE_STORAGE_KEY) === 'top' ? 'top' : 'sidebar';
  } catch {
    return 'sidebar';
  }
};

export const storeLayoutMode = (mode: LayoutMode) => {
  try {
    localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, mode);
  } catch {
    // Storage blocked (private mode): the choice still applies for this visit.
  }
};
