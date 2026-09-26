import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Vendor } from '@api/process-backend/vendors';
import { API, envelope, paged, server } from '@test/server';

import { VendorsListPage } from './vendors-list-page';

const VENDORS: Vendor[] = [
  {
    id: 'v-1',
    name: 'Ravi Textiles',
    phone: '9800022222',
    address: 'Shop 4, Ring Road',
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'v-2',
    name: 'Meher Silk Mills',
    phone: '9800033333',
    address: null,
    isActive: true,
    createdAt: '2026-09-02T00:00:00.000Z',
  },
];

const created = vi.fn();

const renderPage = () => {
  const router = createMemoryRouter([{ path: '/vendors', Component: VendorsListPage }], {
    initialEntries: ['/vendors'],
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
    // The API filters by `q`; the page only passes it through.
    http.get(`${API}/vendors`, ({ request }) => {
      const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
      return envelope(
        paged(
          q
            ? VENDORS.filter((v) => v.name.toLowerCase().includes(q) || v.phone.includes(q))
            : VENDORS,
        ),
      );
    }),
    http.post(`${API}/vendors`, async ({ request }) => {
      const body = await request.json();
      created(body);
      return envelope({ ...VENDORS[0], ...(body as object), id: 'v-3' }, 201);
    }),
  );
});

describe('VendorsListPage', () => {
  it('lists the vendors with their numbers', async () => {
    renderPage();

    expect(await screen.findByText('Ravi Textiles')).toBeInTheDocument();
    expect(screen.getByText('Meher Silk Mills')).toBeInTheDocument();
    expect(screen.getByText('+91 9800022222')).toBeInTheDocument();
  });

  it('searches through the API, not in the page', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ravi Textiles');

    // Search sits behind its icon button until opened.
    await user.click(
      screen.getByRole('button', { name: 'Search vendors by name or mobile number' }),
    );
    await user.type(
      await screen.findByRole('searchbox', { name: 'Search vendors by name or mobile number' }),
      'meher',
    );

    expect(await screen.findByText('Meher Silk Mills')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Ravi Textiles')).not.toBeInTheDocument());
  });

  it('adds a vendor with a normalised phone number', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ravi Textiles');

    await user.click(screen.getByRole('button', { name: 'New vendor' }));
    await user.type(screen.getByLabelText('Vendor name'), 'Shalimar Fabrics');
    await user.type(screen.getByLabelText('Mobile number'), '+91 98000 44444');
    await user.click(screen.getByRole('button', { name: 'Add vendor' }));

    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(created).toHaveBeenCalledWith({
      name: 'Shalimar Fabrics',
      phone: '9800044444',
      address: '',
    });
  });

  it('keeps an invalid number out of the API', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ravi Textiles');

    await user.click(screen.getByRole('button', { name: 'New vendor' }));
    await user.type(screen.getByLabelText('Vendor name'), 'Too Short');
    await user.type(screen.getByLabelText('Mobile number'), '9800');
    await user.click(screen.getByRole('button', { name: 'Add vendor' }));

    expect(await screen.findByText('Mobile number must be 10 digits.')).toBeInTheDocument();
    expect(created).not.toHaveBeenCalled();
  });

  it('retires a vendor from the row menu and says what survives', async () => {
    const sent = vi.fn();
    server.use(
      http.patch(`${API}/vendors/:id`, async ({ request }) => {
        sent(await request.json());
        return envelope({ ...VENDORS[0], isActive: false });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Ravi Textiles', undefined, { timeout: 3000 });

    const [menu] = screen.getAllByRole('button', { name: /Actions for Ravi Textiles/ });
    await user.click(menu as HTMLElement);
    await user.click(screen.getByRole('menuitem', { name: 'Deactivate' }));

    await waitFor(() => expect(sent).toHaveBeenCalledWith({ isActive: false }));
    // Retiring must never read as deleting: the vendor's history is still there.
    expect(await screen.findByText(/past orders and bills are untouched/)).toBeInTheDocument();
  });
});

describe('VendorsListPage on a desktop', () => {
  // The table (and its pagination) only renders from lg: up.
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (media: string) => ({
      matches: true,
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('asks the API for the next page, and a new search starts again at page 1', async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/vendors`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        seen.push(params);
        const page = Number(params.get('page'));
        return envelope(paged(page === 2 ? [VENDORS[1]] : [VENDORS[0]], { page, total: 40 }));
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ravi Textiles');

    await user.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(await screen.findByText('Meher Silk Mills')).toBeInTheDocument();
    const second = seen.at(-1);
    expect(second?.get('page')).toBe('2');
    // Defaults stay off the wire: only the page number changed.
    expect(second?.get('pageSize')).toBeNull();
    expect(second?.get('sort')).toBeNull();

    // On a desktop the search field sits open in the toolbar row.
    await user.type(
      await screen.findByRole('searchbox', { name: 'Search vendors by name or mobile number' }),
      'ravi',
    );

    await waitFor(() => expect(seen.at(-1)?.get('q')).toBe('ravi'));
    expect(seen.at(-1)?.get('page')).toBeNull(); // back to page 1, the default
  });
});
