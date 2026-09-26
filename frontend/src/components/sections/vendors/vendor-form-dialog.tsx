import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Smartphone, Store, User } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod/mini';

import type { Vendor } from '@api/process-backend/vendors';
import { FormField } from '@components/shared/form-field';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { isValidMobile, toMobileInput } from '@utils/identifier';

const ICON = 'size-4 text-fg-subtle';

const vendorSchema = z
  .object({ name: z.string(), phone: z.string(), address: z.string() })
  .check((ctx) => {
    const { name, phone } = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: 'custom', path: [path], message, input: ctx.value });
    if (name.trim().length < 2) issue('name', "Enter the vendor's name.");
    if (!isValidMobile(phone)) issue('phone', 'Mobile number must be 10 digits.');
  });

export type VendorFormInput = z.infer<typeof vendorSchema>;

const EMPTY: VendorFormInput = { name: '', phone: '', address: '' };

interface VendorFormDialogProps {
  // null = closed; a vendor = editing it; 'new' = adding one.
  target: Vendor | 'new' | null;
  onClose: () => void;
  onSubmit: (values: VendorFormInput) => Promise<{ ok: boolean; message?: string }>;
}

export const VendorFormDialog = ({ target, onClose, onSubmit }: VendorFormDialogProps) => {
  const editing = target !== null && target !== 'new' ? target : null;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormInput>({ resolver: zodResolver(vendorSchema), defaultValues: EMPTY });
  const phone = register('phone');

  // callbacks
  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (!result.ok) {
      setError('root', {
        type: 'server',
        message: result.message ?? 'Unable to save this vendor right now.',
      });
    }
  });

  // effects
  useEffect(() => {
    if (target) reset(editing ? { ...EMPTY, ...editing, address: editing.address ?? '' } : EMPTY);
  }, [target, editing, reset]);

  return (
    <Dialog
      open={!!target}
      title={editing ? 'Edit vendor' : 'New vendor'}
      description={
        editing
          ? 'Their orders and bills keep whatever was recorded at the time.'
          : 'The business that brings work in. A mobile number is how you reach them about an order.'
      }
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-surface-muted text-fg-secondary">
          <Store aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      sheet
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      action={
        <Button type="submit" size="md" loading={isSubmitting} className="w-full">
          {editing ? 'Save changes' : 'Add vendor'}
        </Button>
      }
    >
      <FormField
        id="vendor-name"
        label="Vendor name"
        required
        placeholder="Business or person's name"
        autoComplete="organization"
        error={errors.name}
        leading={<User className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        {...register('name')}
      />
      <FormField
        id="vendor-phone"
        label="Mobile number"
        required
        type="tel"
        inputMode="numeric"
        placeholder="9800022222"
        autoComplete="tel"
        error={errors.phone}
        leading={<Smartphone className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        {...phone}
        onChange={(event) => {
          event.target.value = toMobileInput(event.target.value);
          return phone.onChange(event);
        }}
      />
      <FormField
        id="vendor-address"
        label="Address"
        hint="Optional"
        placeholder="Shop 4, Ring Road"
        error={errors.address}
        leading={<MapPin className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        {...register('address')}
      />

      <FieldError id="vendor-form-error" message={errors.root?.message} />
    </Dialog>
  );
};
