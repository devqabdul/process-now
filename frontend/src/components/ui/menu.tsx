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
  // Focus back on ⋮, so a dialog an item opens restores focus there when it closes.
  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  };

  // Pinned to the trigger's bottom-right.
  const anchor = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    anchor();
    setOpen(true);
  };

  // effects
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    const onClick = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    // Fixed coordinates go stale when anything scrolls, so the menu follows its trigger.
    // Closing instead would also close it on the scroll a click itself causes, when the
    // browser brings a half-hidden ⋮ into view.
    window.addEventListener('scroll', anchor, true);
    window.addEventListener('resize', anchor);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', anchor, true);
      window.removeEventListener('resize', anchor);
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
          {/* eslint-disable-next-line react-hooks/refs -- close is only called from item handlers, never during render. */}
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
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  // Destructive items read as destructive before they are clicked, not after.
  tone?: 'neutral' | 'danger';
  disabled?: boolean | undefined;
}) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex w-full items-center gap-2 px-3 py-2.5 text-left text-13 transition-colors duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      tone === 'danger'
        ? 'text-danger-strong hover:bg-danger-soft focus-visible:bg-danger-soft'
        : 'hover:bg-surface-muted focus-visible:bg-surface-muted',
    )}
  >
    {children}
  </button>
);
