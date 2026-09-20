import { createColumnHelper } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { ServiceType } from '@api/process-backend/service-types';
import { LetterTile } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { formatMoney } from '@utils/format/money';

import {
  BillOnBadge,
  SERVICE_TYPE_SKELETON_ROWS,
  ServiceTypeActions,
  type ServiceTypeActionHandlers,
} from './service-type-card';

const helper = createColumnHelper<DataTableFeatures, ServiceType>();

const buildColumns = (actions: ServiceTypeActionHandlers) =>
  helper.columns([
    helper.accessor('name', {
      header: 'Service',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-[28%]' },
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <LetterTile name={row.original.name} />
          <span className="min-w-0 truncate font-medium">{row.original.name}</span>
          {!row.original.isActive && <Badge tone="neutral">Inactive</Badge>}
        </span>
      ),
    }),
    helper.accessor('basePrice', {
      header: 'Price',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-[16%] whitespace-nowrap' },
      cell: ({ row }) => (
        <>
          <span className="font-medium">{formatMoney(row.original.basePrice)}</span>
          <span className="text-fg-subtle"> / {row.original.unit}</span>
        </>
      ),
    }),
    helper.accessor('baseCost', {
      header: 'Cost',
      enableSorting: true,
      sortFn: 'text',
      meta: { className: 'w-[14%] whitespace-nowrap text-fg-subtle' },
      cell: ({ row }) => formatMoney(row.original.baseCost),
    }),
    helper.display({
      id: 'billOn',
      header: 'Billed on',
      meta: { className: 'w-[20%]' },
      cell: ({ row }) => <BillOnBadge billOn={row.original.billOn} />,
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { className: 'w-12' },
      cell: ({ row }) => <ServiceTypeActions serviceType={row.original} {...actions} />,
    }),
  ]);

interface ServiceTypesTableProps extends ServiceTypeActionHandlers {
  rows: ServiceType[];
  loading: boolean;
  empty: ReactNode;
}

export const ServiceTypesTable = ({ rows, loading, empty, ...actions }: ServiceTypesTableProps) => (
  <DataTable
    columns={buildColumns(actions)}
    rows={rows}
    rowKey={(serviceType) => serviceType.id}
    label="Service types"
    loading={loading}
    skeletonRows={SERVICE_TYPE_SKELETON_ROWS}
    empty={empty}
  />
);
