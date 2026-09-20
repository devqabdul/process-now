export interface ApiEnvelope<T> {
  status_code: number;
  message: string;
  data?: T;
}

export type ApiErrorType = 'network' | 'http' | 'unknown';

export interface NormalizedError {
  error_type: ApiErrorType;
  status_code: number | null;
  message: string;
  fields?: Record<string, string>;
}
