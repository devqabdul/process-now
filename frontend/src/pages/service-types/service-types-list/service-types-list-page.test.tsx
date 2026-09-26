import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { ServiceType } from '@api/process-backend/service-types';
import { API, envelope, paged, server } from '@test/server';

import { ServiceTypesListPage } from './service-types-list-page';

const FUSING: ServiceType = {
  id: 'svc_1',
  name: 'Sherwani fusing',
  isActive: true,
  unit: 'piece',
  basePrice: '45.00',
  baseCost: '12.50',
  billOn: 'in',
  options: [],
  createdAt: '2026-01-12T06:20:00.000Z',
};

// jsdom reports no media match, so the card layout renders rather than the table.
const renderPage = () => {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {/* The list keeps its page, search and sort in the URL. */}
      <MemoryRouter>
        <ServiceTypesListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ServiceTypesListPage', () => {
  it('shows what a service charges and what it costs to run', async () => {
    server.use(http.get(`${API}/service-types`, () => envelope(paged([FUSING]))));
    renderPage();

    expect(await screen.findByText('Sherwani fusing', undefined, { timeout: 3000 })).toBeVisible();
    // Paise are never rounded away on a figure the shop bills from.
    expect(screen.getByText('₹45')).toBeInTheDocument();
    expect(screen.getByText(/Costs ₹12.50 to run/)).toBeInTheDocument();
  });

  it('refuses a service that costs more to run than it charges', async () => {
    const sent = vi.fn();
    server.use(
      http.get(`${API}/service-types`, () => envelope(paged([FUSING]))),
      http.post(`${API}/service-types`, () => {
        sent();
        return envelope(FUSING, 201);
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sherwani fusing', undefined, { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: 'New service' }));
    await user.type(screen.getByLabelText('Service name'), 'Backing');
    await user.type(screen.getByLabelText('Charged per'), 'piece');
    await user.type(screen.getByLabelText('Price'), '10');
    await user.type(screen.getByLabelText('Cost to run'), '25');
    await user.click(screen.getByRole('button', { name: 'Add service' }));

    expect(
      await screen.findByText('This costs more to run than it charges. Check both figures.'),
    ).toBeInTheDocument();
    expect(sent).not.toHaveBeenCalled();
  });

  it('sends the amounts as numbers and confirms the save', async () => {
    const sent = vi.fn();
    server.use(
      http.get(`${API}/service-types`, () => envelope(paged([FUSING]))),
      http.post(`${API}/service-types`, async ({ request }) => {
        sent(await request.json());
        return envelope({ ...FUSING, id: 'svc_2', name: 'Backing' }, 201);
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sherwani fusing', undefined, { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: 'New service' }));
    await user.type(screen.getByLabelText('Service name'), 'Backing');
    await user.type(screen.getByLabelText('Charged per'), 'piece');
    await user.type(screen.getByLabelText('Price'), '30.50');
    await user.type(screen.getByLabelText('Cost to run'), '11');
    await user.click(screen.getByRole('button', { name: 'Add service' }));

    await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
    expect(sent.mock.calls[0]?.[0]).toEqual({
      name: 'Backing',
      unit: 'piece',
      basePrice: 30.5,
      baseCost: 11,
      billOn: 'in',
    });
    expect(await screen.findByText(/Backing is ready to use on new orders/)).toBeInTheDocument();
  });

  it('retires a service from the row menu without touching placed orders', async () => {
    const sent = vi.fn();
    server.use(
      http.get(`${API}/service-types`, () => envelope(paged([FUSING]))),
      http.patch(`${API}/service-types/:id`, async ({ request }) => {
        sent(await request.json());
        return envelope({ ...FUSING, isActive: false });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Sherwani fusing', undefined, { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: /Actions for Sherwani fusing/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Deactivate' }));

    await waitFor(() => expect(sent).toHaveBeenCalledWith({ isActive: false }));
    expect(await screen.findByText(/Orders already placed keep their price/)).toBeInTheDocument();

    // A mis-tap is one tap to put back.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(sent).toHaveBeenLastCalledWith({ isActive: true }));
    expect(await screen.findByText(/available for new orders again/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });
});
