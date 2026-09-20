import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeAll, describe, expect, it } from 'vitest';

import { COMPANY_ADMIN_NAV, type WorkspaceIdentity } from '@constants/navigation';

import { WorkspaceShell } from './workspace-shell';

const SCREENS = COMPANY_ADMIN_NAV.flatMap((group) => group.items);

const IDENTITY: WorkspaceIdentity = {
  name: 'FuseNow',
  role: 'Company admin',
  accent: 'warning',
  user: { name: 'Asha Rao', email: 'asha@fusenow.in' },
};

// jsdom ships <dialog> without its modal methods; the real focus trap is the browser's.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

const renderShell = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: () => <WorkspaceShell nav={COMPANY_ADMIN_NAV} identity={IDENTITY} />,
        children: [
          { index: true, Component: () => <p>Dashboard screen</p> },
          { path: 'orders', Component: () => <p>Orders screen</p> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe('WorkspaceCommandPalette', () => {
  it('opens on ⌘K, filters the workspace screens and navigates on Enter', async () => {
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('{Meta>}k{/Meta}');

    const input = screen.getByRole('combobox', { name: 'Search screens' });
    expect(screen.getAllByRole('option')).toHaveLength(SCREENS.length);

    await user.type(input, 'ord');
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Orders', 'New order']);

    await user.keyboard('{Enter}');
    expect(await screen.findByText('Orders screen')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
