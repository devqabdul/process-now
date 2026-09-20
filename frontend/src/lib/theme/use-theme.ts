import { useSyncExternalStore } from 'react';

import { currentTheme, setTheme, subscribeTheme, type Theme } from './theme';

// One store for every toggle in the tree: the top bar and the mobile account sheet
// render the same value instead of each keeping its own copy.
export const useTheme = () => {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, currentTheme, () => 'light');

  return {
    theme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };
};
