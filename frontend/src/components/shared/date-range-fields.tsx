import { useId } from 'react';

import { cn } from '@lib/cn';
import { shiftIsoDate } from '@utils/format/date';

const INPUT =
  'h-11 rounded-10 border border-line-field bg-surface px-3 font-mono text-[12.5px] text-fg outline-none transition-[border-color,box-shadow] duration-150 focus:border-focus focus:shadow-focus lg:h-9.5';

interface DateRangeFieldsProps {
  from: string;
  to: string;
  // The latest day that can be picked: nothing is recorded ahead of today.
  max: string;
  onChange: (range: { from: string; to: string }) => void;
  className?: string;
}

// The API refuses a window over a year or one that runs backwards, so the
// field that didn't move follows the one that did (typed dates skip min/max).
const MAX_SPAN_DAYS = 366;
const minIso = (a: string, b: string) => (a < b ? a : b);
const maxIso = (a: string, b: string) => (a > b ? a : b);

export const DateRangeFields = ({ from, to, max, onChange, className }: DateRangeFieldsProps) => {
  const fromId = useId();
  const toId = useId();

  const changeFrom = (next: string) => {
    const start = minIso(next, max);
    onChange({
      from: start,
      to: minIso(minIso(maxIso(to, start), shiftIsoDate(start, MAX_SPAN_DAYS)), max),
    });
  };
  const changeTo = (next: string) => {
    const end = minIso(next, max);
    onChange({ from: maxIso(minIso(from, end), shiftIsoDate(end, -MAX_SPAN_DAYS)), to: end });
  };

  return (
    <fieldset className={cn('flex flex-wrap items-end gap-2', className)}>
      <legend className="sr-only">Period</legend>
      <div className="flex flex-col gap-1">
        <label htmlFor={fromId} className="text-[11.5px] font-semibold text-fg-secondary">
          From
        </label>
        <input
          id={fromId}
          type="date"
          value={from}
          min={shiftIsoDate(to, -MAX_SPAN_DAYS)}
          max={to}
          onChange={(event) => event.target.value && changeFrom(event.target.value)}
          className={INPUT}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={toId} className="text-[11.5px] font-semibold text-fg-secondary">
          To
        </label>
        <input
          id={toId}
          type="date"
          value={to}
          min={from}
          max={max}
          onChange={(event) => event.target.value && changeTo(event.target.value)}
          className={INPUT}
        />
      </div>
    </fieldset>
  );
};
