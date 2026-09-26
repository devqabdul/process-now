import { CalendarDays, Clock, NotebookPen, Zap } from 'lucide-react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import { AmountWords } from '@components/shared/amount-words';
import { FormField } from '@components/shared/form-field';
import { FieldError } from '@components/ui/field-error';
import { formatMoney } from '@utils/format/money';

import type { DailyLogFormInput } from './use-daily-log-form';

const ICON = 'size-4 text-fg-subtle';
const RATE = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * Units × the company's rate, for display only: the dashboard's figure is worked out server-side.
 * Undefined when there is no rate set or the units aren't a number yet.
 */
export const estimateElectricityCost = (units: string, rate: number | undefined) => {
  if (!rate || rate <= 0 || units.trim() === '') return undefined;
  const cost = Number(units) * rate;
  return Number.isFinite(cost) ? (Math.round(cost * 100) / 100).toFixed(2) : undefined;
};

interface DailyLogFieldsProps {
  form: UseFormReturn<DailyLogFormInput>;
  // Prefixes every id, so the Today card and the edit sheet can both be on the page.
  idPrefix: string;
  // ₹ per unit from company settings; undefined hides the cost estimate.
  rate: number | undefined;
  // Show the day as a field (logging another day); otherwise it is fixed by the caller.
  pickDate?: { max: string };
}

export const DailyLogFields = ({ form, idPrefix, rate, pickDate }: DailyLogFieldsProps) => {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const [hours, units] = useWatch({ control, name: ['machineHours', 'electricityUnits'] });
  const cost = estimateElectricityCost(units, rate);

  return (
    <>
      {pickDate && (
        <FormField
          id={`${idPrefix}-date`}
          label="Day"
          required
          type="date"
          max={pickDate.max}
          error={errors.date}
          help="Saving a day that is already logged replaces it."
          leading={<CalendarDays className={ICON} strokeWidth={1.8} aria-hidden="true" />}
          {...register('date')}
        />
      )}
      {!pickDate && <FieldError id={`${idPrefix}-date-error`} message={errors.date?.message} />}

      <div className="grid gap-x-field-x gap-y-field sm:grid-cols-2">
        <FormField
          id={`${idPrefix}-hours`}
          label="Machine hours"
          required
          inputMode="decimal"
          placeholder="e.g. 8"
          error={errors.machineHours}
          leading={<Clock className={ICON} strokeWidth={1.8} aria-hidden="true" />}
          help={<AmountWords value={hours} unit="hours" />}
          {...register('machineHours')}
        />
        <FormField
          id={`${idPrefix}-units`}
          label="Electricity units"
          required
          inputMode="decimal"
          placeholder="e.g. 120"
          error={errors.electricityUnits}
          leading={<Zap className={ICON} strokeWidth={1.8} aria-hidden="true" />}
          help={
            <>
              <AmountWords value={units} unit="units" />
              {cost !== undefined && (
                <span className="block">
                  ≈ {formatMoney(cost)} at ₹{RATE.format(rate ?? 0)}/unit (estimate)
                </span>
              )}
            </>
          }
          {...register('electricityUnits')}
        />
      </div>

      <FormField
        id={`${idPrefix}-notes`}
        label="Notes"
        hint="Optional"
        maxLength={500}
        placeholder="Power cut 2–4 pm"
        error={errors.notes}
        leading={<NotebookPen className={ICON} strokeWidth={1.8} aria-hidden="true" />}
        {...register('notes')}
      />

      <FieldError id={`${idPrefix}-form-error`} message={errors.root?.message} />
    </>
  );
};
