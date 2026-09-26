import { createColumnHelper } from '@tanstack/react-table';
import type { ComponentProps } from 'react';

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

// Column ids that sort are the API's sort keys: name, basePrice.
export const buildServiceTypeColumns = (actions: ServiceTypeActionHandlers) =>
  helper.columns([
    helper.accessor('name', {
      header: 'Service',
      enableSorting: true,
      meta: { className: 'w-[28%]', hideable: false, exportValue: (service) => service.name },
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
      meta: {
        className: 'w-[16%] whitespace-nowrap',
        exportValue: (service) => service.basePrice,
      },
      cell: ({ row }) => (
        <>
          <span className="font-medium">{formatMoney(row.original.basePrice)}</span>
          <span className="text-fg-subtle"> / {row.original.unit}</span>
        </>
      ),
    }),
    helper.accessor('baseCost', {
      header: 'Cost',
      meta: {
        className: 'w-[14%] whitespace-nowrap text-fg-subtle',
        exportValue: (service) => service.baseCost,
      },
      cell: ({ row }) => formatMoney(row.original.baseCost),
    }),
    helper.display({
      id: 'billOn',
      header: 'Billed on',
      meta: {
        className: 'w-[20%]',
        exportValue: (service) => (service.billOn === 'in' ? 'received' : 'returned'),
      },
      cell: ({ row }) => <BillOnBadge billOn={row.original.billOn} />,
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Actions', hideable: false },
      cell: ({ row }) => <ServiceTypeActions serviceType={row.original} {...actions} />,
    }),
  ]);

type ServiceTypesTableProps = Omit<
  ComponentProps<typeof DataTable<ServiceType>>,
  'label' | 'rowKey' | 'skeletonRows'
>;

export const ServiceTypesTable = (props: ServiceTypesTableProps) => (
  <DataTable
    {...props}
    label="Service types"
    rowKey={(serviceType) => serviceType.id}
    skeletonRows={SERVICE_TYPE_SKELETON_ROWS}
  />
);
