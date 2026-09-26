import { CalendarX } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

import type { BankStatement, StatementEntry } from '@api/process-backend/bank-accounts';
import { DateRangeChip } from '@components/shared/date-range-chip';
import { EmptyState } from '@components/shared/empty-state';
import { Card } from '@components/ui/card';
import { Skeleton } from '@components/ui/skeleton';
import { cn } from '@lib/cn';
import type { DateRange } from '@utils/date-presets';
import { formatShortDate, shiftIsoDate } from '@utils/format/date';
import { formatMoney } from '@utils/format/money';

interface Day {
  date: string;
  in: number;
  out: number;
}

const AXIS = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

// Summed in whole paise, which integers hold exactly, so a day's total is shown to the paisa.
// ponytail: one column per day, so a year-long range draws hairline bars; bucket by week if needed.
const toDays = (entries: StatementEntry[], from: string, to: string): Day[] => {
  const days = new Map<string, Day>();
  for (let date = from; date <= to; date = shiftIsoDate(date, 1))
    days.set(date, { date, in: 0, out: 0 });
  for (const entry of entries) {
    const day = days.get(entry.date);
    if (day) day[entry.kind] += Math.round(Number(entry.amount) * 100);
  }
  return [...days.values()];
};

const rupees = (paise: number) =>
  formatMoney(`${Math.trunc(paise / 100)}.${String(paise % 100).padStart(2, '0')}`);

// The next 1, 2 or 5 × 10ⁿ at or above the tallest bar, so the ticks are round numbers.
const niceCeil = (value: number) => {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((m) => m * step).find((n) => n >= value) ?? value;
};

const SERIES = [
  { key: 'in', label: 'In', swatch: 'bg-success-solid' },
  { key: 'out', label: 'Out', swatch: 'bg-danger' },
] as const;

const describe = (day: Day) =>
  `${formatShortDate(day.date)}: in ${rupees(day.in)}, out ${rupees(day.out)}`;

interface MoneyChartProps {
  statement: BankStatement | undefined;
  from: string;
  to: string;
  today: string;
  period: string;
  loading: boolean;
  refreshing: boolean;
  onRangeChange: (range: DateRange) => void;
}

export const MoneyChart = ({
  statement,
  from,
  to,
  today,
  period,
  loading,
  refreshing,
  onRangeChange,
}: MoneyChartProps) => {
  const [active, setActive] = useState<number | null>(null);

  // derived
  const entries = statement?.entries ?? [];
  const days = statement ? toDays(entries, statement.from, statement.to) : [];
  const max = niceCeil(Math.max(0, ...days.map((day) => Math.max(day.in, day.out))));
  const ticks = [max, max / 2, 0];
  const activeDay = active === null ? undefined : days[active];
  const middle = days[Math.floor(days.length / 2)];

  // callbacks
  const last = days.length - 1;
  const onKeyDown = (event: KeyboardEvent) => {
    const from = active ?? last;
    const next = { ArrowRight: from + 1, ArrowLeft: from - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(Math.min(last, Math.max(0, next)));
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.01em]">Money</h2>
          <p className="mt-0.5 text-xs text-fg-subtle">{period}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ul aria-label="Legend" className="flex gap-4 text-xs text-fg-secondary">
            {SERIES.map((series) => (
              <li key={series.key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', series.swatch)} />
                {series.label}
                {statement && (
                  <strong className="font-semibold text-fg">
                    {formatMoney(series.key === 'in' ? statement.moneyIn : statement.moneyOut)}
                  </strong>
                )}
              </li>
            ))}
          </ul>
          <DateRangeChip from={from} to={to} max={today} onChange={onRangeChange} />
        </div>
      </div>

      {loading ? (
        <div aria-hidden="true" className="mt-6 flex h-48 items-end gap-2 lg:h-56">
          {[40, 65, 30, 80, 55, 70, 45, 60].map((height) => (
            <Skeleton
              key={height}
              className="flex-1 rounded-b-none"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="Nothing in this period"
          description="No payment landed in this account and no expense was paid from it between these dates. Try a wider range."
          className="py-10"
        />
      ) : (
        <div className={cn('mt-6 transition-opacity', refreshing && 'opacity-50')}>
          <div className="flex h-48 lg:h-56">
            <div aria-hidden="true" className="relative w-12 flex-none">
              {ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute left-0 translate-y-1/2 text-11 text-fg-subtle tabular-nums"
                  style={{ bottom: `${(tick / max) * 100}%` }}
                >
                  {AXIS.format(tick / 100)}
                </span>
              ))}
            </div>
            <div
              // A slider over the days: arrow keys step through them and read each one out.
              role="slider"
              tabIndex={0}
              aria-label="Day"
              aria-valuemin={0}
              aria-valuemax={last}
              aria-valuenow={active ?? last}
              aria-valuetext={describe(activeDay ?? days[last] ?? { date: to, in: 0, out: 0 })}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
              onPointerLeave={() => setActive(null)}
              className="relative flex flex-1 items-end rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {ticks.map((tick) => (
                <span
                  key={tick}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-line-subtle"
                  style={{ bottom: `${(tick / max) * 100}%` }}
                />
              ))}
              {days.map((day, index) => (
                <div
                  key={day.date}
                  aria-hidden="true"
                  onPointerEnter={() => setActive(index)}
                  className={cn(
                    // Fixed padding: a % would be of the whole chart's width, not the column's.
                    'relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] px-0.5',
                    index === active && 'rounded-6 bg-surface-muted',
                  )}
                >
                  {SERIES.map((series) => (
                    <span
                      key={series.key}
                      className={cn('w-full max-w-3 rounded-t-[4px]', series.swatch)}
                      style={{
                        height: `${(day[series.key] / max) * 100}%`,
                        minHeight: day[series.key] > 0 ? 2 : 0,
                      }}
                    />
                  ))}
                </div>
              ))}
              {activeDay && active !== null && (
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute top-0 z-10 rounded-10 border border-line bg-surface px-3 py-2 text-xs whitespace-nowrap shadow-popover',
                    active < days.length / 3
                      ? 'translate-x-0'
                      : active > (days.length * 2) / 3
                        ? '-translate-x-full'
                        : '-translate-x-1/2',
                  )}
                  style={{ left: `${((active + 0.5) / days.length) * 100}%` }}
                >
                  <p className="text-fg-subtle">{formatShortDate(activeDay.date)}</p>
                  {SERIES.map((series) => (
                    <p key={series.key} className="mt-1 flex items-center gap-2">
                      <span className={cn('h-0.5 w-3 rounded-full', series.swatch)} />
                      <strong className="font-semibold text-fg tabular-nums">
                        {rupees(activeDay[series.key])}
                      </strong>
                      <span className="text-fg-subtle">{series.label}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="mt-2 flex justify-between pl-12 text-11 text-fg-subtle tabular-nums"
          >
            <span>{days[0] && formatShortDate(days[0].date)}</span>
            {days.length > 2 && middle && <span>{formatShortDate(middle.date)}</span>}
            <span>{days.length > 1 && formatShortDate(days[days.length - 1]?.date ?? '')}</span>
          </div>
        </div>
      )}

      <ul aria-label={`Money in and out by day, ${period}`} className="sr-only">
        {days
          .filter((day) => day.in > 0 || day.out > 0)
          .map((day) => (
            <li key={day.date}>{describe(day)}</li>
          ))}
      </ul>
    </Card>
  );
};
