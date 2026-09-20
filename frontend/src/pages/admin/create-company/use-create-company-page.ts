import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';
import * as z from 'zod/mini';

import { isSuccess, type NormalizedError, safeApiError } from '@api/process-backend';
import {
  companiesKeys,
  createCompany,
  type CreateCompanyPayload,
} from '@api/process-backend/companies';
import { isValidEmail, isValidMobile, toMobileDigits } from '@utils/identifier';

// Shown in front of order and bill numbers: FN → FN-0001.
const PREFIX = /^[A-Z]{2,6}$/;

// 15 characters: state code, PAN, entity number, a letter and a check digit.
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;

/**
 * A prefix suggested from the company name: initials for several words ("Shree Ram Textiles" →
 * SRT), capitals for one ("FuseNow" → FN), else its first two letters. Empty when nothing
 * usable comes out, so the field stays blank rather than carrying a bad guess.
 */
const toPrefix = (name: string) => {
  const words = name
    .trim()
    .split(/[^A-Za-z]+/)
    .filter(Boolean);
  const initials =
    words.length > 1 ? words.map((word) => word[0]) : (words[0]?.match(/[A-Z]/g) ?? []);
  const letters = (initials.length >= 2 ? initials.join('') : (words[0] ?? '').slice(0, 2))
    .toUpperCase()
    .slice(0, 6);
  return PREFIX.test(letters) ? letters : '';
};

/**
 * A placeholder GSTIN built from the company name so demo companies don't share one, in the
 * shape the validator accepts: state code, 5 letters, 4 digits, a letter, entity digit, Z, check.
 * It is a stand-in for data entry, not a real registration — anyone can type over it.
 */
const toSampleGstNo = (name: string) => {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (letters.length < 2) return '';
  const pan = letters.slice(0, 5).padEnd(5, 'A');
  let hash = 0;
  for (const char of letters) hash = (hash * 31 + char.charCodeAt(0)) % 10_000;
  return `27${pan}${String(hash).padStart(4, '0')}M1Z${hash % 10}`;
};

const createCompanySchema = z
  .object({
    name: z.string(),
    gstNo: z.string(),
    numberPrefix: z.string(),
    adminName: z.string(),
    adminPhone: z.string(),
    adminEmail: z.string(),
    password: z.string(),
  })
  .check((ctx) => {
    const values = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: 'custom', path: [path], message, input: values });
    const phone = values.adminPhone.trim();
    const email = values.adminEmail.trim();

    if (values.name.trim().length < 2) issue('name', 'Enter the company name.');
    if (values.gstNo.trim() && !GSTIN.test(values.gstNo.trim().toUpperCase()))
      issue('gstNo', 'A GST number has 15 characters, like 27AABCF1234M1Z5.');
    if (values.numberPrefix.trim() && !PREFIX.test(values.numberPrefix.trim().toUpperCase()))
      issue('numberPrefix', 'Use 2 to 6 letters, like FN.');
    if (values.adminName.trim().length < 2) issue('adminName', "Enter the admin's full name.");
    // The users table needs a phone, an email, or both: the admin signs in with one of them.
    if (!phone && !email)
      issue('adminPhone', 'Add a mobile number or an email — the admin signs in with one of them.');
    if (phone && !isValidMobile(phone)) issue('adminPhone', 'Mobile number must be 10 digits.');
    if (email && !isValidEmail(email))
      issue('adminEmail', 'That does not look like a valid email address.');
    if (values.password.length < 8) issue('password', 'Use at least 8 characters.');
  });

export type CreateCompanyFormInput = z.infer<typeof createCompanySchema>;

const FIELDS = [
  'name',
  'gstNo',
  'numberPrefix',
  'adminName',
  'adminPhone',
  'adminEmail',
  'password',
] as const;

const isFieldName = (key: string): key is keyof CreateCompanyFormInput =>
  (FIELDS as readonly string[]).includes(key);

