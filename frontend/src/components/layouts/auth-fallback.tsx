import { AuthLayout } from '@components/layouts/auth-layout';
import { LoadingMark } from '@components/shared/loading-mark';

// The brand panel is already painted; only the form is waiting on its chunk.
export const AuthFallback = () => (
  <AuthLayout>
    <LoadingMark message="Loading sign in…" />
  </AuthLayout>
);
