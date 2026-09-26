import {
  type CellData,
  type ColumnDef,
  columnVisibilityFeature,
  type ColumnVisibilityState,
  createSortedRowModel,
  functionalUpdate,
  type RowData,
  rowSortingFeature,
  sortFn_text,
  type SortingState,
  type TableFeatures,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@lib/cn';
import type { CsvValue } from '@utils/csv';

import { Skeleton } from './skeleton';

declare module '@tanstack/table-core' {
  // Declared globally (not on the columnMeta slot) so exportValue's row is typed per table.
  /* eslint-disable @typescript-eslint/no-unused-vars -- merged declarations must repeat the library's type parameters verbatim */
  interface ColumnMeta<
    TFeatures extends TableFeatures,
    TData extends RowData,
    TValue extends CellData = CellData,
  > {
    // Applied to the <th> and every <td> of the column (width, alignment).
    className?: string;
    // Human name for the Columns picker and the CSV header; defaults to a string header.
    label?: string;
    // CSV value for this column; a column without one is left out of the export.
    exportValue?: (row: TData) => CsvValue;
    // Identity columns (the name a row is known by) pass false so they can't be hidden.
    hideable?: boolean;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});

export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T>;
export type { ColumnVisibilityState, SortingState };

// Above this many rows only the rows in view are rendered; the page itself stays the scroller.
export const VIRTUALIZE_THRESHOLD = 100;
// ponytail: rows are estimated at their fixed h-14, not measured; measure if cells start wrapping.
const ROW_HEIGHT = 56;

// Sorting is opt-in: a column asks for it with `enableSorting: true`.
const DEFAULT_COLUMN = { enableSorting: false };

const ARIA_SORT = { asc: 'ascending', desc: 'descending', none: 'none' } as const;
const SORT_ICON = { asc: ArrowUp, desc: ArrowDown, none: ArrowUpDown };

const columnId = <T extends RowData>(column: DataTableColumn<T>) =>
  column.id ?? ('accessorKey' in column ? String(column.accessorKey) : '');

const columnLabel = <T extends RowData>(column: DataTableColumn<T>) =>
  column.meta?.label ?? (typeof column.header === 'string' ? column.header : columnId(column));

// The Columns picker's list, straight from the column definitions.
export const pickerColumns = <T extends RowData>(
  columns: DataTableColumn<T>[],
  visibility: ColumnVisibilityState,
) =>
  columns.map((column) => {
    const id = columnId(column);
    return {
      id,
      label: columnLabel(column),
      visible: visibility[id] !== false,
      hideable: column.meta?.hideable !== false,
    };
  });

// Headers and values for a CSV of `rows` — every column with an exportValue, hidden or not.
export const exportRows = <T extends RowData>(columns: DataTableColumn<T>[], rows: T[]) => {
  const exported = columns.filter((column) => column.meta?.exportValue);
  return {
    headers: exported.map(columnLabel),
    rows: rows.map((row) => exported.map((column) => column.meta?.exportValue?.(row))),
  };
};

interface DataTableProps<T extends RowData> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  label: string;
  // First load: skeleton rows.
  loading?: boolean;
  skeletonRows?: number;
  // A later fetch (next page, new sort): rows stay put, dimmed, under a progress line.
  refreshing?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  columnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: (next: ColumnVisibilityState) => void;
  // Server-side sorting: rows arrive already ordered and a header click only reports the new sort.
  sorting?: SortingState;
  onSortingChange?: (next: SortingState) => void;
  // One line over the rows ("₹2,000 spent · 1 expense"); shown only while there are rows.
  summary?: ReactNode;
  footer?: ReactNode;
  className?: string;
  // Keeps columns readable on phones; the wrapper scrolls horizontally.
  tableClassName?: string;
}

const CELL = 'px-4 text-13';
// A row's ⋮ menu: shrinks to its button and hugs the right edge, the same in every table.
export const ACTIONS_COLUMN_ID = 'actions';
const ACTIONS = 'w-px whitespace-nowrap pr-3 text-right [&>*]:ml-auto';
const columnClass = (id: string, className?: string) =>
  cn(id === ACTIONS_COLUMN_ID && ACTIONS, className);
// Last in the merge: a column's cell type (mono, muted, 11px) never restyles its header.
const HEAD = 'h-11 font-sans text-xs font-semibold text-fg-secondary whitespace-nowrap';

