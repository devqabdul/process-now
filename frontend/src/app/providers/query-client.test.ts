import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { isTransientError } from './query-client';

const withStatus = (status: number) =>
  new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, null, {
    status,
    statusText: '',
    data: null,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });

describe('isTransientError', () => {
  it('retries a busy API and a request that never landed', () => {
    expect(isTransientError(withStatus(503))).toBe(true);
    // No response at all: the request never reached the API, so nothing ran twice.
    expect(isTransientError(new AxiosError('offline', 'ERR_NETWORK'))).toBe(true);
  });

  it('never retries a broken request — that is noise, not recovery', () => {
    expect(isTransientError(withStatus(500))).toBe(false);
    expect(isTransientError(withStatus(401))).toBe(false);
    expect(isTransientError(withStatus(422))).toBe(false);
    expect(isTransientError(new Error('not axios'))).toBe(false);
  });
});
