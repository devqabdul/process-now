import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { AuthUser } from '@api/process-backend/auth';
import { queryClient } from '@app/providers/query-client';
import { API, envelope, server } from '@test/server';

import { routes } from './routes';

const COMPANY_ADMIN: AuthUser = {
  id: 'usr_1',
  name: 'Asha Rao',
  role: 'company_admin',
  roleMeta: { label: 'Company Admin', accent: 'warning' },
  phone: '9800011111',
  email: null,
  company: { id: 'cmp_1', name: 'FuseNow' },
};

const SUPER_ADMIN: AuthUser = {
  id: 'usr_2',
  name: 'Priya Kulkarni',
  role: 'super_admin',
  roleMeta: { label: 'Super Admin', accent: 'brand' },
  phone: null,
  email: 'priya@processnow.io',
  company: null,
};

/** No user = the API answers /auth/me with 401, exactly as it does when signed out. */
const signedInAs = (user: AuthUser | null) => {
  server.use(
    http.get(`${API}/auth/me`, () => (user ? envelope({ user }) : envelope(null, 401))),
    http.get(`${API}/dashboard`, () => envelope(null, 500)),
    http.get(`${API}/admin/companies`, () => envelope([])),
  );
};

const goTo = async (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  // The guard resolves before anything renders; wait for the router to settle.
  await screen.findByRole('heading', {}, { timeout: 3000 }).catch(() => null);
  return router;
};

afterEach(() => queryClient.clear());

describe('route guards', () => {
  it('sends a signed-out visitor to the sign-in screen', async () => {
    signedInAs(null);
    const router = await goTo('/');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('keeps a company admin out of the platform console', async () => {
    signedInAs(COMPANY_ADMIN);
    const router = await goTo('/admin/companies');
    expect(router.state.location.pathname).toBe('/');
  });

  it('keeps a super admin out of the company workspace', async () => {
    signedInAs(SUPER_ADMIN);
    const router = await goTo('/');
    expect(router.state.location.pathname).toBe('/admin/companies');
  });

  it('lets each role into its own workspace', async () => {
    signedInAs(SUPER_ADMIN);
    const admin = await goTo('/admin/companies');
    expect(admin.state.location.pathname).toBe('/admin/companies');

    queryClient.clear();
    signedInAs(COMPANY_ADMIN);
    const company = await goTo('/');
    expect(company.state.location.pathname).toBe('/');
  });

  it("doesn't sign anyone out when the API is down rather than saying no", async () => {
    server.use(http.get(`${API}/auth/me`, () => envelope(null, 502)));
    const router = await goTo('/');
    expect(router.state.location.pathname).toBe('/');
  });

  it('sends an already signed-in user away from the sign-in screen', async () => {
    signedInAs(COMPANY_ADMIN);
    const router = await goTo('/login');
    expect(router.state.location.pathname).toBe('/');
  });
});
