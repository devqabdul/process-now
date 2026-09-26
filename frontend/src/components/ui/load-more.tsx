import { cn } from '@lib/cn';

import { Button } from './button';

interface LoadMoreProps {
  shown: number;
  total: number;
  loading?: boolean;
  onLoadMore: () => void;
  className?: string;
}

const format = (n: number) => new Intl.NumberFormat('en-IN').format(n);

// Phones page by appending: a card list has no room for page numbers.
export const LoadMore = ({
  shown,
  total,
  loading = false,
  onLoadMore,
  className,
}: LoadMoreProps) => {
  if (total === 0) return null;
  const done = shown >= total;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {!done && (
        <Button
          variant="secondary"
          size="md"
          loading={loading}
          onClick={onLoadMore}
          className="w-full"
        >
          {loading ? 'Loading…' : 'Load more'}
        </Button>
      )}
      <p className="text-xs text-fg-subtle tabular-nums">
        {done ? `All ${format(total)} shown` : `Showing ${format(shown)} of ${format(total)}`}
      </p>
    </div>
  );
};
