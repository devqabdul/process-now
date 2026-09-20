import { createColumnHelper } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { Vendor } from '@api/process-backend/vendors';
import { LetterTile } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { displayIdentifier } from '@utils/identifier';

import { VENDOR_SKELETON_ROWS, VendorActions, type VendorActionHandlers } from './vendor-card';

const helper = createColumnHelper<DataTableFeatures, Vendor>();

const buildColumns = (actions: VendorActionHandlers) =>
  helper.columns([
    helper.accessor('name', {
      header: 'Vendor',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-[32%]' },
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <LetterTile name={row.original.name} />
          <span className="min-w-0 truncate font-medium">{row.original.name}</span>
          {row.original.isActive === false && <Badge tone="neutral">Inactive</Badge>}
        </span>
      ),
    }),
    helper.accessor('phone', {
      header: 'Mobile',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-[22%] whitespace-nowrap' },
      cell: ({ row }) => displayIdentifier(row.original.phone),
    }),
    helper.display({
      id: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <span className="block min-w-0 truncate text-fg-subtle">{row.original.address || '—'}</span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { className: 'w-12' },
      cell: ({ row }) => <VendorActions vendor={row.original} {...actions} />,
    }),
  ]);

interface VendorsTableProps extends VendorActionHandlers {
  rows: Vendor[];
  loading: boolean;
  empty: ReactNode;
}

export const VendorsTable = ({ rows, loading, empty, ...actions }: VendorsTableProps) => (
  <DataTable
    columns={buildColumns(actions)}
    rows={rows}
    rowKey={(vendor) => vendor.id}
    label="Vendors"
    loading={loading}
    skeletonRows={VENDOR_SKELETON_ROWS}
    empty={empty}
  />
);
