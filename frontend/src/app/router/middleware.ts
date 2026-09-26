import { redirect, type MiddlewareFunction } from 'react-router';

import type { UserRole } from '@api/process-backend/auth';
import { ROLE_HOME } from '@constants/roles';
import { loadSession } from '@lib/auth';

/**
 * Guards run on the non-lazy layout routes, parent → child, before the loaders
 * and before render — so a signed-out visitor never sees a flash of the app.
 */
const homeFor = (role: UserRole) => ROLE_HOME[role] ?? ROLE_HOME.company_admin;

/** Signed in, any role. */
export const requireAuth: MiddlewareFunction = async () => {
  if (!(await loadSession())) throw redirect('/login');
};

/** Signed in with this exact role; the wrong role goes to its own home, not to an error. */
export const requireRole =
  (role: UserRole): MiddlewareFunction =>
  async () => {
    const user = await loadSession();
    if (!user) throw redirect('/login');
    if (user.role !== role) throw redirect(homeFor(user.role));
  };

/** For /login: someone already signed in has no business on the sign-in screen. */
export const guestOnly: MiddlewareFunction = async () => {
  const user = await loadSession();
  if (user) throw redirect(homeFor(user.role));
};
