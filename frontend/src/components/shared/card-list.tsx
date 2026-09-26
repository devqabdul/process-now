import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { VIRTUALIZE_THRESHOLD } from '@components/ui/data-table';
import { cn } from '@lib/cn';

interface CardListProps<T> {
  items: T[];
  rowKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  label: string;
  loading?: boolean;
  // One placeholder card, repeated while loading.
  skeleton?: ReactNode;
  skeletonCount?: number;
  empty?: ReactNode;
  error?: ReactNode;
  // The same line DataTable shows over its rows.
  summary?: ReactNode;
  // Usually LoadMore.
  footer?: ReactNode;
  className?: string;
}

const GAP = 12;
const ESTIMATED_CARD = 120;

// The phone twin of DataTable: cards instead of rows, the page as the scroller.
// Empty and error states sit in the same frame a card does, so the list keeps its shape.
const FRAME = 'rounded-14 border border-line bg-surface';

export const CardList = <T,>({
  items,
  rowKey,
  renderItem,
  label,
  loading = false,
  skeleton,
  skeletonCount = 4,
  empty,
  error,
  summary,
  footer,
  className,
}: CardListProps<T>) => {
  // state
  const [scrollMargin, setScrollMargin] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  // derived
  const showItems = !loading && !error;
  const virtualized = showItems && items.length > VIRTUALIZE_THRESHOLD;
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => ESTIMATED_CARD,
    gap: GAP,
    overscan: 4,
    scrollMargin,
    enabled: virtualized,
  });

  // effects
  useLayoutEffect(() => {
    if (!virtualized || !list.current) return;
    setScrollMargin(list.current.getBoundingClientRect().top + window.scrollY);
  }, [virtualized, items.length]);

  return (
    <div aria-busy={loading} className={cn('flex flex-col gap-3', className)}>
      {loading &&
        Array.from({ length: skeletonCount }, (_, index) => <div key={index}>{skeleton}</div>)}
      {!loading && error && <div className={FRAME}>{error}</div>}
      {showItems && items.length === 0 && empty && <div className={FRAME}>{empty}</div>}
      {showItems && items.length > 0 && summary && (
        <p className="text-13 text-fg-muted">{summary}</p>
      )}

      {showItems && items.length > 0 && !virtualized && (
        <ul aria-label={label} className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={rowKey(item)}>{renderItem(item)}</li>
          ))}
        </ul>
      )}

      {virtualized && (
        <ul
          ref={list}
          aria-label={label}
          className="relative"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtual) => {
            const item = items[virtual.index];
            if (item === undefined) return null;
            return (
              <li
                key={rowKey(item)}
                ref={virtualizer.measureElement}
                data-index={virtual.index}
                aria-setsize={items.length}
                aria-posinset={virtual.index + 1}
                className="absolute inset-x-0 top-0"
                style={{ transform: `translateY(${virtual.start - scrollMargin}px)` }}
              >
                {renderItem(item)}
              </li>
            );
          })}
        </ul>
      )}

      {showItems && footer}
    </div>
  );
};
