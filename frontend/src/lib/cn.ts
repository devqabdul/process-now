import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the design-token names from tailwind.css, otherwise it can't tell
// `text-fg-muted` (colour) from `text-sm` (size) and may drop one of them.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        { canvas: ['', 'hover'] },
        { skeleton: ['', 'shine'] },
        { surface: ['', 'subtle', 'hover', 'muted', 'strong'] },
        { line: ['', 'input', 'field', 'subtle', 'strong'] },
        { fg: ['', 'secondary', 'muted', 'subtle', 'faint'] },
        'placeholder',
        { primary: ['', 'hover', 'fg'] },
        { link: ['', 'hover'] },
        { focus: ['', 'ring'] },
        { success: ['', 'solid', 'bright', 'soft', 'softer', 'line'] },
        { warning: ['', 'solid', 'bright', 'soft'] },
        { danger: ['', 'strong', 'solid', 'soft', 'softer', 'field', 'line'] },
        { info: ['', 'solid', 'soft'] },
        { violet: ['', 'solid', 'soft'] },
        { brand: ['bg', 'fg', 'muted', 'faint', 'line'] },
      ],
      radius: ['6', '7', '8', '9', '10', '11', '12', '13', '14', '16', '18', '20'],
      shadow: ['card', 'raise', 'button', 'popover', 'dialog', 'modal', 'sheet', 'focus'],
      animate: [
        'mark-spin',
        'rise',
        'fade-in',
        'pop',
        'shake',
        'modal-in',
        'toast-in',
        'sheet-in',
        'palette-in',
        'drift',
        'pulse-dot',
        'shimmer',
        'routebar',
      ],
      ease: ['out-expo'],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
