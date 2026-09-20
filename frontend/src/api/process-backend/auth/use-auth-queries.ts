import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getMe } from './auth-service';

export const authKeys = { me: ['auth', 'me'] as const };

/**
 * Shared with the route middleware, so a guarded navigation and the page it
 * renders use one key and one fetcher. It takes the client's default retry: a 401 means
 * "not signed in" and is never retried, but a 503 must not sign a live user out — the guard
 * reads a failure as signed-out, so a busy API would otherwise bounce them to /login.
 */
export const meQueryOptions = queryOptions({
  queryKey: authKeys.me,
  queryFn: () => unwrap(getMe()),
});

export const useMe = () => useQuery(meQueryOptions);