const toCreateErrorMessage = (err: NormalizedError) =>
  err.error_type === 'network'
    ? 'Unable to save this company. Check your connection and try again.'
    : 'Unable to save this company right now. Try again in a moment.';

const toPayload = (values: CreateCompanyFormInput): CreateCompanyPayload => {
  const gstNo = values.gstNo.trim();
  const numberPrefix = values.numberPrefix.trim();
  const phone = values.adminPhone.trim();
  const email = values.adminEmail.trim();
  return {
    name: values.name.trim(),
    gstNo: gstNo ? gstNo.toUpperCase() : null,
    numberPrefix: numberPrefix ? numberPrefix.toUpperCase() : null,
    admin: {
      name: values.adminName.trim(),
      phone: phone ? toMobileDigits(phone) : null,
      email: email ? email.toLowerCase() : null,
      password: values.password,
    },
  };
};

const EMPTY: CreateCompanyFormInput = {
  name: '',
  gstNo: '',
  numberPrefix: '',
  adminName: '',
  adminPhone: '',
  adminEmail: '',
  password: '',
};

export interface UseCreateCompanyPageResult {
  form: UseFormReturn<CreateCompanyFormInput>;
  showPassword: boolean;
  isSubmitting: boolean;
  createdName: string | null;
  successHeadingRef: RefObject<HTMLHeadingElement | null>;
  togglePassword: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  addAnother: () => void;
}

export const useCreateCompanyPage = (): UseCreateCompanyPageResult => {
  // state
  const [showPassword, setShowPassword] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // wiring
  const queryClient = useQueryClient();
  const form = useForm<CreateCompanyFormInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: EMPTY,
    mode: 'onSubmit',
  });
  const { setError, reset, formState, setValue, control } = form;
  // useWatch, not watch(): it re-renders for this field alone and is safe to memoize.
  const name = useWatch({ control, name: 'name' });

  // callbacks
  const handleValidSubmit = async (values: CreateCompanyFormInput) => {
    const payload = toPayload(values);
    try {
      const response = await createCompany(payload);
      if (!isSuccess(response.data)) {
        setError('root', { type: 'server', message: 'Unable to save this company right now.' });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: companiesKeys.all });
      setCreatedName(response.data.data.name);
    } catch (error) {
      safeApiError(error, {
        context: { page: 'create-company', action: 'createCompany' },
        onError: (err) => {
          const fields = Object.entries(err.fields ?? {}).filter(([key]) => isFieldName(key));
          if (fields.length === 0) {
            setError('root', { type: 'server', message: toCreateErrorMessage(err) });
            return;
          }
          fields.forEach(([key, message], index) => {
            if (isFieldName(key))
              setError(key, { type: 'server', message }, { shouldFocus: index === 0 });
          });
        },
      });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(handleValidSubmit)(event);
  };

  const togglePassword = () => setShowPassword((shown) => !shown);

  const addAnother = () => {
    reset(EMPTY);
    setShowPassword(false);
    setCreatedName(null);
  };

  // effects
  // The prefix and the sample GST number are conveniences, not decisions: they keep
  // following the name until someone types their own, and never overwrite what they typed.
  useEffect(() => {
    if (!formState.dirtyFields.numberPrefix) {
      const suggestion = toPrefix(name);
      if (suggestion) setValue('numberPrefix', suggestion);
    }
    if (!formState.dirtyFields.gstNo) {
      const sample = toSampleGstNo(name);
      if (sample) setValue('gstNo', sample);
    }
  }, [name]);

  // The form the submit came from is gone, so focus follows the card that replaced it.
  useEffect(() => {
    if (createdName) successHeadingRef.current?.focus();
  }, [createdName]);

  return {
    form,
    showPassword,
    isSubmitting: formState.isSubmitting,
    createdName,
    successHeadingRef,
    togglePassword,
    handleSubmit,
    addAnother,
  };
};
