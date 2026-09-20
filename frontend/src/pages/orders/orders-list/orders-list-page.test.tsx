import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it, vi } from 'vitest';

import type { Order } from '@api/process-backend/orders';
import { API, envelope, server } from '@test/server';

import { OrdersListPage } from './orders-list-page';

const item = (id: string, name: string, qtyIn: string) => ({
  id,
  serviceTypeId: 'svc-1',
  billOn: 'in' as const,
  selectedOptions: [],
  qtyIn,
  qtyOut: null,
  unitPrice: '45.00',
  unitCost: '12.00',
  amount: null,
  serviceType: { id: 'svc-1', name, unit: 'piece' },
});

const ORDERS: Order[] = [
  {
    id: 'o-1',
    orderNo: 'FN-0001',
    status: 'received',
    receivedAt: '2026-09-20T06:00:00.000Z',
    returnedAt: null,
    notes: null,
    vendor: { id: 'v-1', name: 'Ravi Textiles', phone: '9800022222' },
    items: [item('oi-1', 'Sherwani fusing', '15')],
    bill: null,
  },
  {
    id: 'o-2',
    orderNo: 'FN-0002',
    status: 'processing',
    receivedAt: '2026-09-20T07:00:00.000Z',
    returnedAt: null,
    notes: null,
    vendor: { id: 'v-2', name: 'Meher Silk Mills', phone: '9800033333' },
    items: [item('oi-2', 'Collar fusing', '120')],
    bill: null,
  },
];

// jsdom reports no media match, so the card layout renders rather than the table.
const renderPage = () => {
  const router = createMemoryRouter([{ path: '/orders', Component: OrdersListPage }], {
    initialEntries: ['/orders'],
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe('OrdersListPage', () => {
  it('offers only the transitions an order is actually ready for', async () => {
    server.use(http.get(`${API}/orders`, () => envelope(ORDERS)));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ravi Textiles', undefined, { timeout: 3000 });

    // Received: can be started.
    await user.click(screen.getByRole('button', { name: 'Actions for FN-0001' }));
    expect(screen.getByRole('menuitem', { name: 'Start processing' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    // Already processing: starting again is not on offer.
    await user.click(screen.getByRole('button', { name: 'Actions for FN-0002' }));
    expect(screen.queryByRole('menuitem', { name: 'Start processing' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Return to vendor' })).toBeInTheDocument();
  });

  it('refuses to return more than came in', async () => {
    const sent = vi.fn();
    server.use(
      http.get(`${API}/orders`, () => envelope(ORDERS)),
      http.post(`${API}/orders/:id/return`, () => {
        sent();
        return envelope(ORDERS[1]);
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Meher Silk Mills', undefined, { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: 'Actions for FN-0002' }));
    await user.click(screen.getByRole('menuitem', { name: 'Return to vendor' }));

    // It opens at the quantity received, which is the usual answer.
    const qty = screen.getByLabelText('Collar fusing');
    expect(qty).toHaveValue('120');

    await user.clear(qty);
    await user.type(qty, '999');
    await user.click(screen.getByRole('button', { name: 'Return and raise bill' }));

    // Billing more than the vendor handed over must never reach the API.
    expect(await screen.findByText('Only 120 pcs came in.')).toBeInTheDocument();
    expect(sent).not.toHaveBeenCalled();
  });

  it('will not cancel an order without a reason', async () => {
    const sent = vi.fn();
    server.use(
      http.get(`${API}/orders`, () => envelope(ORDERS)),
      http.post(`${API}/orders/:id/cancel`, async ({ request }) => {
        sent(await request.json());
        return envelope({ ...ORDERS[0], status: 'cancelled' });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ravi Textiles', undefined, { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: 'Actions for FN-0001' }));
    await user.click(screen.getByRole('menuitem', { name: 'Cancel order' }));
    await user.click(screen.getByRole('button', { name: 'Cancel this order' }));

    expect(await screen.findByText('Give a short reason — it goes on the record.')).toBeVisible();
    expect(sent).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Why is it being cancelled?'), 'Vendor withdrew the lot');
    await user.click(screen.getByRole('button', { name: 'Cancel this order' }));

    await waitFor(() => expect(sent).toHaveBeenCalledWith({ reason: 'Vendor withdrew the lot' }));
  });
});
