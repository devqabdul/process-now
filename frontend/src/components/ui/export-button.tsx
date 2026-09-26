import { Download } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@lib/cn';

import { ICON_BUTTON_BORDERED, IconButton } from './icon-button';
import { Spinner } from './spinner';

interface ExportButtonProps {
  // Gathers every matching row (not just this page) and downloads it; spins until it settles.
  onExport: () => Promise<void>;
  label?: string;
  className?: string;
}

// Secondary on purpose: the page's one solid button is its primary action (Add expense, …).
export const ExportButton = ({ onExport, label = 'Export CSV', className }: ExportButtonProps) => {
  const [exporting, setExporting] = useState(false);

  // callbacks
  const run = async () => {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

  return (
    <IconButton
      aria-label={label}
      title={label}
      aria-busy={exporting}
      disabled={exporting}
      onClick={() => void run()}
      className={cn(ICON_BUTTON_BORDERED, 'disabled:cursor-wait', className)}
    >
      {exporting ? (
        <Spinner />
      ) : (
        <Download aria-hidden="true" className="size-4" strokeWidth={1.8} />
      )}
    </IconButton>
  );
};
