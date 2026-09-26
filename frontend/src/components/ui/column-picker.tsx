import { Columns3 } from 'lucide-react';

import { usePopover } from '@hooks/use-popover';

import { buttonClasses } from './button';
import { CHECK_ROW, CHECKBOX, POPOVER_PANEL } from './filter-chip';

export interface PickerColumn {
  id: string;
  label: string;
  visible: boolean;
  hideable: boolean;
}

interface ColumnPickerProps {
  columns: PickerColumn[];
  onToggle: (id: string, visible: boolean) => void;
  className?: string;
}

export const ColumnPicker = ({ columns, onToggle, className }: ColumnPickerProps) => {
  const { open, style, toggle, triggerRef, panelRef } = usePopover('end');
  const hideable = columns.filter((column) => column.hideable);

  return (
    <div {...(className ? { className } : {})}>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClasses('secondary', 'sm')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <Columns3 aria-hidden="true" className="size-3.75" strokeWidth={1.9} />
        Columns
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Show columns"
          style={style}
          className={POPOVER_PANEL}
        >
          <fieldset>
            <legend className="px-3 pt-2 pb-1 font-mono text-11 tracking-[0.08em] text-fg-subtle uppercase">
              Show columns
            </legend>
            {hideable.map((column) => (
              <label key={column.id} className={CHECK_ROW}>
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={(event) => onToggle(column.id, event.target.checked)}
                  className={CHECKBOX}
                />
                {column.label}
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
};
