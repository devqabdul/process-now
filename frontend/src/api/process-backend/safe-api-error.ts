import { isAxiosError } from 'axios';

import type { ApiEnvelope, NormalizedError } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((v) => typeof v === 'string');

// An empty list or object is a successful response, not a failure: every list is
// empty for a newly created company.
export const isSuccess = <T>(env: ApiEnvelope<T>): env is ApiEnvelope<T> & { data: T } =>
  env.status_code >= 200 && env.status_code < 300 && env.data !== undefined && env.data !== null;

export const normalizeError = (error: unknown): NormalizedError => {
  if (!isAxiosError(error)) {
    return { error_type: 'unknown', status_code: null, message: 'Unexpected error.' };
  }
  if (!error.response) {
    return {
      error_type: 'network',
      status_code: null,
      message: 'Check your connection and try again.',
    };
  }
  const body: unknown = error.response.data;
  const message = isRecord(body) && typeof body.message === 'string' ? body.message : error.message;
  const fields = isRecord(body) && isStringRecord(body.fields) ? body.fields : undefined;
  return {
    error_type: 'http',
    status_code: error.response.status,
    message,
    ...(fields ? { fields } : {}),
  };
};

interface SafeApiErrorOptions {
  context: { page: string; action: string };
  onError: (error: NormalizedError) => void;
}

// Single catch-site handler: normalise, log in dev, hand the page a typed error.
export const safeApiError = (error: unknown, { context, onError }: SafeApiErrorOptions) => {
  const normalized = normalizeError(error);
  if (import.meta.env.DEV) console.warn(`[api] ${context.page}/${context.action}`, normalized);
  onError(normalized);
};
