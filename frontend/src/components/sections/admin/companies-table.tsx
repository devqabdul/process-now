import { createColumnHelper } from '@tanstack/react-table';
import type { ComponentProps } from 'react';

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

// Column ids that sort are the API's sort keys: name, createdAt.
export const buildCompanyColumns = (actions: CompanyActionHandlers) =>
  helper.columns([
    helper.accessor('name', {
      header: 'Company',
      enableSorting: true,
      meta: { className: 'w-[32%]', hideable: false, exportValue: (company) => company.name },
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
      meta: { className: 'w-[22%]', exportValue: (company) => company.gstNo },
      cell: ({ row }) => <GstMarker gstNo={row.original.gstNo} />,
    }),
    helper.display({
      id: 'admin',
      header: 'Company admin',
      meta: { exportValue: (company) => company.admin.name },
      cell: ({ row }) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{row.original.admin.name}</span>
          <span className="block truncate text-xs text-fg-subtle">
            <AdminContact admin={row.original.admin} />
          </span>
        </span>
      ),
    }),
    helper.accessor('createdAt', {
      header: 'Created',
      enableSorting: true,
      meta: {
        className: 'w-[18%] text-11 text-fg-subtle whitespace-nowrap tabular-nums',
        exportValue: (company) => company.createdAt,
      },
      cell: ({ row }) => row.original.createdOn,
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Actions', hideable: false },
      cell: ({ row }) => <CompanyActions company={row.original} {...actions} />,
    }),
  ]);

type CompaniesTableProps = Omit<
  ComponentProps<typeof DataTable<CompanyRow>>,
  'label' | 'rowKey' | 'skeletonRows'
>;

export const CompaniesTable = (props: CompaniesTableProps) => (
  <DataTable
    {...props}
    label="Companies on ProcessNow"
    rowKey={(company) => company.id}
    skeletonRows={COMPANY_SKELETON_ROWS}
  />
);
