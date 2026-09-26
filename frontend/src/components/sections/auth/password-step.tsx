import { ChevronLeft, Eye, EyeOff, Lock, Smartphone } from 'lucide-react';
import type { FormEvent } from 'react';
import type { FieldError as RhfFieldError, UseFormRegisterReturn } from 'react-hook-form';

import { Button } from '@components/ui/button';
import { FieldError } from '@components/ui/field-error';
import { FieldLabel } from '@components/ui/field-label';
import { InputShell, inputClasses } from '@components/ui/input-shell';

interface PasswordStepProps {
  field: UseFormRegisterReturn<'password'>;
  error: RhfFieldError | undefined;
  identityShown: string;
  isMobile: boolean;
  showPassword: boolean;
  shake: boolean;
  isSubmitting: boolean;
  onTogglePassword: () => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export const PasswordStep = ({
  field,
  error,
  identityShown,
  isMobile,
  showPassword,
  shake,
  isSubmitting,
  onTogglePassword,
  onBack,
  onSubmit,
}: PasswordStepProps) => (
  <form noValidate onSubmit={onSubmit} className="animate-rise [animation-duration:0.36s]">
    <button
      type="button"
      onClick={onBack}
      className="mb-5 flex items-center gap-1.5 text-13 font-semibold text-fg-subtle transition-colors duration-200 hover:text-fg"
    >
      <ChevronLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
      Back
    </button>
    <h1 className="mb-5.5 text-[28px] leading-[1.18] font-semibold tracking-[-0.026em]">
      Enter your password
    </h1>

    <div className="mb-6 flex items-center gap-2.5 rounded-12 border border-line-subtle bg-surface-subtle px-3 py-2.5">
      <span className="grid size-7 flex-none place-items-center rounded-9 bg-fg-subtle text-11 font-bold text-surface">
        {isMobile ? (
          <Smartphone className="size-3.5" strokeWidth={2} aria-hidden="true" />
        ) : (
          identityShown.charAt(0).toUpperCase()
        )}
      </span>
      <span className="min-w-0 truncate text-13 font-medium">{identityShown}</span>
      <button
        type="button"
        onClick={onBack}
        className="ml-auto flex-none text-xs font-semibold text-link hover:text-link-hover"
      >
        Change
      </button>
    </div>

    <div className="mb-2">
      <FieldLabel htmlFor="password">Password</FieldLabel>
    </div>
    <InputShell
      size="lg"
      invalid={!!error}
      shake={shake}
      leading={<Lock className="size-4" strokeWidth={1.8} aria-hidden="true" />}
      trailing={
        <button
          type="button"
          onClick={onTogglePassword}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="grid size-11 flex-none place-items-center rounded-8 text-fg-subtle lg:size-7 transition-colors duration-150 hover:bg-surface-muted hover:text-fg-secondary"
        >
          {showPassword ? (
            <EyeOff className="size-3.75" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye className="size-3.75" strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      }
    >
      <input
        id="password"
        type={showPassword ? 'text' : 'password'}
        required
        autoComplete="current-password"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the step exists only to take this input
        autoFocus
        placeholder="••••••••"
        aria-invalid={!!error}
        aria-describedby={error ? 'password-error' : undefined}
        className={inputClasses}
        {...field}
      />
    </InputShell>
    <FieldError id="password-error" message={error?.message} reserve />

    <Button type="submit" loading={isSubmitting} className="mt-3.5">
      {isSubmitting ? 'Signing in…' : 'Sign in'}
    </Button>
  </form>
);
