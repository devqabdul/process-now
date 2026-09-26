import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import type { VendorStatement } from '@api/process-backend/vendors';
import { API, envelope, server } from '@test/server';

import { VendorStatementPage } from './vendor-statement-page';

const STATEMENT: VendorStatement = {
  vendor: {
    id: 'v-1',
    name: 'Ravi Textiles',
    phone: '9800022222',
    address: null,
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  from: '2026-08-28',
  to: '2026-09-26',
  openingDue: '150.00',
  billed: '800.00',
  received: '600.00',
  closingDue: '350.00',
  ordersIn: 1,
  entries: [
    {
      kind: 'payment',
      id: 'p-1',
      date: '2026-09-22',
      at: '2026-09-22T06:00:00.000Z',
      title: 'Payment · upi',
      detail: 'Against bill FN-0001 into HDFC Current',
      status: 'received',
      amount: '600.00',
      balance: '350.00',
      orderId: null,
      billId: 'b-1',
    },
    {
      kind: 'bill',
      id: 'b-2',
      date: '2026-09-21',
      at: '2026-09-21T06:00:00.000Z',
      title: 'Bill FN-0002',
      detail: 'Voided: wrong quantity',
      status: 'voided',
      amount: '300.00',
      balance: '950.00',
      orderId: 'o-2',
      billId: 'b-2',
    },
    {
      kind: 'order',
      id: 'o-1',
      date: '2026-09-20',
      at: '2026-09-20T06:00:00.000Z',
      title: 'Order FN-0001 received',
      detail: 'Collar fusing 120 piece',
      status: 'returned',
      amount: null,
      balance: '150.00',
      orderId: 'o-1',
      billId: null,
    },
  ],
};

// jsdom reports no media match, so the phone layout (load more) renders.
const renderPage = () => {
  const router = createMemoryRouter([{ path: '/vendors/:id', Component: VendorStatementPage }], {
    initialEntries: ['/vendors/v-1'],
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe('VendorStatementPage', () => {
  it('shows what was owed going in, what moved, and what is owed now', async () => {
    server.use(http.get(`${API}/vendors/v-1/statement`, () => envelope(STATEMENT)));
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ravi Textiles' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('₹150').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹350').length).toBeGreaterThan(0);

    // Every kind of transaction lands in the one timeline.
    expect(screen.getByText('Order FN-0001 received')).toBeInTheDocument();
    expect(screen.getByText('Payment · upi')).toBeInTheDocument();
    // A voided bill is listed for the record but marked, not counted.
    expect(screen.getByText('Voided')).toBeInTheDocument();
  });

  it('offers a retry when the report does not load', async () => {
    server.use(http.get(`${API}/vendors/v-1/statement`, () => envelope(null, 500)));
    renderPage();
    expect(
      await screen.findByText("Couldn't load this report", undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
