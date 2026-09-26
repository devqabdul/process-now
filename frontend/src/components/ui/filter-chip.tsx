import { ChevronDown, X } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { usePopover } from '@hooks/use-popover';
import { cn } from '@lib/cn';

export interface FilterOption {
  value: string;
  label: string;
  // Richer rendering in the list, e.g. a status Badge.
  render?: ReactNode;
}

interface FilterChipProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onClear: () => void;
  // false: one value at a time, as radios with no Select all (e.g. an account).
  multiple?: boolean;
  className?: string;
}

export const POPOVER_PANEL =
  'fixed z-50 max-h-80 min-w-56 overflow-y-auto rounded-12 border border-line bg-surface py-1 shadow-popover';
export const CHECK_ROW =
  'flex min-h-11 cursor-pointer items-center gap-2.5 px-3 text-13 hover:bg-surface-muted lg:min-h-9';
export const CHECKBOX = 'size-4 flex-none accent-primary';

// The pill every filter wears: quiet until something is picked, then outlined and tinted.
export const chipClasses = (active: boolean, className?: string) =>
  cn(
    'inline-flex h-11 max-w-full items-center rounded-full border text-13 lg:h-8.5',
    active ? 'border-primary bg-surface-muted' : 'border-line bg-surface',
    className,
  );
export const CHIP_TRIGGER =
  'flex h-full min-w-0 items-center gap-1.5 rounded-full px-3.5 hover:bg-surface-hover';
export const CHIP_TRIGGER_ACTIVE = 'rounded-r-none pr-1.5';

// Clears one chip; only rendered once the chip holds a value.
export const ChipClear = ({ label, onClear }: { label: string; onClear: () => void }) => (
  <button
    type="button"
    aria-label={`Remove ${label} filter`}
    onClick={onClear}
    className="grid h-full w-9 flex-none place-items-center rounded-r-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
  >
    <X aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
  </button>
);

export const FilterChip = ({
  label,
  options,
  selected,
  onChange,
  onClear,
  multiple = true,
  className,
}: FilterChipProps) => {
  const { open, style, toggle, close, triggerRef, panelRef } = usePopover('start');
  const group = useId();

  // derived
  const active = selected.length > 0;
  const all = options.length > 0 && selected.length === options.length;
  const some = active && !all;
  const names = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  const summary = names.length > 2 ? `${names.length} selected` : names.join(', ');

  // callbacks
  const toggleValue = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : options.map((o) => o.value).filter((v) => v === value || selected.includes(v)),
    );

  return (
    <div className={chipClasses(active, className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={cn(CHIP_TRIGGER, active && CHIP_TRIGGER_ACTIVE)}
      >
        {active ? (
          <span className="truncate">
            <span className="text-fg-muted">{label}:</span>{' '}
            <span className="font-semibold">{summary}</span>
          </span>
        ) : (
          <span className="text-fg-secondary">{label}</span>
        )}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 flex-none text-fg-subtle"
          strokeWidth={2}
        />
      </button>
      {active && <ChipClear label={label} onClear={onClear} />}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Filter by ${label}`}
          style={style}
          className={POPOVER_PANEL}
        >
          <fieldset>
            <legend className="sr-only">{label}</legend>
            {options.map((option) => (
              <label key={option.value} className={CHECK_ROW}>
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={multiple ? undefined : group}
                  checked={selected.includes(option.value)}
                  onChange={() => {
                    if (multiple) {
                      toggleValue(option.value);
                      return;
                    }
                    onChange([option.value]);
                    close(true);
                  }}
                  className={CHECKBOX}
                />
                {option.render ?? option.label}
                {option.render && <span className="sr-only">{option.label}</span>}
              </label>
            ))}
          </fieldset>
          {multiple && (
            <>
              <div className="my-1 border-t border-line-subtle" />
              <label className={cn(CHECK_ROW, 'font-medium')}>
                <input
                  type="checkbox"
                  checked={all}
                  ref={(input) => {
                    if (input) input.indeterminate = some;
                  }}
                  onChange={() => onChange(all ? [] : options.map((o) => o.value))}
                  className={CHECKBOX}
                />
                Select all
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
};
