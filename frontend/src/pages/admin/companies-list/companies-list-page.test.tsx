import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPANIES } from '@api/process-backend/companies/companies.fixtures';
import { API, envelope, paged, server } from '@test/server';

import { CompaniesListPage } from './companies-list-page';

// One layout at a time (cards below md, table from md up); jsdom reports no match, so cards render.
const renderList = () => {
  const router = createMemoryRouter(
    [
      { path: '/admin/companies', Component: CompaniesListPage },
      { path: '/admin/companies/new', Component: () => <h1>New company</h1> },
    ],
    { initialEntries: ['/admin/companies'] },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe('CompaniesListPage — change admin password', () => {
  it('sets a new password from the row menu', async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.get(`${API}/admin/companies`, () => envelope(paged(COMPANIES))),
      http.patch(`${API}/admin/companies/:id/admin-password`, async ({ request, params }) => {
        sent({ id: params.id, body: await request.json() });
        return envelope({ changed: true, admin: 'Asha Rao' });
      }),
    );
    renderList();
    await screen.findAllByText('FuseNow', undefined, { timeout: 3000 });

    const [menuButton] = screen.getAllByRole('button', { name: /Actions for FuseNow/ });
    await user.click(menuButton as HTMLElement);
    await user.click(screen.getByRole('menuitem', { name: 'Change password' }));

    await user.type(screen.getByLabelText('New password'), 'fresh-password-1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
    expect(sent.mock.calls[0]?.[0]).toMatchObject({ body: { password: 'fresh-password-1' } });
    expect(await screen.findByText(/Password changed for Asha Rao/)).toBeInTheDocument();
  });

  it('keeps a short password out of the API', async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.get(`${API}/admin/companies`, () => envelope(paged(COMPANIES))),
      http.patch(`${API}/admin/companies/:id/admin-password`, () => {
        sent();
        return envelope({ changed: true, admin: 'Asha Rao' });
      }),
    );
    renderList();
    await screen.findAllByText('FuseNow', undefined, { timeout: 3000 });

    const [menuButton] = screen.getAllByRole('button', { name: /Actions for FuseNow/ });
    await user.click(menuButton as HTMLElement);
    await user.click(screen.getByRole('menuitem', { name: 'Change password' }));
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(sent).not.toHaveBeenCalled();
  });
});

describe('CompaniesListPage', () => {
  beforeEach(() => {
    // The API filters by `q`; the page only passes it through.
    server.use(
      http.get(`${API}/admin/companies`, ({ request }) => {
        const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
        return envelope(paged(COMPANIES.filter((c) => c.name.toLowerCase().includes(q))));
      }),
    );
  });

  it('lists the companies on the platform', async () => {
    renderList();

    expect(await screen.findAllByText('FuseNow', undefined, { timeout: 3000 })).not.toHaveLength(0);
    expect(screen.getAllByText('CrushNow').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Asha Rao').length).toBeGreaterThan(0);
    // A company without a GST number says so instead of showing a blank cell.
    expect(screen.getAllByText('No GST').length).toBeGreaterThan(0);
  });

  it('keeps a live region that announces the matching count', async () => {
    const user = userEvent.setup();
    renderList();

    // The region is mounted while the list loads, so the first count is an update, not a new node.
    const status = screen.getByRole('status');
    await screen.findAllByText('FuseNow', undefined, { timeout: 3000 });
    expect(status).toHaveTextContent('5 companies found.');

    // Search sits behind its icon button until opened.
    await user.click(screen.getByRole('button', { name: 'Search companies by name' }));
    await user.type(
      await screen.findByRole('searchbox', { name: 'Search companies by name' }),
      'crush',
    );
    await waitFor(() => expect(status).toHaveTextContent('1 company found.'));
  });

  it('filters by company name and offers a way out of an empty search', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findAllByText('FuseNow', undefined, { timeout: 3000 });

    // Search sits behind its icon button until opened.
    await user.click(screen.getByRole('button', { name: 'Search companies by name' }));
    await user.type(
      await screen.findByRole('searchbox', { name: 'Search companies by name' }),
      'crush',
    );

    await waitFor(() => expect(screen.queryByText('FuseNow')).not.toBeInTheDocument());
    expect(screen.getAllByText('CrushNow').length).toBeGreaterThan(0);

    await user.clear(await screen.findByRole('searchbox', { name: 'Search companies by name' }));
    await user.type(
      await screen.findByRole('searchbox', { name: 'Search companies by name' }),
      'zzz',
    );

    expect((await screen.findAllByText('Nothing matches “zzz”')).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: 'Show all companies' })[0]!);
    expect((await screen.findAllByText('FuseNow')).length).toBeGreaterThan(0);
  });
});

describe('CompaniesListPage — deactivate a company', () => {
  const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
    const [menuButton] = screen.getAllByRole('button', { name: /Actions for FuseNow/ });
    await user.click(menuButton as HTMLElement);
    await user.click(screen.getByRole('menuitem', { name: 'Deactivate' }));
  };

  it('needs the slider taken to the end before it suspends anything', async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.get(`${API}/admin/companies`, () => envelope(paged(COMPANIES))),
      http.patch(`${API}/admin/companies/:id`, async ({ request, params }) => {
        sent({ id: params.id, body: await request.json() });
        return envelope({ ...COMPANIES[0], isActive: false });
      }),
    );
    renderList();
    await screen.findAllByText('FuseNow', undefined, { timeout: 3000 });
    await openDialog(user);

    const slider = screen.getByRole('slider', { name: /Deactivate FuseNow/ });

    // Let go half way and nothing happens — that is the whole point of the control.
    fireEvent.change(slider, { target: { value: '50' } });
    fireEvent.pointerUp(slider);
    expect(sent).not.toHaveBeenCalled();
    expect(slider).toHaveValue('0');

    fireEvent.change(slider, { target: { value: '100' } });
    fireEvent.pointerUp(slider);

    await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
    expect(sent.mock.calls[0]?.[0]).toMatchObject({ body: { isActive: false } });
    expect(await screen.findByText(/FuseNow is deactivated/)).toBeInTheDocument();
  });

  it('restores a suspended company straight from the menu', async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    const suspended = COMPANIES.find((company) => !company.isActive);
    server.use(
      http.get(`${API}/admin/companies`, () => envelope(paged(COMPANIES))),
      http.patch(`${API}/admin/companies/:id`, async ({ request }) => {
        sent(await request.json());
        return envelope({ ...suspended, isActive: true });
      }),
    );
    renderList();
    await screen.findAllByText(suspended!.name, undefined, { timeout: 3000 });

    const [menuButton] = screen.getAllByRole('button', {
      name: new RegExp(`Actions for ${suspended!.name}`),
    });
    await user.click(menuButton as HTMLElement);
    await user.click(screen.getByRole('menuitem', { name: 'Activate' }));

    await waitFor(() => expect(sent).toHaveBeenCalledWith({ isActive: true }));
  });
});
