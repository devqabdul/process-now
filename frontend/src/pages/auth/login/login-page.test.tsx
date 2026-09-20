import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import { API, server } from '@test/server';

import { LoginPage } from './login-page';

const renderLogin = () => {
  const router = createMemoryRouter(
    [
      { path: '/login', Component: LoginPage },
      { path: '/', Component: () => <h1>Company dashboard</h1> },
      { path: '/admin/companies', Component: () => <h1>Companies</h1> },
    ],
    { initialEntries: ['/login'] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe('LoginPage', () => {
  it('rejects a malformed identifier before asking for a password', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email or mobile number'), '98000 2222');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Mobile number must be 10 digits.');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('signs a company admin in and lands in the company workspace', async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          status_code: 200,
          message: 'OK',
          data: {
            user: {
              id: 'u1',
              name: 'Asha',
              role: 'company_admin',
              company: { id: 'c1', name: 'FuseNow' },
            },
          },
        });
      }),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email or mobile number'), '+91 98000 22222');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // A company admin lands in the company workspace; the session lives in the cookie.
    expect(await screen.findByRole('heading', { name: 'Company dashboard' })).toBeInTheDocument();
    expect(body).toEqual({ identifier: '9800022222', password: 'secret' });
  });

  it('shows one generic message for wrong credentials', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ status_code: 401, message: 'Invalid credentials' }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email or mobile number'), 'asha@fusenow.in');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Incorrect email / mobile number or password.',
    );
  });
});
