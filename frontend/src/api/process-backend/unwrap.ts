import { isSuccess } from './safe-api-error';
import type { ApiEnvelope } from './types';

/**
 * Query hooks want the payload, not the envelope. A non-2xx response never gets
 * here (axios rejects first); this covers a 2xx with no data, which React Query
 * then surfaces as an error state rather than rendering `undefined`.
 */
export const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<T> => {
  const { data: envelope } = await request;
  if (!isSuccess(envelope)) throw new Error(envelope.message || 'Request failed');
  return envelope.data;
};
