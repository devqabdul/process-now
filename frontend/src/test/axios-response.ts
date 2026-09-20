import type { AxiosResponse } from 'axios';

import type { ApiEnvelope } from '@api/process-backend';

/** The bits of an AxiosResponse a page test needs when it mocks a service call. */
export const axiosOk = <T>(data: T, status = 200): AxiosResponse<ApiEnvelope<T>> => ({
  data: { status_code: status, message: 'OK', data },
  status,
  statusText: 'OK',
  headers: {},
  config: { headers: {} as never },
});
