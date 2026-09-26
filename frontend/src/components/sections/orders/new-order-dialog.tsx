import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardList, NotebookPen, Plus, Truck } from 'lucide-react';
import { useEffect } from 'react';
import { type FieldPath, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import * as z from 'zod/mini';

import type { ServiceType } from '@api/process-backend/service-types';
import type { Vendor } from '@api/process-backend/vendors';
import { FormField } from '@components/shared/form-field';
import { SelectField } from '@components/shared/select-field';
import { Button, buttonClasses } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';
import { FieldError } from '@components/ui/field-error';
import { cn } from '@lib/cn';
import { formatMoney } from '@utils/format/money';

import { OrderItemFields, optionKey } from './order-item-fields';

const ICON = 'size-4 text-fg-subtle';
// The API caps an order at 50 lines.
const MAX_ITEMS = 50;

const isQuantity = (value: string) => /^\d+(\.\d{1,3})?$/.test(value.trim());

export const fromOptionKey = (key: string) => {
  const [group = '', choice = ''] = JSON.parse(key) as string[];
  return { group, choice };
};

const newOrderSchema = z
  .object({
    vendorId: z.string(),
    notes: z.string(),
    items: z.array(
      z.object({ serviceTypeId: z.string(), qtyIn: z.string(), options: z.array(z.string()) }),
    ),
  })
  .check((ctx) => {
    const values = ctx.value;
    const issue = (path: (string | number)[], message: string) =>
      ctx.issues.push({ code: 'custom', path, message, input: values });
    if (!values.vendorId) issue(['vendorId'], 'Choose the vendor who sent the lot.');
    if (values.notes.length > 500) issue(['notes'], 'Keep notes under 500 characters.');
    values.items.forEach((item, index) => {
      if (!item.serviceTypeId) issue(['items', index, 'serviceTypeId'], 'Choose the service.');
      if (!isQuantity(item.qtyIn) || Number(item.qtyIn) <= 0)
        issue(['items', index, 'qtyIn'], 'Enter the quantity received, like 120 or 12.5.');
    });
  });

export type NewOrderFormInput = z.infer<typeof newOrderSchema>;
export type NewOrderField = FieldPath<NewOrderFormInput>;

const EMPTY_ITEM = { serviceTypeId: '', qtyIn: '', options: [] };
const EMPTY: NewOrderFormInput = { vendorId: '', notes: '', items: [EMPTY_ITEM] };

export interface NewOrderSaveResult {
  ok: boolean;
  message?: string;
  fields?: Partial<Record<NewOrderField, string>>;
}

const toPaise = (value: string | number) => Math.round(Number(value) * 100);

/**
 * Display only — the server prices the order from the service type. Worked in whole paise so
 * the preview never shows float noise; billed-on-return lines may change once returned.
 */
const estimatePaise = (serviceType: ServiceType | undefined, options: string[], qty: string) => {
  if (!serviceType || !isQuantity(qty)) return null;
  const unit = options.reduce((sum, key) => {
    const { group, choice } = fromOptionKey(key);
    const found = serviceType.options
      .find((option) => option.group === group)
      ?.choices.find((option) => option.name === choice);
    return sum + toPaise(found?.price ?? 0);
  }, toPaise(serviceType.basePrice));
  return Math.round(unit * Number(qty));
};

const paiseToAmount = (paise: number) => (paise / 100).toFixed(2);

interface NewOrderDialogProps {
  open: boolean;
  // Active only: retired vendors and inactive services take no new orders.
  vendors: Vendor[];
  serviceTypes: ServiceType[];
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (values: NewOrderFormInput) => Promise<NewOrderSaveResult>;
}

export const NewOrderDialog = ({
  open,
  vendors,
  serviceTypes,
  isLoading,
  onClose,
  onSubmit,
}: NewOrderDialogProps) => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewOrderFormInput>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: EMPTY,
    mode: 'onSubmit',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });

  // derived
  const lines = watchedItems.map((item) => {
    const serviceType = serviceTypes.find((type) => type.id === item.serviceTypeId);
    return {
      serviceType,
      chosen: item.options,
      paise: estimatePaise(serviceType, item.options, item.qtyIn),
    };
  });
  const estimateTotal = lines.every((line) => line.paise !== null)
    ? paiseToAmount(lines.reduce((sum, line) => sum + (line.paise ?? 0), 0))
    : null;
  const missing = !isLoading && (vendors.length === 0 || serviceTypes.length === 0);

  // callbacks
  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (result.ok) return;
    const entries = Object.entries(result.fields ?? {}) as [NewOrderField, string][];
    entries.forEach(([field, message], index) =>
      setError(field, { type: 'server', message }, { shouldFocus: index === 0 }),
    );
    if (entries.length === 0)
      setError('root', {
        type: 'server',
        message: result.message ?? 'Unable to save this order right now.',
      });
  });

  // A pick-one group swaps its choice; an any-number group toggles it.
  const choose = (index: number, group: string, choice: string | null) => {
    const current = watchedItems[index]?.options ?? [];
    const multi = lines[index]?.serviceType?.options.find((o) => o.group === group)?.multi;
    const others = current.filter((key) => fromOptionKey(key).group !== group);
    const inGroup = current.filter((key) => fromOptionKey(key).group === group);
    const key = choice === null ? null : optionKey(group, choice);
    const nextGroup = !key
      ? []
      : !multi
        ? [key]
        : inGroup.includes(key)
          ? inGroup.filter((existing) => existing !== key)
          : [...inGroup, key];
    setValue(`items.${index}.options`, [...others, ...nextGroup]);
  };

  // effects
  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open]);

  return (
    <Dialog
      open={open}
      title="New order"
      description={
        missing
          ? 'An order needs a vendor who sent it and a service to price it by.'
          : "Record a lot as it comes in: who sent it, what's to be done, how much."
      }
      icon={
        <span className="grid size-9 flex-none place-items-center rounded-10 bg-surface-muted text-fg-secondary">
          <ClipboardList aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
        </span>
      }
      // Nothing to fill in until both exist: the small card, not a full-height sheet.
      sheet={!missing}
      busy={isSubmitting}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      action={
        missing ? (
          <Link
            to={vendors.length === 0 ? '/vendors' : '/service-types'}
            className={cn(buttonClasses('primary', 'md'), 'w-full hover:text-primary-fg')}
          >
            {vendors.length === 0 ? 'Add a vendor first' : 'Add a service type first'}
          </Link>
        ) : (
          <Button
            type="submit"
            size="md"
            loading={isSubmitting}
            disabled={isLoading}
            className="w-full"
          >
            {isSubmitting ? 'Taking in…' : 'Take in order'}
          </Button>
        )
      }
    >
      {missing ? (
        <p className="text-13 leading-[1.55] text-fg-secondary">
          {vendors.length === 0
            ? 'Add who sends you work on the Vendors page, then come back.'
            : 'Add a service and its rate on the Service types page, then come back.'}
        </p>
      ) : (
        <>
          <SelectField
            id="order-vendor"
            label="Who sent it"
            required
            disabled={isLoading}
            error={errors.vendorId}
            leading={<Truck className={ICON} strokeWidth={1.8} aria-hidden="true" />}
            {...register('vendorId')}
          >
            <option value="">{isLoading ? 'Loading vendors…' : 'Choose a vendor'}</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </SelectField>

          {fields.map((item, index) => (
            <OrderItemFields
              key={item.id}
              index={index}
              serviceTypes={serviceTypes}
              serviceType={lines[index]?.serviceType}
              estimate={lines[index]?.paise == null ? null : paiseToAmount(lines[index].paise)}
              chosen={lines[index]?.chosen ?? []}
              // Options belong to one service type; switching service starts them over.
              serviceTypeField={register(`items.${index}.serviceTypeId`, {
                onChange: () => setValue(`items.${index}.options`, []),
              })}
              qtyField={register(`items.${index}.qtyIn`)}
              errors={errors.items?.[index] ?? {}}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
              onChoose={(group, choice) => choose(index, group, choice)}
            />
          ))}

          {fields.length < MAX_ITEMS && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => append(EMPTY_ITEM)}
              className="self-start"
            >
              <Plus aria-hidden="true" className="size-3.75" strokeWidth={2.2} />
              Add another service
            </Button>
          )}

          <FormField
            id="order-notes"
            label="Notes"
            hint="Optional"
            maxLength={500}
            placeholder="Two bundles, blue tags"
            error={errors.notes}
            leading={<NotebookPen className={ICON} strokeWidth={1.8} aria-hidden="true" />}
            {...register('notes')}
          />

          {estimateTotal !== null && (
            <p className="text-xs text-fg-subtle">
              Estimate{' '}
              <span className="font-mono text-sm font-semibold text-fg">
                {formatMoney(estimateTotal)}
              </span>{' '}
              before GST — the bill is worked out on return.
            </p>
          )}
        </>
      )}

      <FieldError id="new-order-error" message={errors.root?.message} />
    </Dialog>
  );
};
