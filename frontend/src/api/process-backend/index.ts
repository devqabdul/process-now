/*
 * API layer. One folder per domain, matching a backend module:
 *   <domain>/<domain>.types.ts      wire types (camelCase; money is an exact decimal string)
 *   <domain>/<domain>-service.ts    thin route wrappers, one per endpoint
 *   <domain>/use-<domain>-queries.ts  query key factory + read hooks
 *   <domain>/index.ts               the only import path a page should use
 *
 * Reads go through the query hooks, which unwrap the envelope. Writes and one-off
 * actions call their service directly from the page's controller hook, which owns
 * the loading state, guards with `isSuccess`, and invalidates the affected keys —
 * no useMutation wrappers.
 */
export { isSuccess, normalizeError, safeApiError } from './safe-api-error';
export type { ApiEnvelope, NormalizedError } from './types';
export type { ListParams, Paged } from './common.types';
export { fetchAllPages, listQueries, MAX_PAGE_SIZE, usePagedList } from './list-query';
export { unwrap } from './unwrap';
