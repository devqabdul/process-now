import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod/mini';

import type { Company } from '@api/process-backend/companies';
import { FormField } from '@components/shared/form-field';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { IconButton } from '@components/ui/icon-button';

const schema = z.object({ password: z.string() }).check((ctx) => {
  if (ctx.value.password.length < 8) {
    ctx.issues.push({
      code: 'custom',
      path: ['password'],
      message: 'Use at least 8 characters.',
      input: ctx.value,
    });
  }
});

export type ResetPasswordFormInput = z.infer<typeof schema>;

interface ResetPasswordDialogProps {
  company: Company | null;
  showPassword: boolean;
  onTogglePassword: () => void;
  onClose: () => void;
  onSubmit: (password: string) => Promise<{ ok: boolean; message?: string }>;
}

export const ResetPasswordDialog = ({
  company,
  showPassword,
  onTogglePassword,
  onClose,
  onSubmit,
}: ResetPasswordDialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  // callbacks
  const submit = handleSubmit(async ({ password }) => {
    const result = await onSubmit(password);
    if (!result.ok) {
      setError('root', {
        type: 'server',
        message: result.message ?? 'Unable to change this password right now.',
      });
    }
  });

  // effects
  useEffect(() => {
    if (company) reset({ password: '' });
  }, [company, reset]);

  return (
    <Dialog
      open={!!company}
      title="Change admin password"
      description={`Sets a new password for ${company?.admin?.name ?? 'the company admin'} at ${company?.name}. They are signed out everywhere and will need the new one.`}
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-surface-muted text-fg-secondary">
          <KeyRound aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      action={
        <Button type="submit" size="md" loading={isSubmitting} className="w-full">
          Change password
        </Button>
      }
    >
      <FormField
        id="new-admin-password"
        label="New password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={errors.password}
        leading={<Lock className="size-4 text-fg-subtle" strokeWidth={1.8} aria-hidden="true" />}
        trailing={
          <IconButton
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={onTogglePassword}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4" strokeWidth={1.8} />
            ) : (
              <Eye aria-hidden="true" className="size-4" strokeWidth={1.8} />
            )}
          </IconButton>
        }
        {...register('password')}
      />

      <FieldError id="reset-password-error" message={errors.root?.message} />
    </Dialog>
  );
};
