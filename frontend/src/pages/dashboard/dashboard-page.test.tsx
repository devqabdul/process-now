import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { dashboardFixture } from '@api/process-backend/dashboard/dashboard.fixtures';
import { API, envelope, server } from '@test/server';

import { DashboardPage } from './dashboard-page';

const renderDashboard = () => {
  const router = createMemoryRouter([{ path: '/', Component: DashboardPage }], {
    initialEntries: ['/'],
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe('DashboardPage', () => {
  // The page talks to the real endpoint; the fixture is what the API returns here.
  beforeEach(() => {
    server.use(
      http.get(`${API}/dashboard`, ({ request }) => {
        const date = new URL(request.url).searchParams.get('date') ?? '';
        return envelope(dashboardFixture(date));
      }),
    );
  });

  it("renders today's metrics", async () => {
    renderDashboard();

    expect(await screen.findByText('₹2,46,800')).toBeInTheDocument();
    // The tile value, not the count badge beside the table heading.
    expect(screen.getByText('9', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('1,420 pcs')).toBeInTheDocument();
    expect(screen.getByText('9.5 hrs')).toBeInTheDocument();
    expect(screen.getByText('138.4 units')).toBeInTheDocument();
    expect(screen.getByText('₹58,400')).toBeInTheDocument();
    expect(screen.getByText('Estimated profit')).toBeInTheDocument();
    expect(screen.getByText('₹21,350')).toBeInTheDocument();
    expect(screen.getByText('Rajwadi Creations')).toBeInTheDocument();
  });

  it('prompts for the daily log on a day that has none', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('₹2,46,800');
    await user.click(screen.getByRole('button', { name: 'Previous day' }));

    expect(await screen.findByText('Daily log not filled in')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add daily log' })).toHaveAttribute(
      'href',
      '/daily-log',
    );
  });
});
