import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { createMemoryRouter, useSearchParams } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import type { Vendor } from '@api/process-backend/vendors';
import { API, envelope, paged, server } from '@test/server';

import { WorkspaceCompanyChip } from './workspace-company-chip';

const vendor = (id: string, name: string, phone: string): Vendor => ({
  id,
  name,
  phone,
  address: null,
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
});

const VENDORS = [
  vendor('v-1', 'Ravi Textiles', '9800022222'),
  vendor('v-2', 'Meher Silk Mills', '9800033333'),
];

const OrdersProbe = () => {
  const [params] = useSearchParams();
  return <p>Orders for {params.get('vendorId')}</p>;
};

const renderChip = () => {
  const router = createMemoryRouter(
    [
      { path: '/', element: <WorkspaceCompanyChip name="FuseNow" switchable /> },
      { path: '/orders', Component: OrdersProbe },
    ],
    { initialEntries: ['/'] },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe('WorkspaceCompanyChip vendor quick-jump', () => {
  it('searches vendors as you type and Enter opens that vendor’s orders', async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/vendors`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        seen.push(params);
        const q = params.get('q')?.toLowerCase() ?? '';
        return envelope(paged(VENDORS.filter((v) => v.name.toLowerCase().includes(q))));
      }),
    );
    const user = userEvent.setup();
    renderChip();

    await user.click(screen.getByRole('button', { name: /jump to a vendor/i }));
    expect(await screen.findByRole('option', { name: /Ravi Textiles/ })).toBeInTheDocument();
    // Page size and name order are the API's defaults, so neither is sent.
    expect(seen[0]?.get('pageSize')).toBeNull();
    expect(seen[0]?.get('sort')).toBeNull();

    await user.type(screen.getByRole('combobox', { name: 'Search vendors' }), 'meher');

    await waitFor(() => expect(seen.at(-1)?.get('q')).toBe('meher'));
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: /Ravi Textiles/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('option', { name: /Meher Silk Mills/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Enter}');

    expect(await screen.findByText('Orders for v-2')).toBeInTheDocument();
  });

  it('moves with the arrow keys and closes on Escape', async () => {
    server.use(http.get(`${API}/vendors`, () => envelope(paged(VENDORS))));
    const user = userEvent.setup();
    renderChip();

    const trigger = screen.getByRole('button', { name: /jump to a vendor/i });
    await user.click(trigger);
    await screen.findByRole('option', { name: /Ravi Textiles/ });

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /Meher Silk Mills/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Jump to a vendor' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
