import { useState } from 'react';

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

// A per-browser preference (e.g. a table's hidden columns). A private window or a corrupt value
// falls back to the default rather than breaking the render.
export const usePersistedState = <T>(key: string, fallback: T) => {
  const [value, setValue] = useState<T>(() => read(key, fallback));

  const update = (next: T | ((previous: T) => T)) => {
    setValue((previous) => {
      const resolved = next instanceof Function ? next(previous) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Storage full or blocked: the preference lives for this session only.
      }
      return resolved;
    });
  };

  return [value, update] as const;
};
