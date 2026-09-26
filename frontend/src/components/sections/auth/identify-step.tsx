import { Check, Mail, Smartphone } from 'lucide-react';
import type { FormEvent } from 'react';
import type { FieldError as RhfFieldError, UseFormRegisterReturn } from 'react-hook-form';

import { Button } from '@components/ui/button';
import { FieldError } from '@components/ui/field-error';
import { FieldLabel } from '@components/ui/field-label';
import { InputShell, inputClasses } from '@components/ui/input-shell';
import { cn } from '@lib/cn';
import { type IdentifierKind, toMobileInput } from '@utils/identifier';

const KINDS: { value: IdentifierKind; label: string; icon: typeof Smartphone }[] = [
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'email', label: 'Email', icon: Mail },
];

interface IdentifyStepProps {
  field: UseFormRegisterReturn<'identifier'>;
  error: RhfFieldError | undefined;
  kind: IdentifierKind;
  onKindChange: (kind: IdentifierKind) => void;
  isValid: boolean;
  shake: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export const IdentifyStep = ({
  field,
  error,
  kind,
  onKindChange,
  isValid,
  shake,
  onSubmit,
}: IdentifyStepProps) => {
  const isMobile = kind === 'mobile';
  const Icon = isMobile ? Smartphone : Mail;

  return (
    <form noValidate onSubmit={onSubmit} className="animate-rise">
      <h1 className="mb-2 text-[30px] leading-[1.15] font-semibold tracking-[-0.026em]">Sign in</h1>
      <p className="mb-6 text-sm leading-[1.55] text-fg-subtle">
        One sign-in for every role — we route you to the right workspace.
      </p>

      <div
        role="group"
        aria-label="Sign in with"
        className="mb-5 grid grid-cols-2 gap-1 rounded-12 border border-line bg-surface-muted p-1"
      >
        {KINDS.map(({ value, label, icon: KindIcon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => onKindChange(value)}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-10 text-13 font-medium transition-colors duration-150 lg:h-9.5',
              kind === value ? 'bg-surface text-fg shadow-card' : 'text-fg-secondary hover:text-fg',
            )}
          >
            <KindIcon className="size-4" strokeWidth={1.8} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <FieldLabel htmlFor="identifier" className="mb-2 block">
        {isMobile ? 'Mobile number' : 'Email address'}
      </FieldLabel>

      <InputShell
        size="lg"
        invalid={!!error}
        shake={shake}
        leading={<Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />}
        trailing={
          isValid &&
          !error && (
            <span className="grid size-5 flex-none animate-pop place-items-center rounded-full bg-success-soft text-success">
              <Check className="size-2.75" strokeWidth={3} aria-hidden="true" />
            </span>
          )
        }
      >
        {isMobile && <span className="flex-none font-mono text-sm text-fg-muted">+91</span>}
        <input
          id="identifier"
          type={isMobile ? 'tel' : 'email'}
          required
          inputMode={isMobile ? 'numeric' : 'email'}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={isMobile ? '98000 22222' : 'you@company.com'}
          aria-invalid={!!error}
          aria-describedby={error ? 'identifier-error' : undefined}
          className={inputClasses}
          {...field}
          onChange={(event) => {
            // Ten digits, however it arrives: a pasted "+91 98000 22222" keeps the number.
            if (isMobile) event.target.value = toMobileInput(event.target.value);
            return field.onChange(event);
          }}
        />
      </InputShell>
      <FieldError id="identifier-error" message={error?.message} reserve />

      <Button type="submit" className="mt-3.5">
        Continue
      </Button>
    </form>
  );
};
