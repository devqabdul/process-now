import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import { FieldError } from '@components/ui/field-error';
import { FieldLabel } from '@components/ui/field-label';
import { InputShell, inputClasses } from '@components/ui/input-shell';
import { cn } from '@lib/cn';

interface SelectFieldProps extends ComponentPropsWithRef<'select'> {
  id: string;
  label: string;
  // Right of the label, e.g. "Optional".
  hint?: string;
  error?: { message?: string | undefined } | undefined;
  leading?: ReactNode;
}

/**
 * FormField's twin for a pick-from-list. Still a native <select>, so phones get the system
 * picker; on desktop `select-picker` (tailwind.css) styles the open list where the browser can.
 */
export const SelectField = ({
  id,
  label,
  hint,
  error,
  leading,
  className,
  children,
  ...select
}: SelectFieldProps) => (
  <div className={className}>
    <div className="mb-label flex items-baseline justify-between gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint && <span className="text-11 text-fg-subtle">{hint}</span>}
    </div>
    <InputShell invalid={!!error} leading={leading}>
      {/* The chevron sits over the select, so a tap on it opens the list too. */}
      <span className="relative flex h-full min-w-0 flex-1 items-center">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            inputClasses,
            'select-picker cursor-pointer truncate pr-6 disabled:cursor-wait',
          )}
          {...select}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-0 size-4 text-fg-subtle"
          strokeWidth={1.8}
        />
      </span>
    </InputShell>
    <FieldError id={`${id}-error`} message={error?.message} />
  </div>
);
