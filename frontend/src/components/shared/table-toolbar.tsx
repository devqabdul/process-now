import { Search, SlidersHorizontal } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Button, buttonClasses } from '@components/ui/button';
import { ColumnPicker, type PickerColumn } from '@components/ui/column-picker';
import { Dialog } from '@components/ui/dialog';
import { ExportButton } from '@components/ui/export-button';
import { ICON_BUTTON_BORDERED, IconButton } from '@components/ui/icon-button';
import { SearchInput } from '@components/ui/search-input';
import { useMediaQuery } from '@hooks/use-media-query';
import { cn } from '@lib/cn';

const SEARCH_DEBOUNCE_MS = 300;
// Hiding columns only earns its button on a wide table; at six or fewer everything fits.
export const COLUMN_PICKER_MIN_COLUMNS = 7;

interface TableToolbarProps {
  // Rows matching the current search and filters; Export and Columns need something to act on.
  rowCount: number;
  // The committed search (the API's `q`); typing reports it after a 300ms pause.
  search?: string;
  onSearchChange?: (q: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  columns?: PickerColumn[];
  onToggleColumn?: (id: string, visible: boolean) => void;
  onExport?: () => Promise<void>;
  // The filter chips: in the row from lg up, behind one Filters button on phones.
  children?: ReactNode;
  // Chips holding a value — the phone Filters badge, and whether Clear all shows.
  activeFilters?: number;
  onClearAll?: () => void;
  className?: string;
}

const CLEAR_ALL =
  'h-11 flex-none rounded-full px-3 text-13 font-medium text-fg-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-fg lg:h-8.5';

export const TableToolbar = ({
  rowCount,
  search,
  onSearchChange,
  searchLabel = 'Search',
  searchPlaceholder,
  columns,
  onToggleColumn,
  onExport,
  children,
  activeFilters = 0,
  onClearAll,
  className,
}: TableToolbarProps) => {
  // state
  const [draft, setDraft] = useState(search ?? '');
  const [searchOpen, setSearchOpen] = useState(!!search);
  const [sheetOpen, setSheetOpen] = useState(false);
  const emitted = useRef(search ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // wiring
  const wide = useMediaQuery('(min-width: 64rem)');

  // derived
  const showSearch = wide || searchOpen || draft !== '';
  const showColumns =
    wide &&
    !!columns &&
    !!onToggleColumn &&
    rowCount > 0 &&
    columns.length >= COLUMN_PICKER_MIN_COLUMNS;
  const showExport = !!onExport && rowCount > 0;
  const showClearAll = !!onClearAll && (activeFilters > 0 || !!search);

  // callbacks
  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // effects
  useEffect(() => {
    if (draft === emitted.current) return;
    const timer = setTimeout(() => {
      emitted.current = draft;
      onSearchChange?.(draft);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  // A reset from outside (Clear all, a URL change) wins over the draft.
  useEffect(() => {
    if (search === undefined || search === emitted.current) return;
    emitted.current = search;
    setDraft(search);
  }, [search]);

  if (!onSearchChange && !children && !showExport) return null;

  const searchControl =
    onSearchChange &&
    (showSearch ? (
      <SearchInput
        value={draft}
        onChange={setDraft}
        label={searchLabel}
        inputRef={inputRef}
        // On phones an empty field folds back into the icon once focus leaves it.
        onBlur={() => !wide && draft === '' && setSearchOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          setDraft('');
          setSearchOpen(false);
        }}
        {...(searchPlaceholder ? { placeholder: searchPlaceholder } : {})}
        className={wide ? 'w-64' : 'min-w-0 flex-1 animate-pop'}
      />
    ) : (
      <IconButton aria-label={searchLabel} onClick={openSearch} className={ICON_BUTTON_BORDERED}>
        <Search aria-hidden="true" className="size-4" strokeWidth={1.8} />
      </IconButton>
    ));

  const clearAll = showClearAll && (
    <button type="button" onClick={onClearAll} className={CLEAR_ALL}>
      Clear all
    </button>
  );

  if (wide) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {searchControl}
        {children}
        {clearAll}
        {(showColumns || showExport) && (
          <div className="ml-auto flex items-center gap-2">
            {showColumns && <ColumnPicker columns={columns} onToggle={onToggleColumn} />}
            {showExport && <ExportButton onExport={onExport} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setSheetOpen(true)}
          className={cn(buttonClasses('secondary', 'sm'), 'flex-none gap-2')}
        >
          <SlidersHorizontal aria-hidden="true" className="size-3.75" strokeWidth={1.9} />
          Filters
          {activeFilters > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-11 text-primary-fg tabular-nums">
              {activeFilters}
              <span className="sr-only"> active</span>
            </span>
          )}
        </button>
      )}
      {searchControl}
      {showExport && <ExportButton onExport={onExport} className="ml-auto" />}

      {children && (
        <Dialog
          bottom
          open={sheetOpen}
          title="Filters"
          cancelLabel="Close"
          onClose={() => setSheetOpen(false)}
          action={
            <Button size="md" className="w-full" onClick={() => setSheetOpen(false)}>
              Show results
            </Button>
          }
        >
          {/* One wrapping row, like the desktop toolbar — a chip per line read as unfinished. */}
          <div className="flex flex-wrap items-center gap-2">
            {children}
            {clearAll}
          </div>
        </Dialog>
      )}
    </div>
  );
};
