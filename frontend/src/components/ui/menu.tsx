import { MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@lib/cn';

interface MenuProps {
  label: string;
  children: (close: () => void) => ReactNode;
  className?: string;
  // Restyles the ⋮ button, e.g. as a quick-action tile.
  triggerClassName?: string;
}

/**
 * A ⋮ button with a small popup. Closes on Escape, on an outside click and after
 * an item runs — the three ways a person expects a menu to go away.
 *
 * The popup is fixed, not absolute: inside the table it would otherwise be clipped by the
 * scroll container and drag a horizontal scrollbar into view. A z-index alone cannot fix
 * that — an overflow clip ignores it — so the popup leaves the container instead.
 */
export const Menu = ({ label, children, className, triggerClassName }: MenuProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // callbacks
  const close = () => setOpen(false);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = trigger.current?.getBoundingClientRect();
    // Pinned to the trigger's bottom-right, measured at the moment it opens.
    if (rect) setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(true);
  };

  // effects
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    const onClick = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    // Fixed coordinates go stale the moment anything scrolls, so the menu leaves with it.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          'flex size-11 items-center justify-center rounded-10 text-fg-subtle hover:bg-surface-muted hover:text-fg lg:size-8',
          triggerClassName,
        )}
      >
        <MoreVertical aria-hidden="true" className="size-4" strokeWidth={1.9} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          style={{ top: position.top, right: position.right }}
          className="fixed z-50 min-w-44 overflow-hidden rounded-12 border border-line bg-surface py-1 shadow-popover"
        >
          {children(close)}
        </div>
      )}
    </div>
  );
};

export const MenuItem = ({
  children,
  onClick,
  tone = 'neutral',
}: {
  children: ReactNode;
  onClick: () => void;
  // Destructive items read as destructive before they are clicked, not after.
  tone?: 'neutral' | 'danger';
}) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-2 px-3 py-2.5 text-left text-13 transition-colors duration-150 focus-visible:outline-none',
      tone === 'danger'
        ? 'text-danger-strong hover:bg-danger-soft focus-visible:bg-danger-soft'
        : 'hover:bg-surface-muted focus-visible:bg-surface-muted',
    )}
  >
    {children}
  </button>
);
