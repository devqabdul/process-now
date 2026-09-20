import { useState } from 'react';

import { safeApiError } from '@api/process-backend';
import { logout as endSession } from '@api/process-backend/auth';
import { redirectToLogin } from '@lib/auth';

/*
 * Signing out has to reach the API: it clears the session cookie and bumps the token version.
 * Clearing only the local cache leaves the cookie valid, so the guard finds a live session and
 * sends the user straight back in — which reads as "logout is broken".
 */
export const useLogout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await endSession();
    } catch (error) {
      // A failed call still ends the session on this device; the guard will say if it survived.
      safeApiError(error, {
        context: { page: 'workspace', action: 'logout' },
        onError: () => {},
      });
    }
    redirectToLogin();
  };

  return { logout, isLoggingOut };
};
