import { zodResolver } from '@hookform/resolvers/zod';
import { IndianRupee, Ruler, Wrench } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod/mini';

import type { BillOn, ServiceType } from '@api/process-backend/service-types';
import { FormField } from '@components/shared/form-field';
import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';

const ICON = 'size-4 text-fg-subtle';

// Money arrives as a string from the input; the API takes a number. Reject anything that
// isn't a plain amount rather than posting NaN.
const isAmount = (value: string) => /^\d+(\.\d{1,2})?$/.test(value.trim());

const serviceTypeSchema = z
  .object({
    name: z.string(),
    unit: z.string(),
    basePrice: z.string(),
    baseCost: z.string(),
    billOn: z.string(),
    isActive: z.boolean(),
  })
  .check((ctx) => {
    const { name, unit, basePrice, baseCost } = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: 'custom', path: [path], message, input: ctx.value });
    if (name.trim().length < 2) issue('name', 'Name this service.');
    if (!unit.trim()) issue('unit', 'What is one of these called — piece, kg, metre?');
    if (!isAmount(basePrice)) issue('basePrice', 'Enter an amount, like 45 or 45.50.');
    if (!isAmount(baseCost)) issue('baseCost', 'Enter an amount, like 12 or 12.50.');
    // Losing money on every piece is a mistake worth catching at entry, not at month end.
    if (isAmount(basePrice) && isAmount(baseCost) && Number(baseCost) > Number(basePrice))
      issue('baseCost', 'This costs more to run than it charges. Check both figures.');
  });

export type ServiceTypeFormInput = z.infer<typeof serviceTypeSchema>;

const EMPTY: ServiceTypeFormInput = {
  name: '',
  unit: '',
  basePrice: '',
  baseCost: '',
  billOn: 'in',
  isActive: true,
};

const BILL_ON: { value: BillOn; label: string; hint: string }[] = [
  { value: 'in', label: 'Received', hint: 'Bill the quantity the vendor brought in' },
  { value: 'out', label: 'Returned', hint: 'Bill the quantity that passed and went back' },
];

interface ServiceTypeFormDialogProps {
  // null = closed; a service type = editing it; 'new' = adding one.
  target: ServiceType | 'new' | null;
  onClose: () => void;
  onSubmit: (values: ServiceTypeFormInput) => Promise<{ ok: boolean; message?: string }>;
}

export const ServiceTypeFormDialog = ({
  target,
  onClose,
  onSubmit,
}: ServiceTypeFormDialogProps) => {
  const editing = target !== null && target !== 'new' ? target : null;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ServiceTypeFormInput>({
    resolver: zodResolver(serviceTypeSchema),
    defaultValues: EMPTY,
  });

  // callbacks
  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (!result.ok) {
      setError('root', {
        type: 'server',
        message: result.message ?? 'Unable to save this service right now.',
      });
    }
  });

  // effects
  useEffect(() => {
    if (!target) return;
    reset(
      editing
        ? {
            name: editing.name,
            unit: editing.unit,
            basePrice: editing.basePrice,
            baseCost: editing.baseCost,
            billOn: editing.billOn,
            isActive: editing.isActive,
          }
        : EMPTY,
    );
  }, [target, editing, reset]);

  return (
    <Dialog
      open={!!target}
      title={editing ? 'Edit service' : 'New service'}
      description={
        editing
          ? 'Orders already placed keep the price and cost they were created with.'
          : 'A job this company does, and what it charges for one of them.'
      }
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-surface-muted text-fg-secondary">
          <Wrench aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      action={
        <Button type="submit" size="md" loading={isSubmitting} className="w-full">
          {editing ? 'Save changes' : 'Add service'}
        </Button>
      }
    >
      <FormField
        id="service-name"
        label="Service name"
        required
        placeholder="Sherwani fusing"
        error={errors.name}
        leading={<Wrench className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        {...register('name')}
      />
      <FormField
        id="service-unit"
        label="Charged per"
        required
        placeholder="piece"
        error={errors.unit}
        leading={<Ruler className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        {...register('unit')}
      />

      <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
        <FormField
          id="service-price"
          label="Price"
          required
          inputMode="decimal"
          placeholder="45"
          error={errors.basePrice}
          leading={<IndianRupee className={ICON} strokeWidth={1.8} aria-hidden="true" />}
          {...register('basePrice')}
        />
        <FormField
          id="service-cost"
          label="Cost to run"
          required
          inputMode="decimal"
          placeholder="12"
          error={errors.baseCost}
          leading={<IndianRupee className={ICON} strokeWidth={1.8} aria-hidden="true" />}
          {...register('baseCost')}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-[12.5px] font-medium">Bill on the quantity</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {BILL_ON.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-2 rounded-12 border border-line-input p-2.5 transition-colors duration-150 hover:bg-surface-muted has-checked:border-primary has-checked:bg-surface-muted"
            >
              <input
                type="radio"
                value={option.value}
                className="mt-0.5 size-3.75 flex-none accent-primary"
                {...register('billOn')}
              />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium">{option.label}</span>
                <span className="block text-[11px] leading-[1.45] text-fg-subtle">
                  {option.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {editing && (
        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
          <span className="min-w-0">
            <span className="block text-[12.5px] font-medium">Available for new orders</span>
            <span className="block text-[11px] text-fg-subtle">
              Turn this off to retire it without touching past orders.
            </span>
          </span>
        </label>
      )}

      <FieldError id="service-type-form-error" message={errors.root?.message} />
    </Dialog>
  );
};
