import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@lib/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Required: icon-only buttons need an accessible name.
  'aria-label': string;
}

// A toolbar's icon buttons (search, export, filters) sit outlined beside the search field.
export const ICON_BUTTON_BORDERED =
  'border border-line bg-surface hover:border-line-strong hover:bg-surface lg:size-9.5';

// 44px touch target on phones, the design's 34px from lg up. Pass a 17px lucide icon as the child.
export const IconButton = ({ className, type = 'button', ...props }: IconButtonProps) => (
  <button
    type={type}
    className={cn(
      'grid size-11 flex-none place-items-center rounded-10 text-fg-secondary transition-colors duration-150 hover:bg-surface-muted hover:text-fg aria-pressed:bg-surface-muted lg:size-8.5',
      className,
    )}
    {...props}
  />
);
