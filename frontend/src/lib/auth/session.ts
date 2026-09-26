import { isAxiosError } from 'axios';

import { meQueryOptions } from '@api/process-backend/auth';
import type { AuthUser } from '@api/process-backend/auth';
import { queryClient } from '@app/providers/query-client';

/**
 * The signed-in user, or null. Shared by the route guards and read from the
 * cache afterwards by useMe(), so a guarded navigation and the page it renders
 * never fetch /auth/me twice.
 *
 * `staleTime: 'static'` serves the cached session for the rest of the session
 * rather than refetching on every navigation. A 401 means "not signed in",
 * which is an answer, not a failure — hence null. Anything else (a 502 while the API
 * restarts, no network) rethrows to the route error screen instead of signing the user out.
 */
export const loadSession = async (): Promise<AuthUser | null> => {
  try {
    const { user } = await queryClient.query({
      ...meQueryOptions,
      staleTime: 'static',
    });
    return user;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
};

/**
 * Ends the session on this device, on sign-out and on an expired cookie. A full page load, not a
 * navigate: it drops every cached query and in-flight request with the page, so no screen left
 * mounted can refetch against the dead session and bounce another 401 straight back here.
 */
export const redirectToLogin = () => {
  if (window.location.pathname !== '/login') window.location.replace('/login');
};
