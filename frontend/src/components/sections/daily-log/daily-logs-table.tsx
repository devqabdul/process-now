import { createColumnHelper } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import type { ComponentProps } from 'react';

import type { DailyLog } from '@api/process-backend/daily-logs';
import { Card } from '@components/ui/card';
import { DataTable, type DataTableFeatures } from '@components/ui/data-table';
import { Menu, MenuItem } from '@components/ui/menu';
import { Skeleton } from '@components/ui/skeleton';
import { formatWeekdayDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';
import { formatQuantity } from '@utils/format/quantity';

import { estimateElectricityCost } from './daily-log-fields';

export const DAILY_LOG_SKELETON_ROWS = 6;

const helper = createColumnHelper<DataTableFeatures, DailyLog>();

// "1 hr", "8.5 hrs"
const counted = (qty: string, one: string, many: string) =>
  formatQuantity(qty, Number(qty) === 1 ? one : many);

const costOf = (log: DailyLog, rate: number | undefined) =>
  formatMoney(estimateElectricityCost(log.electricityUnits, rate));

export const DailyLogActions = ({
  log,
  onEdit,
}: {
  log: DailyLog;
  onEdit: (log: DailyLog) => void;
}) => (
  <Menu label={`Actions for the log of ${formatWeekdayDate(log.logDate)}`} className="flex-none">
    {(close) => (
      <MenuItem
        onClick={() => {
          close();
          onEdit(log);
        }}
      >
        <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
        Edit
      </MenuItem>
    )}
  </Menu>
);

export const buildDailyLogColumns = (rate: number | undefined, onEdit: (log: DailyLog) => void) =>
  helper.columns([
    helper.accessor('logDate', {
      header: 'Date',
      meta: {
        className: 'w-[14%] whitespace-nowrap tabular-nums',
        hideable: false,
        exportValue: (log) => log.logDate,
      },
      cell: ({ row }) => (
        <span className="font-medium">{formatWeekdayDate(row.original.logDate)}</span>
      ),
    }),
    helper.accessor('machineHours', {
      header: 'Machine hours',
      meta: {
        className: 'w-[15%] text-right font-mono whitespace-nowrap',
        exportValue: (log) => log.machineHours,
      },
      cell: ({ row }) => counted(row.original.machineHours, 'hr', 'hrs'),
    }),
    helper.accessor('electricityUnits', {
      header: 'Electricity units',
      meta: {
        className: 'w-[16%] text-right font-mono whitespace-nowrap',
        exportValue: (log) => log.electricityUnits,
      },
      cell: ({ row }) => counted(row.original.electricityUnits, 'unit', 'units'),
    }),
    helper.display({
      id: 'cost',
      header: 'Est. electricity cost',
      meta: {
        className: 'w-[17%] text-right whitespace-nowrap',
        exportValue: (log) => estimateElectricityCost(log.electricityUnits, rate) ?? null,
      },
      cell: ({ row }) => <span className="font-mono">{costOf(row.original, rate)}</span>,
    }),
    helper.display({
      id: 'notes',
      header: 'Notes',
      meta: { exportValue: (log) => log.notes },
      cell: ({ row }) => (
        <span className="block min-w-0 truncate text-fg-subtle">{row.original.notes || '—'}</span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Actions', hideable: false },
      cell: ({ row }) => <DailyLogActions log={row.original} onEdit={onEdit} />,
    }),
  ]);

type DailyLogsTableProps = Omit<
  ComponentProps<typeof DataTable<DailyLog>>,
  'label' | 'rowKey' | 'skeletonRows'
>;

export const DailyLogsTable = (props: DailyLogsTableProps) => (
  <DataTable
    {...props}
    label="Daily logs"
    rowKey={(log) => log.id}
    skeletonRows={DAILY_LOG_SKELETON_ROWS}
  />
);

export const DailyLogCard = ({
  log,
  rate,
  onEdit,
}: {
  log: DailyLog;
  rate: number | undefined;
  onEdit: (log: DailyLog) => void;
}) => (
  <Card className="p-3.5">
    <div className="flex items-start gap-2.75">
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums">
            {formatWeekdayDate(log.logDate)}
          </span>
          {rate && (
            <span className="font-mono text-sm whitespace-nowrap">≈ {costOf(log, rate)}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-fg-subtle tabular-nums">
          {counted(log.machineHours, 'hr', 'hrs')} ·{' '}
          {counted(log.electricityUnits, 'unit', 'units')}
        </p>
        {log.notes && <p className="mt-1 text-xs text-fg-subtle">{log.notes}</p>}
      </div>
      <DailyLogActions log={log} onEdit={onEdit} />
    </div>
  </Card>
);

export const DailyLogCardSkeleton = () => (
  <Card className="p-3.5">
    <p className="text-sm font-semibold">
      <Skeleton className="inline-block h-2.75 w-2/5" />
    </p>
    <p className="mt-1">
      <Skeleton className="inline-block h-2.25 w-1/3" />
    </p>
  </Card>
);
