import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';
import * as z from 'zod/mini';

import { isSuccess, type NormalizedError, safeApiError } from '@api/process-backend';
import { login, meQueryOptions } from '@api/process-backend/auth';
import { ROLE_HOME } from '@constants/roles';
import {
  displayIdentifier,
  type IdentifierKind,
  isValidEmail,
  isValidIdentifier,
  isValidMobile,
  normalizeIdentifier,
} from '@utils/identifier';

const identifierError = (raw: string, kind: IdentifierKind) => {
  if (kind === 'mobile') {
    if (!raw.trim()) return 'Enter your mobile number.';
    return isValidMobile(raw) ? null : 'Mobile number must be 10 digits.';
  }
  if (!raw.trim()) return 'Enter your email address.';
  return isValidEmail(raw) ? null : 'That does not look like a valid email address.';
};

const loginSchema = z
  .object({
    // Which tab the user picked; never sent to the API.
    kind: z.enum(['mobile', 'email']),
    identifier: z.string(),
    password: z.string().check(z.minLength(1, { error: 'Enter your password to continue.' })),
  })
  .check((ctx) => {
    const { identifier, kind } = ctx.value;
    const message = identifierError(identifier, kind);
    if (message)
      ctx.issues.push({ code: 'custom', path: ['identifier'], message, input: identifier });
  });

export type LoginFormInput = z.infer<typeof loginSchema>;

export type LoginStep = 'identify' | 'password';
type ShakeField = keyof LoginFormInput;

const SHAKE_MS = 420;

// Wrong credentials get one message for both fields, so the API never reveals which accounts exist.
const toLoginErrorMessage = (err: NormalizedError) => {
  if (err.error_type === 'network')
    return 'Unable to sign in. Check your connection and try again.';
  if (err.status_code === 401) return 'Incorrect email / mobile number or password.';
  if (err.status_code === 429) return 'Too many attempts. Wait a minute and try again.';
  return 'Unable to sign in right now. Try again in a moment.';
};

export interface UseLoginPageResult {
  form: UseFormReturn<LoginFormInput>;
  step: LoginStep;
  identifierKind: IdentifierKind;
  isIdentifierValid: boolean;
  identityShown: string;
  shakeField: ShakeField | null;
  showPassword: boolean;
  isSubmitting: boolean;
  selectKind: (kind: IdentifierKind) => void;
  handleContinue: (event: FormEvent<HTMLFormElement>) => void;
  handleSignIn: (event: FormEvent<HTMLFormElement>) => void;
  togglePassword: () => void;
  backToIdentify: () => void;
}

export const useLoginPage = (): UseLoginPageResult => {
  // state
  const [step, setStep] = useState<LoginStep>('identify');
  const [shakeField, setShakeField] = useState<ShakeField | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const shakeTimer = useRef<number | undefined>(undefined);

  // wiring
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    // Mobile first: most admins sign in with their phone.
    defaultValues: { kind: 'mobile', identifier: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });
  const { control, trigger, setError, setValue, clearErrors, resetField, setFocus, formState } =
    form;

  // derived
  const identifier = useWatch({ control, name: 'identifier' });
  const identifierKind = useWatch({ control, name: 'kind' });
  const isIdentifierValid = isValidIdentifier(identifier, identifierKind);
  const identityShown = displayIdentifier(identifier, identifierKind);

  // callbacks
  const shake = (field: ShakeField) => {
    setShakeField(field);
    window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShakeField(null), SHAKE_MS);
  };

  const selectKind = (kind: IdentifierKind) => {
    if (kind === identifierKind) return;
    setValue('kind', kind);
    setValue('identifier', '');
    clearErrors('identifier');
    setFocus('identifier');
  };

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void trigger('identifier').then((valid) => {
      if (!valid) {
        shake('identifier');
        setFocus('identifier');
        return;
      }
      clearErrors('password');
      setStep('password');
    });
  };

  const handleValidSubmit = async (values: LoginFormInput) => {
    try {
      const response = await login({
        identifier: normalizeIdentifier(values.identifier, values.kind),
        password: values.password,
      });
      if (!isSuccess(response.data)) {
        setError('password', {
          type: 'server',
          message: 'Unable to sign in right now. Try again in a moment.',
        });
        shake('password');
        return;
      }
      // Login returns the same user /auth/me would, so seed it: the route guard then skips a round trip.
      const { user } = response.data.data;
      queryClient.setQueryData(meQueryOptions.queryKey, { user });
      // A role we don't know yet still lands somewhere: the sign-in already succeeded.
      const role = user.role;
      navigate(ROLE_HOME[role] ?? ROLE_HOME.company_admin, { replace: true });
    } catch (error) {
      safeApiError(error, {
        context: { page: 'login', action: 'login' },
        onError: (err) => {
          setError(
            'password',
            { type: 'server', message: toLoginErrorMessage(err) },
            { shouldFocus: true },
          );
          shake('password');
        },
      });
    }
  };

  const handleSignIn = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(handleValidSubmit, () => {
      shake('password');
      setFocus('password');
    })(event);
  };

  const togglePassword = () => setShowPassword((shown) => !shown);

  const backToIdentify = () => {
    resetField('password');
    clearErrors();
    setShowPassword(false);
    setStep('identify');
  };

  // effects
  useEffect(() => () => window.clearTimeout(shakeTimer.current), []);

  return {
    form,
    step,
    identifierKind,
    isIdentifierValid,
    identityShown,
    shakeField,
    showPassword,
    isSubmitting: formState.isSubmitting,
    selectKind,
    handleContinue,
    handleSignIn,
    togglePassword,
    backToIdentify,
  };
};
