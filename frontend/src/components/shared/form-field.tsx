import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { FieldError as RhfFieldError } from 'react-hook-form';

import { FieldError } from '@components/ui/field-error';
import { FieldLabel } from '@components/ui/field-label';
import { InputShell, inputClasses } from '@components/ui/input-shell';

interface FormFieldProps extends ComponentPropsWithRef<'input'> {
  id: string;
  label: string;
  // Right of the label, e.g. "Optional".
  hint?: string;
  error?: RhfFieldError | undefined;
  leading?: ReactNode;
  trailing?: ReactNode;
}

// Label + 52px field + reserved error line: the login form's field, minus its step animation.
export const FormField = ({
  id,
  label,
  hint,
  error,
  leading,
  trailing,
  // Lands on the wrapper, not the input: it is how a field spans a grid column.
  className,
  ...input
}: FormFieldProps) => (
  <div className={className}>
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
    </div>
    <InputShell invalid={!!error} leading={leading} trailing={trailing}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClasses}
        {...input}
      />
    </InputShell>
    <FieldError id={`${id}-error`} message={error?.message} />
  </div>
);
