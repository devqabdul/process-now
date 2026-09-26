import { Package, Trash2, Wrench } from 'lucide-react';
import type { FieldError as RhfFieldError, UseFormRegisterReturn } from 'react-hook-form';

import type { ServiceType } from '@api/process-backend/service-types';
import { FormField } from '@components/shared/form-field';
import { SelectField } from '@components/shared/select-field';
import { Card } from '@components/ui/card';
import { FieldError } from '@components/ui/field-error';
import { IconButton } from '@components/ui/icon-button';
import { formatMoney } from '@utils/format/money';

const ICON = 'size-4 text-fg-subtle';

/** A chosen option travels through the form as one string, so a list of them can hold it. */
export const optionKey = (group: string, choice: string) => JSON.stringify([group, choice]);

const priceLabel = (price: number) => (price > 0 ? ` (+${formatMoney(price.toFixed(2))})` : '');

interface OrderItemFieldsProps {
  index: number;
  serviceTypes: ServiceType[];
  serviceType: ServiceType | undefined;
  estimate: string | null;
  chosen: string[];
  serviceTypeField: UseFormRegisterReturn;
  qtyField: UseFormRegisterReturn;
  errors: {
    serviceTypeId?: RhfFieldError | undefined;
    qtyIn?: RhfFieldError | undefined;
    options?: { message?: string | undefined } | undefined;
  };
  canRemove: boolean;
  onRemove: () => void;
  // choice null clears a pick-one group.
  onChoose: (group: string, choice: string | null) => void;
}

export const OrderItemFields = ({
  index,
  serviceTypes,
  serviceType,
  estimate,
  chosen,
  serviceTypeField,
  qtyField,
  errors,
  canRemove,
  onRemove,
  onChoose,
}: OrderItemFieldsProps) => {
  const id = `item-${index}`;
  return (
    <Card className="p-3.5 lg:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-11 font-medium tracking-[0.1em] text-fg-muted uppercase">
          Line {index + 1}
        </p>
        {canRemove && (
          <IconButton aria-label={`Remove line ${index + 1}`} onClick={onRemove}>
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </IconButton>
        )}
      </div>

      <div className="mt-2 grid gap-x-field-x gap-y-field sm:grid-cols-[2fr_1fr]">
        <SelectField
          id={`${id}-service`}
          label="Service"
          required
          error={errors.serviceTypeId}
          leading={<Wrench className={ICON} strokeWidth={1.8} aria-hidden="true" />}
          {...serviceTypeField}
        >
          <option value="">Choose a service</option>
          {serviceTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} — {formatMoney(type.basePrice)} / {type.unit}
            </option>
          ))}
        </SelectField>

        <FormField
          id={`${id}-qty`}
          label={serviceType ? `Quantity (${serviceType.unit})` : 'Quantity'}
          required
          inputMode="decimal"
          placeholder="e.g. 120"
          error={errors.qtyIn}
          leading={<Package className={ICON} strokeWidth={1.8} aria-hidden="true" />}
          {...qtyField}
        />
      </div>

      {serviceType?.options.map((group) => (
        <fieldset key={group.group} className="mt-3 min-w-0">
          <legend className="mb-label text-xs font-semibold text-fg-secondary">
            {group.group}
            <span className="ml-1.5 font-normal text-fg-subtle">
              {group.multi ? 'any number' : 'pick one'}
            </span>
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {!group.multi && (
              <label className="flex min-h-11 items-center gap-2 text-13 lg:min-h-8">
                <input
                  type="radio"
                  name={`${id}-${group.group}`}
                  checked={
                    !chosen.some((key) =>
                      group.choices.some((c) => key === optionKey(group.group, c.name)),
                    )
                  }
                  onChange={() => onChoose(group.group, null)}
                />
                None
              </label>
            )}
            {group.choices.map((choice) => (
              <label
                key={choice.name}
                className="flex min-h-11 items-center gap-2 text-13 lg:min-h-8"
              >
                <input
                  type={group.multi ? 'checkbox' : 'radio'}
                  name={`${id}-${group.group}`}
                  checked={chosen.includes(optionKey(group.group, choice.name))}
                  onChange={() => onChoose(group.group, choice.name)}
                />
                {choice.name}
                <span className="text-fg-subtle">{priceLabel(choice.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <FieldError id={`${id}-options-error`} message={errors.options?.message} />

      {estimate !== null && (
        <p className="mt-3 text-right font-mono text-xs text-fg-secondary">
          ≈ {formatMoney(estimate)}
        </p>
      )}
    </Card>
  );
};
