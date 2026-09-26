import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BankAccount } from '@api/process-backend/bank-accounts';
import { API, envelope, server } from '@test/server';

import { BankAccountsListPage } from './bank-accounts-list-page';

const account = (overrides: Partial<BankAccount>): BankAccount => ({
  id: 'a-1',
  companyId: 'c-1',
  name: 'Cash in hand',
  openingBalance: '0.00',
  isActive: true,
  moneyIn: '0.00',
  moneyOut: '0.00',
  balance: '0.00',
  createdAt: '2026-09-01T00:00:00.000Z',
  createdBy: null,
  updatedAt: '2026-09-01T00:00:00.000Z',
  updatedBy: null,
  ...overrides,
});

const ACCOUNTS = [
  account({
    id: 'a-1',
    name: 'HDFC Current',
    moneyIn: '12000.00',
    moneyOut: '1850.50',
    balance: '15149.50',
  }),
  account({ id: 'a-2', name: 'Old SBI', isActive: false, balance: '0.00' }),
];

const created = vi.fn();

const renderPage = () => {
  const router = createMemoryRouter([{ path: '/bank', Component: BankAccountsListPage }], {
    initialEntries: ['/bank'],
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  created.mockReset();
  server.use(
    http.get(`${API}/bank-accounts`, () => envelope(ACCOUNTS)),
    http.get(`${API}/bank-accounts/:id/statement`, () =>
      envelope({
        account: ACCOUNTS[0],
        from: '2026-08-28',
        to: '2026-09-26',
        moneyIn: '0.00',
        moneyOut: '0.00',
        entries: [],
      }),
    ),
    http.post(`${API}/bank-accounts`, async ({ request }) => {
      const body = await request.json();
      created(body);
      return envelope(account({ ...(body as object), id: 'a-3' }), 201);
    }),
  );
});

describe('BankAccountsListPage', () => {
  it('shows each balance, what went in and out, and which accounts are closed', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: 'HDFC Current' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Statement' })).toHaveAttribute('href', '/bank/a-1');
    expect(screen.getByText('₹15,149.50')).toBeInTheDocument();
    expect(screen.getByText('₹1,850.50')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('explains what to add when there are no accounts', async () => {
    server.use(http.get(`${API}/bank-accounts`, () => envelope([])));
    renderPage();

    expect(await screen.findByText('No accounts yet')).toBeInTheDocument();
    expect(screen.getByText(/Cash in hand/)).toBeInTheDocument();
  });

  it('adds an account with its opening balance as a number', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('HDFC Current');

    await user.click(screen.getByRole('button', { name: 'Add account' }));
    await user.type(screen.getByLabelText('Account name'), '  Cash in hand ');
    await user.type(screen.getByLabelText('Opening balance'), '2500.50');
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add account' }),
    );

    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(created).toHaveBeenCalledWith({ name: 'Cash in hand', openingBalance: 2500.5 });
  });

  it('puts a duplicate name on the name field', async () => {
    server.use(
      http.post(`${API}/bank-accounts`, () =>
        HttpResponse.json(
          {
            status_code: 409,
            message: 'Conflict',
            fields: { name: 'An account with this name already exists.' },
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('HDFC Current');

    await user.click(screen.getByRole('button', { name: 'Add account' }));
    await user.type(screen.getByLabelText('Account name'), 'HDFC Current');
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add account' }),
    );

    expect(
      await screen.findByText('An account with this name already exists.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Account name')).toHaveAttribute('aria-invalid', 'true');
  });
});
