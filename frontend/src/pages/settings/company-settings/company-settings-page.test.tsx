import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import type { Settings } from '@api/process-backend/settings';
import { API, envelope, server } from '@test/server';

import { CompanySettingsPage } from './company-settings-page';

const SETTINGS: Settings = {
  id: 'c-1',
  name: 'FuseNow',
  gstNo: '27AABCF1234M1Z5',
  numberPrefix: 'FN',
  settings: { electricityRate: 8.5, gstRate: 18 },
};

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CompanySettingsPage />
    </QueryClientProvider>,
  );

describe('CompanySettingsPage', () => {
  it('clears the GST number with null, which drops GST from new bills', async () => {
    const sent = vi.fn();
    server.use(
      http.get(`${API}/settings`, () => envelope(SETTINGS)),
      http.patch(`${API}/settings`, async ({ request }) => {
        const body = await request.json();
        sent(body);
        return envelope({ ...SETTINGS, gstNo: null });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    const gst = await screen.findByLabelText('GST number', undefined, { timeout: 3000 });
    expect(gst).toHaveValue('27AABCF1234M1Z5');
    await user.clear(gst);
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() =>
      expect(sent).toHaveBeenCalledWith({
        name: 'FuseNow',
        gstNo: null,
        numberPrefix: 'FN',
        settings: { electricityRate: 8.5, gstRate: 18 },
      }),
    );
    expect(await screen.findByText(/Settings saved/)).toBeInTheDocument();
  });

  it('rejects a GST rate above 100 before it reaches the API', async () => {
    const sent = vi.fn();
    server.use(
      http.get(`${API}/settings`, () => envelope(SETTINGS)),
      http.patch(`${API}/settings`, () => {
        sent();
        return envelope(SETTINGS);
      }),
    );
    const user = userEvent.setup();
    renderPage();

    const rate = await screen.findByLabelText('GST rate', undefined, { timeout: 3000 });
    await user.clear(rate);
    await user.type(rate, '180');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(await screen.findByText('Enter a percentage between 0 and 100, like 18.')).toBeVisible();
    expect(sent).not.toHaveBeenCalled();
  });
});
