import axios, { isAxiosError } from 'axios';

import { env } from '@app/config/env';
import { sessionEvents } from '@lib/auth/session-events';

// The session lives in an httpOnly cookie set by the API; the browser sends it on every call.
export const http = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  // Array filters repeat the key (`status=a&status=b`), which is what the API parses.
  paramsSerializer: { indexes: null },
});

// A 401 means the cookie expired or the session was revoked. The interceptor can't
// navigate, so it announces it; SessionListener clears the cache and redirects.
http.interceptors.response.use(undefined, (error: unknown) => {
  if (isAxiosError(error) && error.response?.status === 401) {
    sessionEvents.emit('expired');
  }
  return Promise.reject(error);
});
