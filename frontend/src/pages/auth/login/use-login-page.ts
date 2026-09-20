import { zodResolver } from '@hookform/resolvers/zod';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';
import * as z from 'zod/mini';

import { isSuccess, type NormalizedError, safeApiError } from '@api/process-backend';
import { login } from '@api/process-backend/auth';
import { ROLE_META } from '@constants/roles';
import {
  detectIdentifierKind,
  displayIdentifier,
  type IdentifierKind,
  isValidEmail,
  isValidIdentifier,
  isValidMobile,
  normalizeIdentifier,
} from '@utils/identifier';

const identifierError = (raw: string) => {
  const kind = detectIdentifierKind(raw);
  if (!kind) return 'Enter your email address or mobile number.';
  if (kind === 'mobile' && !isValidMobile(raw)) return 'Mobile number must be 10 digits.';
  if (kind === 'email' && !isValidEmail(raw))
    return 'That does not look like a valid email address.';
  return null;
};

const loginSchema = z.object({
  identifier: z.string().check((ctx) => {
    const message = identifierError(ctx.value);
    if (message) ctx.issues.push({ code: 'custom', message, input: ctx.value });
  }),
  password: z.string().check(z.minLength(1, { error: 'Enter your password to continue.' })),
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
  identifierKind: IdentifierKind | null;
  isIdentifierValid: boolean;
  identityShown: string;
  shakeField: ShakeField | null;
  showPassword: boolean;
  isSubmitting: boolean;
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
  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });
  const { control, trigger, setError, clearErrors, resetField, setFocus, formState } = form;

  // derived
  const identifier = useWatch({ control, name: 'identifier' });
  const identifierKind = detectIdentifierKind(identifier);
  const isIdentifierValid = isValidIdentifier(identifier);
  const identityShown = displayIdentifier(identifier);

  // callbacks
  const shake = (field: ShakeField) => {
    setShakeField(field);
    window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShakeField(null), SHAKE_MS);
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
        identifier: normalizeIdentifier(values.identifier),
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
      // The session now lives in the cookie; the workspace reads the user from /auth/me.
      // A role we don't know yet still lands somewhere: the sign-in already succeeded.
      const role = response.data.data.user.role;
      navigate((ROLE_META[role] ?? ROLE_META.company_admin).home, { replace: true });
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
    handleContinue,
    handleSignIn,
    togglePassword,
    backToIdentify,
  };
};
