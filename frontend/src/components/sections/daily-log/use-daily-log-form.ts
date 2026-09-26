import { zodResolver } from '@hookform/resolvers/zod';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import * as z from 'zod/mini';

import type { DailyLog } from '@api/process-backend/daily-logs';
import { todayIso } from '@utils/format/date';

// The API takes up to two decimal places on both figures.
const isQuantity = (value: string) => /^\d+(\.\d{1,2})?$/.test(value.trim());

const dailyLogSchema = z
  .object({
    date: z.string(),
    machineHours: z.string(),
    electricityUnits: z.string(),
    notes: z.string(),
  })
  .check((ctx) => {
    const { date, machineHours, electricityUnits, notes } = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: 'custom', path: [path], message, input: ctx.value });
    if (!date) issue('date', 'Pick the day this log is for.');
    else if (date > todayIso()) issue('date', "A day that hasn't happened can't be logged.");
    if (!isQuantity(machineHours) || Number(machineHours) > 9999)
      issue('machineHours', 'Enter the hours the machines ran, like 8 or 7.5.');
    if (!isQuantity(electricityUnits) || Number(electricityUnits) > 99_999_999)
      issue('electricityUnits', 'Enter the meter units used, like 120 or 120.5.');
    if (notes.length > 500) issue('notes', 'Keep notes under 500 characters.');
  });

export type DailyLogFormInput = z.infer<typeof dailyLogSchema>;

export interface DailyLogSaveResult {
  ok: boolean;
  message?: string;
  fields?: Partial<Record<keyof DailyLogFormInput, string>>;
}

const toValues = (date: string, log: DailyLog | null | undefined): DailyLogFormInput => ({
  date,
  machineHours: log?.machineHours ?? '',
  electricityUnits: log?.electricityUnits ?? '',
  notes: log?.notes ?? '',
});

interface UseDailyLogFormOptions {
  date: string;
  // The day's saved log, to edit; null or undefined starts the form empty.
  log: DailyLog | null | undefined;
  onSubmit: (values: DailyLogFormInput) => Promise<DailyLogSaveResult>;
  // Re-fill the form whenever this changes (the day's log arriving, a dialog opening).
  resetKey: unknown;
}

/** One form for the Today card and the edit sheet: same fields, rules and error mapping. */
export const useDailyLogForm = ({
  date,
  log,
  onSubmit,
  resetKey,
}: UseDailyLogFormOptions): {
  form: UseFormReturn<DailyLogFormInput>;
  submit: (event: FormEvent<HTMLFormElement>) => void;
} => {
  // wiring
  const form = useForm<DailyLogFormInput>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: toValues(date, log),
    mode: 'onSubmit',
  });

  // callbacks
  const handleValid = async (values: DailyLogFormInput) => {
    const result = await onSubmit(values);
    if (result.ok) return;
    const fields = Object.entries(result.fields ?? {}) as [keyof DailyLogFormInput, string][];
    fields.forEach(([field, message], index) =>
      form.setError(field, { type: 'server', message }, { shouldFocus: index === 0 }),
    );
    if (fields.length === 0)
      form.setError('root', {
        type: 'server',
        message: result.message ?? 'Unable to save this log right now.',
      });
  };

  // effects
  useEffect(() => {
    form.reset(toValues(date, log));
  }, [resetKey]);

  return { form, submit: (event) => void form.handleSubmit(handleValid)(event) };
};
