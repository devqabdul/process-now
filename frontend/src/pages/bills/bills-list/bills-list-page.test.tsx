import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Bill } from '@api/process-backend/billing';
import { API, envelope, paged, server } from '@test/server';

import { BillsListPage } from './bills-list-page';

const bill = (id: string, billNo: string, amountPaid: string, amountDue: string): Bill => ({
  id,
  billNo,
  subtotal: '1000.00',
  gstAmount: null,
  total: '1000.00',
  amountPaid,
  amountDue,
  status: 'due',
  voidedAt: null,
  voidReason: null,
  issuedAt: '2026-09-20T06:00:00.000Z',
  order: { id: `o-${id}`, orderNo: 'FN-0001', vendor: { id: 'v-1', name: 'Ravi Textiles' } },
});

const BILLS = [
  bill('b-1', 'FN-0001', '0.00', '1000.00'),
  bill('b-2', 'FN-0002', '400.00', '600.00'),
];

// jsdom reports no media match, so the card layout renders rather than the table.
const renderPage = () => {
  const router = createMemoryRouter([{ path: '/bills', Component: BillsListPage }], {
    initialEntries: ['/bills'],
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
  server.use(
    http.get(`${API}/bills`, () => envelope(paged(BILLS))),
    http.get(`${API}/bank-accounts`, () => envelope([])),
  );
});

describe('BillsListPage', () => {
  it('only offers to void a bill nothing has been paid against', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Ravi Textiles', undefined, { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: 'Actions for bill FN-0001' }));
    expect(screen.getByRole('menuitem', { name: 'Void bill' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Actions for bill FN-0002' }));
    expect(screen.queryByRole('menuitem', { name: 'Void bill' })).not.toBeInTheDocument();
  });

  it('refuses a payment above what is due', async () => {
    const sent = vi.fn();
    server.use(
      http.post(`${API}/bills/:id/payments`, async ({ request }) => {
        sent(await request.json());
        return envelope(BILLS[1]);
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Ravi Textiles', undefined, { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: 'Actions for bill FN-0002' }));
    await user.click(screen.getByRole('menuitem', { name: 'Record payment' }));

    // It opens at the amount due, the usual answer.
    const amount = screen.getByLabelText('Amount received');
    expect(amount).toHaveValue('600.00');

    await user.clear(amount);
    await user.type(amount, '600.01');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(await screen.findByText(/is due on this bill/)).toBeVisible();
    expect(sent).not.toHaveBeenCalled();

    await user.clear(amount);
    await user.type(amount, '250');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(sent).toHaveBeenCalledWith({ amount: 250, method: 'cash' }));
  });

  describe('bill PDF', () => {
    // '%PDF-' — what the API sends is generated per request, never stored.
    const PDF = {
      fileName: 'bill-FN-0002.pdf',
      contentType: 'application/pdf',
      base64: btoa('%PDF-1.3'),
      vendor: { name: 'Ravi Textiles', phone: '9800022222' },
    };

    beforeEach(() => {
      server.use(http.get(`${API}/bills/:id/pdf`, () => envelope(PDF)));
      URL.createObjectURL = vi.fn(() => 'blob:bill');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      Reflect.deleteProperty(navigator, 'canShare');
      Reflect.deleteProperty(navigator, 'share');
    });

    it('downloads the PDF the API generated', async () => {
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const user = userEvent.setup();
      renderPage();
      await screen.findAllByText('Ravi Textiles', undefined, { timeout: 3000 });

      await user.click(screen.getByRole('button', { name: 'Actions for bill FN-0002' }));
      await user.click(screen.getByRole('menuitem', { name: 'Download PDF' }));

      await waitFor(() => expect(click).toHaveBeenCalled());
      const saved = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0] as File;
      expect(saved.name).toBe('bill-FN-0002.pdf');
      expect(saved.type).toBe('application/pdf');
    });

    it("without file sharing, opens WhatsApp on the vendor's chat with the amounts", async () => {
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const chat = { location: { href: '' }, close: vi.fn() };
      vi.spyOn(window, 'open').mockReturnValue(chat as unknown as Window);
      const user = userEvent.setup();
      renderPage();
      await screen.findAllByText('Ravi Textiles', undefined, { timeout: 3000 });

      await user.click(screen.getByRole('button', { name: 'Actions for bill FN-0002' }));
      await user.click(screen.getByRole('menuitem', { name: 'Send on WhatsApp' }));

      await waitFor(() => expect(chat.location.href).toContain('https://wa.me/919800022222?text='));
      const text = decodeURIComponent(chat.location.href.split('text=')[1] ?? '');
      expect(text).toContain('Bill FN-0002');
      expect(text).toContain('Due ₹600');
    });

    it('on a phone, hands the PDF itself to the share sheet', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { canShare: () => true, share });
      const open = vi.spyOn(window, 'open');
      const user = userEvent.setup();
      renderPage();
      await screen.findAllByText('Ravi Textiles', undefined, { timeout: 3000 });

      await user.click(screen.getByRole('button', { name: 'Actions for bill FN-0002' }));
      await user.click(screen.getByRole('menuitem', { name: 'Send on WhatsApp' }));

      await waitFor(() => expect(share).toHaveBeenCalled());
      const [{ files }] = share.mock.calls[0] as [{ files: File[] }];
      expect(files[0]?.name).toBe('bill-FN-0002.pdf');
      expect(open).not.toHaveBeenCalled();
    });
  });
});
