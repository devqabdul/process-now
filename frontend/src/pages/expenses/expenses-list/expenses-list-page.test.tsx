import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BankAccount } from '@api/process-backend/bank-accounts';
import type { Expense } from '@api/process-backend/expenses';
import { API, envelope, server } from '@test/server';
import { todayIso } from '@utils/format/date';

import { ExpensesListPage } from './expenses-list-page';

const AUDIT = {
  companyId: 'c-1',
  createdAt: '2026-09-01T00:00:00.000Z',
  createdBy: null,
  updatedAt: '2026-09-01T00:00:00.000Z',
  updatedBy: null,
};

const ACCOUNTS: BankAccount[] = [
  {
    ...AUDIT,
    id: 'a-1',
    name: 'Cash in hand',
    openingBalance: '0.00',
    isActive: true,
    moneyIn: '0.00',
    moneyOut: '450.00',
    balance: '-450.00',
  },
  {
    ...AUDIT,
    id: 'a-2',
    name: 'Old SBI',
    openingBalance: '0.00',
    isActive: false,
    moneyIn: '0.00',
    moneyOut: '0.00',
    balance: '0.00',
  },
];

const EXPENSES: Expense[] = [
  {
    ...AUDIT,
    id: 'e-1',
    bankAccountId: 'a-1',
    category: 'Electricity',
    amount: '450.00',
    spentOn: '2026-09-20',
    notes: 'September bill',
    bankAccount: { id: 'a-1', name: 'Cash in hand' },
  },
];

const created = vi.fn();

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: '/expenses', Component: ExpensesListPage },
      { path: '/bank', Component: () => <p>Bank page</p> },
    ],
    { initialEntries: ['/expenses'] },
  );
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
    http.get(`${API}/expenses/categories`, () => envelope(['Electricity', 'Salary'])),
    // The total is the server's, over the whole period — deliberately not the rows' sum.
    http.get(`${API}/expenses`, () =>
      envelope({ from: '2026-08-28', to: '2026-09-26', total: '9999.00', expenses: EXPENSES }),
    ),
    http.post(`${API}/expenses`, async ({ request }) => {
      const body = await request.json();
      created(body);
      return envelope({ ...EXPENSES[0], ...(body as object), id: 'e-2' }, 201);
    }),
  );
});

describe('ExpensesListPage', () => {
  it("lists the period's expenses with the total the API sent", async () => {
    renderPage();

    expect(await screen.findByText('Electricity')).toBeInTheDocument();
    expect(screen.getByText('September bill')).toBeInTheDocument();
    expect(screen.getByText('₹9,999')).toBeInTheDocument();
  });

  it('records an expense against an open account only', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Electricity');

    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    const dialog = within(screen.getByRole('dialog'));
    // A closed account takes no new expenses.
    expect(dialog.queryByRole('option', { name: 'Old SBI' })).not.toBeInTheDocument();
    await user.type(dialog.getByLabelText('Category'), ' Salary ');
    await user.type(dialog.getByLabelText('Amount'), '12000');
    await user.click(dialog.getByRole('button', { name: 'Add expense' }));

    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(created).toHaveBeenCalledWith({
      bankAccountId: 'a-1',
      category: 'Salary',
      amount: 12000,
      spentOn: todayIso(),
      notes: '',
    });
  });

  it('sends the user to the Bank page when no account is open', async () => {
    server.use(http.get(`${API}/bank-accounts`, () => envelope([])));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Electricity');

    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(
      within(screen.getByRole('dialog')).getByRole('link', {
        name: 'Add an account on the Bank page',
      }),
    ).toHaveAttribute('href', '/bank');
  });
});
