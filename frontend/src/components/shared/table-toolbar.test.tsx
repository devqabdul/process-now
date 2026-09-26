import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { COLUMN_PICKER_MIN_COLUMNS, TableToolbar } from './table-toolbar';

const columns = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    label: `Column ${i}`,
    visible: true,
    hideable: true,
  }));

const renderToolbar = (rowCount: number, columnCount: number) =>
  render(
    <TableToolbar
      rowCount={rowCount}
      search=""
      onSearchChange={vi.fn()}
      searchLabel="Search vendors"
      columns={columns(columnCount)}
      onToggleColumn={vi.fn()}
      onExport={vi.fn(() => Promise.resolve())}
    />,
  );

describe('TableToolbar', () => {
  it('hides Export and Columns when there is nothing to act on', () => {
    renderToolbar(0, 9);
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /columns/i })).not.toBeInTheDocument();
  });

  it('offers Columns only on a wide table', () => {
    // Columns is a desktop control.
    vi.stubGlobal('matchMedia', (media: string) => ({
      matches: true,
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { unmount } = renderToolbar(5, COLUMN_PICKER_MIN_COLUMNS - 1);
    expect(screen.queryByRole('button', { name: /columns/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    unmount();
    renderToolbar(5, COLUMN_PICKER_MIN_COLUMNS);
    expect(screen.getByRole('button', { name: /columns/i })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('opens search from its icon and folds it away on Escape', async () => {
    const user = userEvent.setup();
    renderToolbar(5, 3);
    await user.click(screen.getByRole('button', { name: 'Search vendors' }));
    const field = await screen.findByRole('searchbox', { name: 'Search vendors' });
    await user.type(field, 'ravi{Escape}');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search vendors' })).toBeInTheDocument();
  });
});
