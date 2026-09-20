import {
  type ColumnDef,
  createSortedRowModel,
  type RowData,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@lib/cn';

import { Skeleton } from './skeleton';

// Applied to the <th> and every <td> of the column (width, alignment).
export interface DataTableColumnMeta {
  className?: string;
}

// Sorting is the only feature registered. Filtering, pagination and virtualisation attach
// here the same way (feature + row model) once a screen actually needs them.
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

// Sorting is opt-in: a column asks for it with `enableSorting: true`.
const DEFAULT_COLUMN = { enableSorting: false };

const ARIA_SORT = { asc: 'ascending', desc: 'descending', none: 'none' } as const;
const SORT_ICON = { asc: ChevronUp, desc: ChevronDown, none: ChevronsUpDown };

interface DataTableProps<T extends RowData> {
  columns: ColumnDef<DataTableFeatures, T>[];
  rows: T[];
  rowKey: (row: T) => string;
  label: string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  className?: string;
  // Keeps columns readable on phones; the wrapper scrolls horizontally.
  tableClassName?: string;
}

const CELL = 'px-3.5 py-3.25 text-[12.5px]';
const HEAD = 'font-mono text-[10px] font-medium tracking-[0.08em] text-fg-subtle uppercase';

export const DataTable = <T extends RowData>({
  columns,
  rows,
  rowKey,
  label,
  loading = false,
  skeletonRows = 6,
  empty,
  className,
  tableClassName,
}: DataTableProps<T>) => {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    defaultColumn: DEFAULT_COLUMN,
    getRowId: rowKey,
  });
  const leafColumns = table.getAllLeafColumns();

  return (
    <div
      aria-busy={loading}
      className={cn('overflow-hidden rounded-14 border border-line-input', className)}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard reachable (WCAG 2.1.1) */}
      <div tabIndex={0} role="region" aria-label={label} className="overflow-x-auto">
        <table className={cn('w-full border-collapse text-left', tableClassName)}>
          <caption className="sr-only">{label}</caption>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-line bg-surface-subtle">
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const direction = sorted === false ? 'none' : sorted;
                  const SortIcon = SORT_ICON[direction];

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sortable ? ARIA_SORT[direction] : undefined}
                      className={cn(CELL, HEAD, header.column.columnDef.meta?.className)}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-my-2 inline-flex items-center gap-1 py-2 text-left uppercase transition-colors duration-150 hover:text-fg"
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
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-line-subtle">
                  {leafColumns.map((column, columnIndex) => (
                    <td key={column.id} className={cn(CELL, column.columnDef.meta?.className)}>
                      <Skeleton
                        className={columnIndex === 0 ? 'w-3/5' : 'w-4/5'}
                        style={{ animationDelay: `${rowIndex * 0.08}s` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line-subtle transition-colors duration-150 last:border-0 hover:bg-surface-hover"
                >
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className={cn(CELL, cell.column.columnDef.meta?.className)}>
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && rows.length === 0 && empty && (
              <tr>
                <td colSpan={leafColumns.length}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
