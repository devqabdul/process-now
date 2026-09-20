import { Check, Mail, Smartphone } from 'lucide-react';
import type { FormEvent } from 'react';
import type { FieldError as RhfFieldError, UseFormRegisterReturn } from 'react-hook-form';

import { Button } from '@components/ui/button';
import { FieldError } from '@components/ui/field-error';
import { FieldLabel } from '@components/ui/field-label';
import { InputShell, inputClasses } from '@components/ui/input-shell';
import type { IdentifierKind } from '@utils/identifier';

interface IdentifyStepProps {
  field: UseFormRegisterReturn<'identifier'>;
  error: RhfFieldError | undefined;
  kind: IdentifierKind | null;
  isValid: boolean;
  shake: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export const IdentifyStep = ({
  field,
  error,
  kind,
  isValid,
  shake,
  onSubmit,
}: IdentifyStepProps) => {
  const isMobile = kind === 'mobile';
  const Icon = isMobile ? Smartphone : Mail;

  return (
    <form noValidate onSubmit={onSubmit} className="animate-rise">
      <h1 className="mb-2 text-[30px] leading-[1.15] font-semibold tracking-[-0.026em]">Sign in</h1>
      <p className="mb-7.5 text-sm leading-[1.55] text-fg-subtle">
        One sign-in for every role — we route you to the right workspace.
      </p>

      <div className="mb-2 flex items-baseline justify-between">
        <FieldLabel htmlFor="identifier">Email or mobile number</FieldLabel>
        {kind && !error && (
          <span className="inline-flex animate-pop items-center rounded-6 bg-success-soft px-1.75 py-0.5 font-mono text-[9.5px] tracking-[0.08em] text-success uppercase">
            {isMobile ? 'Mobile' : 'Email'}
          </span>
        )}
      </div>

      <InputShell
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
          type="text"
          required
          inputMode={isMobile ? 'tel' : 'email'}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@company.com or 98000 22222"
          aria-invalid={!!error}
          aria-describedby={error ? 'identifier-error' : undefined}
          className={inputClasses}
          {...field}
        />
      </InputShell>
      <FieldError id="identifier-error" message={error?.message} />

      <Button type="submit" className="mt-3.5">
        Continue
      </Button>
    </form>
  );
};
