import { HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Handlers are added per test with server.use(...).
export const server = setupServer();

export const API = 'http://api.test';

/** The API's single response shape, so handlers read like the real thing. */
export const envelope = <T>(data: T, status = 200) =>
  HttpResponse.json({ status_code: status, message: 'OK', data }, { status });

/** A list endpoint's `data`: one page plus the count of every matching row. */
export const paged = <T>(items: T[], { page = 1, pageSize = 15, total = items.length } = {}) => ({
  items,
  total,
  page,
  pageSize,
});
