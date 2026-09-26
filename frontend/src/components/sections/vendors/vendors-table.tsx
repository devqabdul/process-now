import { createColumnHelper } from '@tanstack/react-table';
import type { ComponentProps } from 'react';
import { Link } from 'react-router';

import type { Vendor } from '@api/process-backend/vendors';
import { LetterTile } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { displayIdentifier } from '@utils/identifier';

import { VENDOR_SKELETON_ROWS, VendorActions, type VendorActionHandlers } from './vendor-card';

const helper = createColumnHelper<DataTableFeatures, Vendor>();

// Column ids that sort are the API's sort keys: name.
export const buildVendorColumns = (actions: VendorActionHandlers) =>
  helper.columns([
    helper.accessor('name', {
      header: 'Vendor',
      enableSorting: true,
      meta: { className: 'w-[32%]', hideable: false, exportValue: (vendor) => vendor.name },
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <LetterTile name={row.original.name} />
          <Link
            to={`/vendors/${row.original.id}`}
            className="min-w-0 truncate font-medium hover:text-link hover:underline"
          >
            {row.original.name}
          </Link>
          {row.original.isActive === false && <Badge tone="neutral">Inactive</Badge>}
        </span>
      ),
    }),
    helper.accessor('phone', {
      header: 'Mobile',
      meta: { className: 'w-[22%] whitespace-nowrap', exportValue: (vendor) => vendor.phone },
      cell: ({ row }) => displayIdentifier(row.original.phone),
    }),
    helper.display({
      id: 'address',
      header: 'Address',
      meta: { exportValue: (vendor) => vendor.address },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate text-fg-subtle">{row.original.address || '—'}</span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Actions', hideable: false },
      cell: ({ row }) => <VendorActions vendor={row.original} {...actions} />,
    }),
  ]);

type VendorsTableProps = Omit<
  ComponentProps<typeof DataTable<Vendor>>,
  'label' | 'rowKey' | 'skeletonRows'
>;

export const VendorsTable = (props: VendorsTableProps) => (
  <DataTable
    {...props}
    label="Vendors"
    rowKey={(vendor) => vendor.id}
    skeletonRows={VENDOR_SKELETON_ROWS}
  />
);
