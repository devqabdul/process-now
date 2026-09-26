import { AuthLayout } from '@components/layouts/auth-layout';
import { IdentifyStep } from '@components/sections/auth/identify-step';
import { PasswordStep } from '@components/sections/auth/password-step';

import { useLoginPage } from './use-login-page';

export const LoginPage = () => {
  const {
    form,
    step,
    identifierKind,
    isIdentifierValid,
    identityShown,
    shakeField,
    showPassword,
    isSubmitting,
    selectKind,
    handleContinue,
    handleSignIn,
    togglePassword,
    backToIdentify,
  } = useLoginPage();
  const { register, clearErrors, formState } = form;

  return (
    <AuthLayout>
      <title>Sign in · ProcessNow</title>
      {step === 'identify' && (
        <IdentifyStep
          field={register('identifier', { onChange: () => clearErrors('identifier') })}
          error={formState.errors.identifier}
          kind={identifierKind}
          onKindChange={selectKind}
          isValid={isIdentifierValid}
          shake={shakeField === 'identifier'}
          onSubmit={handleContinue}
        />
      )}
      {step === 'password' && (
        <PasswordStep
          field={register('password', { onChange: () => clearErrors('password') })}
          error={formState.errors.password}
          identityShown={identityShown}
          isMobile={identifierKind === 'mobile'}
          showPassword={showPassword}
          shake={shakeField === 'password'}
          isSubmitting={isSubmitting}
          onTogglePassword={togglePassword}
          onBack={backToIdentify}
          onSubmit={handleSignIn}
        />
      )}
    </AuthLayout>
  );
};
