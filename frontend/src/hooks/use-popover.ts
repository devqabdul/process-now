import { type CSSProperties, useEffect, useRef, useState } from 'react';

type Align = 'start' | 'end';

// A popup pinned `fixed` to its trigger, measured on open: inside a table or a scrolling toolbar
// an absolute popup is clipped by the overflow container (see ui/menu.tsx).
export const usePopover = (align: Align = 'start') => {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // callbacks
  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setStyle(
        align === 'end'
          ? { top: rect.bottom + 6, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 6, left: rect.left },
      );
    }
    setOpen(true);
  };

  // effects
  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (panelRef.current?.contains(target) || triggerRef.current?.contains(target));
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Inside a modal (the phone Filters sheet) Escape closes the popover, not the sheet too.
      event.preventDefault();
      close(true);
    };
    const onPointer = (event: PointerEvent) => {
      if (!inside(event.target)) close();
    };
    // Fixed coordinates go stale when the page scrolls; scrolling the panel's own list is fine.
    const onScroll = (event: Event) => {
      if (!inside(event.target)) close();
    };
    const onResize = () => close();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    panelRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return { open, style, toggle, close, triggerRef, panelRef };
};
