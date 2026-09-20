import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as CompaniesDomain from '@api/process-backend/companies';
import { createCompany } from '@api/process-backend/companies';
import { axiosOk } from '@test/axios-response';

import { CreateCompanyPage } from './create-company-page';

vi.mock('@api/process-backend/companies', async (importOriginal) => ({
  ...(await importOriginal<typeof CompaniesDomain>()),
  createCompany: vi.fn(),
}));

const created = vi.mocked(createCompany);

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: '/admin/companies/new', Component: CreateCompanyPage },
      { path: '/admin/companies', Component: () => <h1>Companies</h1> },
    ],
    { initialEntries: ['/admin/companies/new'] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

const fillCompanyAndAdmin = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Company name'), 'WeaveNow');
  await user.type(screen.getByLabelText('Admin name'), 'Ravi Kumar');
  await user.type(screen.getByLabelText('Password'), 'sherwani99');
};

describe('CreateCompanyPage', () => {
  beforeEach(() => created.mockReset());

  it('marks the fields the schema requires, and groups the either-or pair instead', () => {
    renderPage();

    expect(screen.getByLabelText('Company name')).toBeRequired();
    expect(screen.getByLabelText('Admin name')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
    expect(screen.getByLabelText('GST number')).not.toBeRequired();
    expect(screen.getByLabelText('Number prefix')).not.toBeRequired();

    // Either one satisfies the rule, so the group carries it instead of the fields.
    const pair = screen.getByRole('group', {
      name: 'Add a mobile number or an email — the admin signs in with one of them.',
    });
    expect(pair).toContainElement(screen.getByLabelText('Mobile number'));
    expect(pair).toContainElement(screen.getByLabelText('Email address'));
    expect(screen.getByLabelText('Mobile number')).not.toBeRequired();
    expect(screen.getByLabelText('Email address')).not.toBeRequired();
  });

  it('refuses an admin with neither a mobile number nor an email', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillCompanyAndAdmin(user);
    await user.click(screen.getByRole('button', { name: 'Create company' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Add a mobile number or an email — the admin signs in with one of them.',
    );
    expect(created).not.toHaveBeenCalled();
  });

  it('suggests a prefix from the company name, and stops once one is typed', async () => {
    const user = userEvent.setup();
    renderPage();
    const prefix = screen.getByLabelText('Number prefix');

    await user.type(screen.getByLabelText('Company name'), 'WeaveNow');
    expect(prefix).toHaveValue('WN');

    // A typed prefix is a decision: later edits to the name must leave it alone.
    await user.clear(prefix);
    await user.type(prefix, 'WVN');
    await user.type(screen.getByLabelText('Company name'), ' Textiles');
    expect(prefix).toHaveValue('WVN');
  });

  it('sends the normalised payload', async () => {
    created.mockResolvedValue(
      axiosOk(
        {
          id: 'cmp_9',
          name: 'WeaveNow',
          numberPrefix: 'WN',
          gstNo: '27AABCF1234M1Z9',
          createdAt: '2026-09-20T00:00:00.000Z',
          isActive: true,
          admin: { id: 'usr_9', name: 'Ravi Kumar', phone: '9800033333', email: null },
        },
        201,
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await fillCompanyAndAdmin(user);
    // Both optional codes arrive prefilled from the name, so typing over one means clearing first.
    await user.clear(screen.getByLabelText('GST number'));
    await user.type(screen.getByLabelText('GST number'), '27aabcf1234m1z9');
    // Lower case in, upper case out: the prefix prints as WN-0001. Clearing first also
    // proves a typed prefix survives — the suggestion must not type over it.
    await user.clear(screen.getByLabelText('Number prefix'));
    await user.type(screen.getByLabelText('Number prefix'), 'wn');
    await user.type(screen.getByLabelText('Mobile number'), '+91 98000 33333');
    await user.type(screen.getByLabelText('Email address'), 'RAVI@weavenow.in');
    await user.click(screen.getByRole('button', { name: 'Create company' }));

    const heading = await screen.findByText('WeaveNow is on ProcessNow');
    expect(heading).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('WeaveNow is on ProcessNow');
    expect(created).toHaveBeenCalledWith({
      name: 'WeaveNow',
      gstNo: '27AABCF1234M1Z9',
      numberPrefix: 'WN',
      admin: {
        name: 'Ravi Kumar',
        phone: '9800033333',
        email: 'ravi@weavenow.in',
        password: 'sherwani99',
      },
    });
  });
});
