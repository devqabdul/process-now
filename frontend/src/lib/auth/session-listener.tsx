import { useEffect } from 'react';

import { redirectToLogin } from './session';
import { sessionEvents } from './session-events';

/**
 * Mounted once at the router root. When a request comes back 401 — the cookie
 * expired or the session was revoked — the user lands on /login instead of
 * staring at a screen whose data never arrives.
 */
export const SessionListener = () => {
  useEffect(() => sessionEvents.subscribe(redirectToLogin), []);

  return null;
};
