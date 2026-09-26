import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import { type UseFormReturn, useForm } from 'react-hook-form';
import * as z from 'zod/mini';

import { isSuccess, type NormalizedError, safeApiError } from '@api/process-backend';
import { authKeys } from '@api/process-backend/auth';
import {
  type Settings,
  settingsKeys,
  type UpdateSettingsPayload,
  updateSettings,
  useSettings,
} from '@api/process-backend/settings';

const PREFIX = /^[A-Z]{2,6}$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const isAmount = (value: string) => /^\d+(\.\d{1,2})?$/.test(value.trim());

const settingsSchema = z
  .object({
    name: z.string(),
    gstNo: z.string(),
    numberPrefix: z.string(),
    electricityRate: z.string(),
    gstRate: z.string(),
  })
  .check((ctx) => {
    const values = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: 'custom', path: [path], message, input: values });
    if (values.name.trim().length < 2) issue('name', 'Enter the company name.');
    if (values.gstNo.trim() && !GSTIN.test(values.gstNo.trim().toUpperCase()))
      issue('gstNo', 'A GST number has 15 characters, like 27AABCF1234M1Z5.');
    if (values.numberPrefix.trim() && !PREFIX.test(values.numberPrefix.trim().toUpperCase()))
      issue('numberPrefix', 'Use 2 to 6 letters, like FN.');
    if (!isAmount(values.electricityRate))
      issue('electricityRate', 'Enter the rate per unit, like 8 or 8.50.');
    if (!isAmount(values.gstRate) || Number(values.gstRate) > 100)
      issue('gstRate', 'Enter a percentage between 0 and 100, like 18.');
  });

export type SettingsFormInput = z.infer<typeof settingsSchema>;

const FIELDS = ['name', 'gstNo', 'numberPrefix', 'electricityRate', 'gstRate'] as const;

const isFieldName = (key: string): key is keyof SettingsFormInput =>
  (FIELDS as readonly string[]).includes(key);

// The API names the rates under `settings.`; the form keeps them flat.
const toFieldName = (key: string) => key.replace(/^settings\./, '');

const EMPTY: SettingsFormInput = {
  name: '',
  gstNo: '',
  numberPrefix: '',
  electricityRate: '',
  gstRate: '',
};

const toFormValues = (settings: Settings): SettingsFormInput => ({
  name: settings.name,
  gstNo: settings.gstNo ?? '',
  numberPrefix: settings.numberPrefix ?? '',
  electricityRate: String(settings.settings.electricityRate ?? ''),
  gstRate: String(settings.settings.gstRate ?? ''),
});

// Blank GST number and prefix are sent as null, which is how the API clears them.
const toPayload = (values: SettingsFormInput): UpdateSettingsPayload => ({
  name: values.name.trim(),
  gstNo: values.gstNo.trim().toUpperCase() || null,
  numberPrefix: values.numberPrefix.trim().toUpperCase() || null,
  settings: {
    electricityRate: Number(values.electricityRate),
    gstRate: Number(values.gstRate),
  },
});

const toErrorMessage = (err: NormalizedError) =>
  err.error_type === 'network'
    ? "Couldn't reach the server. Check your connection and try again."
    : (err.message ?? 'Unable to save the settings right now.');

export interface UseCompanySettingsPageResult {
  form: UseFormReturn<SettingsFormInput>;
  isLoading: boolean;
  isError: boolean;
  isSubmitting: boolean;
  saved: string | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  dismissSaved: () => void;
  retry: () => void;
}

export const useCompanySettingsPage = (): UseCompanySettingsPageResult => {
  // state
  const [saved, setSaved] = useState<string | null>(null);

  // wiring
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useSettings();
  const form = useForm<SettingsFormInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: EMPTY,
    mode: 'onSubmit',
  });
  const { setError, reset } = form;

  // callbacks
  const handleValidSubmit = async (values: SettingsFormInput) => {
    setSaved(null);
    try {
      const response = await updateSettings(toPayload(values));
      if (!isSuccess(response.data)) {
        setError('root', { type: 'server', message: 'Unable to save the settings right now.' });
        return;
      }
      // The company name also shows in the shell, which reads it from /auth/me.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
        queryClient.invalidateQueries({ queryKey: authKeys.me }),
      ]);
      reset(toFormValues(response.data.data));
      setSaved('Settings saved. New orders and bills use them from now on.');
    } catch (error) {
      safeApiError(error, {
        context: { page: 'settings', action: 'updateSettings' },
        onError: (err) => {
          const fields = Object.entries(err.fields ?? {})
            .map(([key, message]) => [toFieldName(key), message] as const)
            .filter(([key]) => isFieldName(key)) as [keyof SettingsFormInput, string][];
          fields.forEach(([field, message], index) =>
            setError(field, { type: 'server', message }, { shouldFocus: index === 0 }),
          );
          if (fields.length === 0)
            setError('root', { type: 'server', message: toErrorMessage(err) });
        },
      });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(handleValidSubmit)(event);
  };

  // effects
  useEffect(() => {
    if (data) reset(toFormValues(data));
  }, [data]);

  return {
    form,
    isLoading: isPending,
    isError,
    isSubmitting: form.formState.isSubmitting,
    saved,
    handleSubmit,
    dismissSaved: () => setSaved(null),
    retry: () => void refetch(),
  };
};
