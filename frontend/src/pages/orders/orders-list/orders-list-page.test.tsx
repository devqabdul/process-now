import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Order } from '@api/process-backend/orders';
import type { ServiceType } from '@api/process-backend/service-types';
import type { Vendor } from '@api/process-backend/vendors';
import { API, envelope, paged, server } from '@test/server';

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

const VENDORS: Vendor[] = [
  {
    id: 'v-1',
    name: 'Ravi Textiles',
    phone: '9800022222',
    address: null,
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'v-9',
    name: 'Retired Mills',
    phone: '9800099999',
    address: null,
    isActive: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

const SERVICE: ServiceType = {
  id: 'svc-1',
  name: 'Collar fusing',
  isActive: true,
  unit: 'piece',
  basePrice: '10.00',
  baseCost: '4.00',
  billOn: 'in',
  options: [
    {
      group: 'Finish',
      multi: false,
      choices: [
        { name: 'Soft', price: 0, cost: 0 },
        { name: 'Stiff', price: 2.5, cost: 1 },
      ],
    },
  ],
  createdAt: '2026-09-01T00:00:00.000Z',
};

// jsdom reports no media match, so the card layout renders rather than the table.
const renderPage = (url = '/orders') => {
  const router = createMemoryRouter([{ path: '/orders', Component: OrdersListPage }], {
    initialEntries: [url],
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

// The vendor filter's options.
beforeEach(() => {
  server.use(http.get(`${API}/vendors`, () => envelope(paged([]))));
});

describe('OrdersListPage', () => {
  it('filters by the vendor in the URL, where the header quick-jump lands', async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/orders`, ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return envelope(paged([ORDERS[0]]));
      }),
    );
    renderPage('/orders?vendorId=v-1');

    await screen.findByText('Ravi Textiles', undefined, { timeout: 3000 });
    expect(seen[0]?.get('vendorId')).toBe('v-1');
    // Newest first is the API's default order, so it isn't sent.
    expect(seen[0]?.get('sort')).toBeNull();
  });

  it('offers only the transitions an order is actually ready for', async () => {
    server.use(http.get(`${API}/orders`, () => envelope(paged(ORDERS))));
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
      http.get(`${API}/orders`, () => envelope(paged(ORDERS))),
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
      http.get(`${API}/orders`, () => envelope(paged(ORDERS))),
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

  describe('new order drawer', () => {
    beforeEach(() => {
      server.use(
        http.get(`${API}/orders`, () => envelope(paged([]))),
        http.get(`${API}/vendors`, () => envelope(paged(VENDORS))),
        http.get(`${API}/service-types`, () => envelope(paged([SERVICE]))),
      );
    });

    it('opens from the Orders page and sends options and a numeric quantity, never a price', async () => {
      const sent = vi.fn();
      server.use(
        http.post(`${API}/orders`, async ({ request }) => {
          sent(await request.json());
          return envelope({ ...ORDERS[0], orderNo: 'FN-0007' });
        }),
      );
      const user = userEvent.setup();
      // The phone's "+ New" button and the dashboard link land here.
      renderPage('/orders?new=1');

      const vendor = await screen.findByLabelText('Who sent it', undefined, { timeout: 3000 });
      await waitFor(() =>
        expect(screen.getByRole('option', { name: 'Ravi Textiles' })).toBeInTheDocument(),
      );
      // A retired vendor takes no new orders.
      expect(screen.queryByRole('option', { name: 'Retired Mills' })).not.toBeInTheDocument();
      await user.selectOptions(vendor, 'v-1');
      await user.selectOptions(screen.getByLabelText('Service'), 'svc-1');
      await user.click(screen.getByLabelText(/Stiff/));
      await user.type(screen.getByLabelText('Quantity (piece)'), '120');

      // (10 + 2.50) × 120, display only.
      expect(screen.getAllByText(/1,500/).length).toBeGreaterThan(0);

      await user.click(screen.getByRole('button', { name: 'Take in order' }));

      await waitFor(() =>
        expect(sent).toHaveBeenCalledWith({
          vendorId: 'v-1',
          items: [
            {
              serviceTypeId: 'svc-1',
              selectedOptions: [{ group: 'Finish', choice: 'Stiff' }],
              qtyIn: 120,
            },
          ],
        }),
      );
      expect(
        await screen.findByText('Order FN-0007 taken in from Ravi Textiles.'),
      ).toBeInTheDocument();
    });

    it('will not take in an order without a vendor and a quantity', async () => {
      const sent = vi.fn();
      server.use(
        http.post(`${API}/orders`, () => {
          sent();
          return envelope({});
        }),
      );
      const user = userEvent.setup();
      renderPage('/orders?new=1');
      await screen.findByRole('option', { name: 'Ravi Textiles' }, { timeout: 3000 });

      await user.click(screen.getByRole('button', { name: 'Take in order' }));

      expect(await screen.findByText('Choose the vendor who sent the lot.')).toBeVisible();
      expect(screen.getByText('Enter the quantity received, like 120 or 12.5.')).toBeVisible();
      expect(sent).not.toHaveBeenCalled();
    });
  });
});
