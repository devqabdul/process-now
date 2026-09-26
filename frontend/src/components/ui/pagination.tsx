import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@lib/cn';
import { pageCountOf, pageItems } from '@utils/pagination';

import { IconButton } from './icon-button';

interface PaginationProps {
  // 1-based, matching the API's `page`.
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
  className?: string;
}

const PAGE =
  'grid size-11 place-items-center rounded-full text-13 font-medium tabular-nums transition-colors duration-150 lg:size-8.5';

export const Pagination = ({
  page,
  pageSize,
  total,
  pageSizeOptions = [15, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  disabled = false,
  className,
}: PaginationProps) => {
  const sizeId = useId();
  const pageCount = pageCountOf(total, pageSize);

  // One page's worth at the smallest size needs no footer; the summary line carries the count.
  if (total <= Math.min(...pageSizeOptions)) return null;

  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-13', className)}
    >
      <div className="flex items-center gap-2">
        <label htmlFor={sizeId} className="text-fg-muted">
          Lines per page
        </label>
        <span className="relative">
          <select
            id={sizeId}
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-11 appearance-none rounded-10 border border-line-field bg-surface pr-7 pl-2.5 font-medium tabular-nums focus-visible:shadow-focus focus-visible:outline-none disabled:opacity-60 lg:h-8.5"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            strokeWidth={2}
            className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-fg-subtle"
          />
        </span>
      </div>

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-0.5">
          <IconButton
            aria-label="Previous page"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          </IconButton>
          <ul className="flex items-center gap-0.5">
            {pageItems(page, pageCount).map((item, index) =>
              item === 'ellipsis' ? (
                <li key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-fg-subtle">
                  …
                </li>
              ) : (
                <li key={item}>
                  <button
                    type="button"
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? 'page' : undefined}
                    disabled={disabled}
                    onClick={() => item !== page && onPageChange(item)}
                    className={cn(
                      PAGE,
                      item === page
                        ? 'bg-primary text-primary-fg'
                        : 'text-fg-secondary hover:bg-surface-muted hover:text-fg',
                    )}
                  >
                    {item}
                  </button>
                </li>
              ),
            )}
          </ul>
          <IconButton
            aria-label="Next page"
            disabled={disabled || page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
          </IconButton>
        </nav>
      )}
    </div>
  );
};
