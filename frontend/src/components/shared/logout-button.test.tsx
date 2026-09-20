import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { LogoutButton } from './logout-button';
import { redirectToLogin } from '@lib/auth';
import type * as AuthModule from '@lib/auth';
import { API, server } from '@test/server';

vi.mock('@lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModule>()),
  redirectToLogin: vi.fn(),
}));

const clickLogout = async () => {
  const user = userEvent.setup();
  render(<LogoutButton />);
  await user.click(screen.getByRole('button', { name: 'Log out' }));
};

describe('LogoutButton', () => {
  it('ends the session on the API, then leaves for /login', async () => {
    let called = false;
    server.use(
      http.post(`${API}/auth/logout`, () => {
        called = true;
        return HttpResponse.json({ status_code: 200, message: 'OK', data: { loggedOut: true } });
      }),
    );

    await clickLogout();

    // Without this call the cookie survives and the guard sends the user straight back in.
    expect(called).toBe(true);
    expect(redirectToLogin).toHaveBeenCalled();
  });

  it('still leaves when the API call fails', async () => {
    server.use(
      http.post(`${API}/auth/logout`, () =>
        HttpResponse.json({ status_code: 500 }, { status: 500 }),
      ),
    );

    await clickLogout();

    expect(redirectToLogin).toHaveBeenCalled();
  });
});
