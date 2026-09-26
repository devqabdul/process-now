import { CalendarDays, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { DateRangeFields } from '@components/shared/date-range-fields';
import {
  CHECK_ROW,
  CHECKBOX,
  CHIP_TRIGGER,
  CHIP_TRIGGER_ACTIVE,
  ChipClear,
  chipClasses,
  POPOVER_PANEL,
} from '@components/ui/filter-chip';
import { usePopover } from '@hooks/use-popover';
import { cn } from '@lib/cn';
import {
  DATE_PRESETS,
  type DatePresetId,
  type DateRange,
  DEFAULT_DATE_PRESET,
  matchPreset,
  presetRange,
} from '@utils/date-presets';
import { formatShortDate } from '@utils/format/date';

interface DateRangeChipProps {
  from: string;
  to: string;
  // Today: nothing is recorded ahead of it.
  max: string;
  onChange: (range: DateRange) => void;
}

// The URL keeps only from/to; the chip works out which preset, if any, that range is.
export const DateRangeChip = ({ from, to, max, onChange }: DateRangeChipProps) => {
  const { open, style, toggle, close, triggerRef, panelRef } = usePopover('start');
  const group = useId();
  const [custom, setCustom] = useState(false);

  // derived
  const preset = matchPreset({ from, to }, max);
  const active = preset !== DEFAULT_DATE_PRESET;
  const label = preset
    ? DATE_PRESETS.find(({ id }) => id === preset)?.label
    : `${formatShortDate(from)} – ${formatShortDate(to)}`;
  const showFields = custom || !preset;

  // callbacks
  const pick = (id: DatePresetId) => {
    setCustom(false);
    onChange(presetRange(id, max));
    close(true);
  };

  return (
    <div className={chipClasses(active)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setCustom(false);
          toggle();
        }}
        className={cn(CHIP_TRIGGER, active && CHIP_TRIGGER_ACTIVE)}
      >
        <CalendarDays
          aria-hidden="true"
          className="size-3.5 flex-none text-fg-subtle"
          strokeWidth={2}
        />
        <span className="sr-only">Date: </span>
        <span className={cn('truncate', active ? 'font-semibold' : 'text-fg-secondary')}>
          {label}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 flex-none text-fg-subtle"
          strokeWidth={2}
        />
      </button>
      {active && <ChipClear label="Date" onClear={() => pick(DEFAULT_DATE_PRESET)} />}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Filter by date"
          style={style}
          className={POPOVER_PANEL}
        >
          <fieldset>
            <legend className="sr-only">Period</legend>
            {DATE_PRESETS.map(({ id, label: name }) => (
              <label key={id} className={CHECK_ROW}>
                <input
                  type="radio"
                  name={group}
                  checked={!showFields && preset === id}
                  onChange={() => pick(id)}
                  className={CHECKBOX}
                />
                {name}
              </label>
            ))}
            <label className={CHECK_ROW}>
              <input
                type="radio"
                name={group}
                checked={showFields}
                onChange={() => setCustom(true)}
                className={CHECKBOX}
              />
              Custom range…
            </label>
          </fieldset>
          {showFields && (
            <DateRangeFields
              from={from}
              to={to}
              max={max}
              onChange={onChange}
              className="border-t border-line-subtle px-3 pt-2 pb-3"
            />
          )}
        </div>
      )}
    </div>
  );
};
