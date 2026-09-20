import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

/**
 * Busy, not broken. A 503 means the API couldn't take the request this second (the connection
 * pool was saturated), and a missing response means it never arrived — repeating a GET is safe
 * and usually succeeds. A 4xx or a 500 is a broken request: retrying it only doubles the noise.
 */
export const isTransientError = (error: unknown) =>
  isAxiosError(error) && (!error.response || error.response.status === 503);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Reads only. Writes are direct service calls, never useMutation, so nothing here can
      // replay a POST — a retried order or payment would be a second order or a second payment.
      retry: (failureCount, error) => failureCount < 3 && isTransientError(error),
      retryDelay: (attempt) => (attempt === 0 ? 400 : 1200),
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});
