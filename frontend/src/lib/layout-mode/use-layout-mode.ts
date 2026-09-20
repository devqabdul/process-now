import { useState } from 'react';

import { type LayoutMode, readStoredLayoutMode, storeLayoutMode } from './layout-mode';

export const useLayoutMode = () => {
  const [layout, setLayoutState] = useState<LayoutMode>(readStoredLayoutMode);

  const setLayout = (mode: LayoutMode) => {
    storeLayoutMode(mode);
    setLayoutState(mode);
  };

  return { layout, setLayout };
};
