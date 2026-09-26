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
  // A quiet line under the control (e.g. the amount in words); an error replaces it.
  help?: ReactNode;
}

// Label, control and error in the design system's form rhythm (design-system.md → Forms).
export const FormField = ({
  id,
  label,
  hint,
  error,
  leading,
  trailing,
  help,
  // Lands on the wrapper, not the input: it is how a field spans a grid column.
  className,
  ...input
}: FormFieldProps) => (
  <div className={className}>
    <div className="mb-label flex items-baseline justify-between gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint && <span className="text-11 text-fg-subtle">{hint}</span>}
    </div>
    <InputShell invalid={!!error} leading={leading} trailing={trailing}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={inputClasses}
        {...input}
      />
    </InputShell>
    <FieldError id={`${id}-error`} message={error?.message} />
    {help && !error && (
      <p id={`${id}-help`} className="mt-label text-xs leading-[1.45] text-fg-subtle">
        {help}
      </p>
    )}
  </div>
);
