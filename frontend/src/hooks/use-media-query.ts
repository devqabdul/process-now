import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Lets a page render one layout instead of shipping both and hiding one with CSS.
export const useMediaQuery = (query: string) => {
  const list = useMemo(
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query) : null),
    [query],
  );

  const subscribe = useCallback(
    (onChange: () => void) => {
      list?.addEventListener('change', onChange);
      return () => list?.removeEventListener('change', onChange);
    },
    [list],
  );

  return useSyncExternalStore(subscribe, () => list?.matches ?? false);
};
