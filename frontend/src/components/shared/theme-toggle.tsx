import { Moon, Sun } from 'lucide-react';

import { IconButton } from '@components/ui/icon-button';
import { useTheme } from '@lib/theme';

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <IconButton
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === 'dark'}
      onClick={toggleTheme}
      {...(className ? { className } : {})}
    >
      <Icon aria-hidden="true" className="size-4.25" strokeWidth={1.7} />
    </IconButton>
  );
};