export const DataTable = <T extends RowData>({
  columns,
  rows,
  rowKey,
  label,
  loading = false,
  skeletonRows = 6,
  refreshing = false,
  error,
  empty,
  columnVisibility,
  onColumnVisibilityChange,
  sorting,
  onSortingChange,
  summary,
  footer,
  className,
  tableClassName,
}: DataTableProps<T>) => {
  // state
  const [scrollMargin, setScrollMargin] = useState(0);
  const body = useRef<HTMLTableSectionElement>(null);

  // wiring
  const manualSorting = sorting !== undefined;
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    defaultColumn: DEFAULT_COLUMN,
    getRowId: rowKey,
    state: {
      ...(columnVisibility ? { columnVisibility } : {}),
      ...(sorting ? { sorting } : {}),
    },
    ...(onColumnVisibilityChange
      ? {
          onColumnVisibilityChange: (updater) =>
            onColumnVisibilityChange(functionalUpdate(updater, columnVisibility ?? {})),
        }
      : {}),
    ...(manualSorting
      ? {
          manualSorting: true,
          enableMultiSort: false,
          sortDescFirst: false,
          onSortingChange: (updater) => onSortingChange?.(functionalUpdate(updater, sorting)),
        }
      : {}),
  });

  // derived
  const tableRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const showRows = !loading && !error;
  const virtualized = showRows && tableRows.length > VIRTUALIZE_THRESHOLD;
  const hasRows = showRows && rows.length > 0;

  const virtualizer = useWindowVirtualizer({
    count: tableRows.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    scrollMargin,
    enabled: virtualized,
  });
  const items = virtualized ? virtualizer.getVirtualItems() : [];
  const first = items[0];
  const last = items.at(-1);
  const padTop = first ? first.start - scrollMargin : 0;
  const padBottom = last ? virtualizer.getTotalSize() - (last.end - scrollMargin) : 0;
  const renderedRows = virtualized
    ? items.flatMap((item) => {
        const row = tableRows[item.index];
        return row ? [{ row, index: item.index }] : [];
      })
    : tableRows.map((row, index) => ({ row, index }));

  // effects
  useLayoutEffect(() => {
    if (!virtualized || !body.current) return;
    setScrollMargin(body.current.getBoundingClientRect().top + window.scrollY);
  }, [virtualized, rows.length]);

  return (
    <div
      aria-busy={loading || refreshing}
      className={cn('overflow-hidden rounded-14 border border-line-input bg-surface', className)}
    >
      {summary && hasRows && (
        <div className="border-b border-line-subtle px-4 py-3 text-13 text-fg-muted">{summary}</div>
      )}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard reachable (WCAG 2.1.1) */}
      <div tabIndex={0} role="region" aria-label={label} className="overflow-x-auto">
        <table
          aria-rowcount={virtualized ? tableRows.length + 1 : undefined}
          className={cn('w-full border-collapse text-left', tableClassName)}
        >
          <caption className="sr-only">{label}</caption>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                aria-rowindex={virtualized ? 1 : undefined}
                className="relative border-b border-line bg-surface-subtle"
              >
                {headerGroup.headers.map((header, headerIndex) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const direction = sorted === false ? 'none' : sorted;
                  const SortIcon = SORT_ICON[direction];

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sortable ? ARIA_SORT[direction] : undefined}
                      className={cn(
                        CELL,
                        columnClass(header.column.id, header.column.columnDef.meta?.className),
                        HEAD,
                      )}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-my-2 inline-flex items-center gap-1.5 py-2 text-left transition-colors duration-150 hover:text-fg"
                        >
                          <table.FlexRender header={header} />
                          <SortIcon
                            aria-hidden="true"
                            strokeWidth={2.2}
                            className={cn('size-3', direction === 'none' && 'text-fg-faint')}
                          />
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                      {refreshing && headerIndex === 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden"
                        >
                          <span className="block h-full w-[38%] animate-routebar bg-[linear-gradient(90deg,transparent,var(--pn-primary),transparent)]" />
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody
            ref={body}
            className={cn('transition-opacity duration-200', refreshing && 'opacity-60')}
          >
            {loading &&
              Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={rowIndex} className="h-14 border-b border-line-subtle last:border-0">
                  {visibleColumns.map((column, columnIndex) => (
                    <td
                      key={column.id}
                      className={cn(CELL, columnClass(column.id, column.columnDef.meta?.className))}
                    >
                      <Skeleton
                        className={columnIndex === 0 ? 'w-3/5' : 'w-4/5'}
                        style={{ animationDelay: `${rowIndex * 0.08}s` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && error && (
              <tr>
                <td colSpan={visibleColumns.length}>{error}</td>
              </tr>
            )}

            {padTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={visibleColumns.length} style={{ height: padTop, padding: 0 }} />
              </tr>
            )}

            {showRows &&
              renderedRows.map(({ row, index }) => (
                <tr
                  key={row.id}
                  aria-rowindex={virtualized ? index + 2 : undefined}
                  className="h-14 border-b border-line-subtle transition-colors duration-150 last:border-0 hover:bg-surface-hover"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        CELL,
                        columnClass(cell.column.id, cell.column.columnDef.meta?.className),
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}

            {padBottom > 0 && (
              <tr aria-hidden="true">
                <td colSpan={visibleColumns.length} style={{ height: padBottom, padding: 0 }} />
              </tr>
            )}

            {showRows && rows.length === 0 && empty && (
              <tr>
                <td colSpan={visibleColumns.length}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Nothing to page through while loading, failed or empty; a footer that renders nothing
          (Pagination on a single page) takes its border with it. */}
      {footer && hasRows && (
        <div className="border-t border-line px-4 py-3 empty:hidden">{footer}</div>
      )}
    </div>
  );
};
