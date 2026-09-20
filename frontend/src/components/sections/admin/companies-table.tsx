import { createColumnHelper } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { LetterTile } from '@components/ui/avatar';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';

import {
  AdminContact,
  COMPANY_SKELETON_ROWS,
  CompanyActions,
  type CompanyActionHandlers,
  type CompanyRow,
  GstMarker,
  StatusBadge,
} from './company-card';

const helper = createColumnHelper<DataTableFeatures, CompanyRow>();

const buildColumns = (actions: CompanyActionHandlers) =>
  helper.columns([
    helper.accessor('name', {
      header: 'Company',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-[32%]' },
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <LetterTile name={row.original.name} />
          <span className="min-w-0 truncate font-medium">{row.original.name}</span>
          <StatusBadge isActive={row.original.isActive} />
        </span>
      ),
    }),
    helper.display({
      id: 'gst',
      header: 'GST number',
      meta: { className: 'w-[22%]' },
      cell: ({ row }) => <GstMarker gstNo={row.original.gstNo} />,
    }),
    helper.display({
      id: 'admin',
      header: 'Company admin',
      cell: ({ row }) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{row.original.admin.name}</span>
          <span className="block truncate text-[11.5px] text-fg-subtle">
            <AdminContact admin={row.original.admin} />
          </span>
        </span>
      ),
    }),
    // Sorts on the raw ISO timestamp, which orders chronologically as text; the cell shows the
    // formatted date the controller hook built.
    helper.accessor('createdAt', {
      id: 'created',
      header: 'Created',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-[18%] font-mono text-[11px] text-fg-subtle whitespace-nowrap' },
      cell: ({ row }) => row.original.createdOn,
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { className: 'w-12' },
      cell: ({ row }) => <CompanyActions company={row.original} {...actions} />,
    }),
  ]);

interface CompaniesTableProps extends CompanyActionHandlers {
  rows: CompanyRow[];
  loading: boolean;
  empty: ReactNode;
}

export const CompaniesTable = ({ rows, loading, empty, ...actions }: CompaniesTableProps) => (
  <DataTable
    columns={buildColumns(actions)}
    rows={rows}
    rowKey={(company) => company.id}
    label="Companies on ProcessNow"
    loading={loading}
    skeletonRows={COMPANY_SKELETON_ROWS}
    empty={empty}
  />
);
