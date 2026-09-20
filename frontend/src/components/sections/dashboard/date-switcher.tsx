import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';

import { IconButton } from '@components/ui/icon-button';
import { shiftIsoDate } from '@utils/format/date';

interface DateSwitcherProps {
  date: string;
  // The latest day with data: the dashboard never looks ahead.
  max: string;
  onChange: (date: string) => void;
}

export const DateSwitcher = ({ date, max, onChange }: DateSwitcherProps) => {
  const inputId = useId();
  const atMax = date >= max;

  return (
    <div className="flex items-center gap-1">
      <IconButton aria-label="Previous day" onClick={() => onChange(shiftIsoDate(date, -1))}>
        <ChevronLeft aria-hidden="true" className="size-4.25" strokeWidth={1.8} />
      </IconButton>
      <label htmlFor={inputId} className="sr-only">
        Show a different day
      </label>
      <input
        id={inputId}
        type="date"
        value={date}
        max={max}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className="h-11 rounded-10 border border-line-field bg-surface px-3 font-mono text-[12.5px] text-fg outline-none transition-[border-color,box-shadow] duration-150 focus:border-focus focus:shadow-focus lg:h-9.5"
      />
      <IconButton
        aria-label="Next day"
        disabled={atMax}
        onClick={() => onChange(shiftIsoDate(date, 1))}
        className="disabled:cursor-not-allowed disabled:text-fg-faint disabled:hover:bg-transparent"
      >
        <ChevronRight aria-hidden="true" className="size-4.25" strokeWidth={1.8} />
      </IconButton>
    </div>
  );
};
