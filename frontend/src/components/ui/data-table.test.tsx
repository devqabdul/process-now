import { createColumnHelper } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, type DataTableFeatures, VIRTUALIZE_THRESHOLD } from './data-table';

interface Widget {
  id: string;
  name: string;
  batch: string;
}

const helper = createColumnHelper<DataTableFeatures, Widget>();

const columns = helper.columns([
  helper.accessor('name', {
    header: 'Name',
    enableSorting: true,
    sortFn: 'text',
    meta: { className: 'w-1/2' },
  }),
  helper.display({ id: 'batch', header: 'Batch', cell: ({ row }) => row.original.batch }),
]);

const WIDGETS: Widget[] = [
  { id: 'w2', name: 'Bolt', batch: 'B-2' },
  { id: 'w1', name: 'Anchor', batch: 'B-1' },
];

const renderTable = (props: Partial<Parameters<typeof DataTable<Widget>>[0]> = {}) =>
  render(
    <DataTable
      columns={columns}
      rows={WIDGETS}
      rowKey={(widget) => widget.id}
      label="Widgets"
      {...props}
    />,
  );

// The first column of every body row, in render order.
const firstColumnValues = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);

describe('DataTable', () => {
  it('renders a row per item and names itself for screen readers', () => {
    renderTable();

    expect(screen.getByRole('table', { name: 'Widgets' })).toBeInTheDocument();
    expect(firstColumnValues()).toEqual(['Bolt', 'Anchor']);
    expect(screen.getByRole('columnheader', { name: /Batch/ })).toHaveAttribute('scope', 'col');
  });

  it('shows skeleton rows shaped like the real rows while loading', () => {
    renderTable({ rows: [], loading: true, skeletonRows: 3 });

    expect(screen.getByRole('region', { name: 'Widgets' }).parentElement).toHaveAttribute(
      'aria-busy',
      'true',
    );
    // Header row plus one skeleton row per requested row, each with a cell per column.
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getAllByRole('cell')).toHaveLength(6);
  });

  it('renders the empty node when there are no rows', () => {
    renderTable({ rows: [], empty: <p>Nothing here yet</p> });

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByText('Bolt')).not.toBeInTheDocument();
  });

  it('sorts a sortable column from the keyboard and leaves the others alone', async () => {
    const user = userEvent.setup();
    renderTable();

    expect(screen.queryByRole('button', { name: /Batch/ })).not.toBeInTheDocument();
    const header = screen.getByRole('columnheader', { name: /Name/ });
    expect(header).toHaveAttribute('aria-sort', 'none');

    within(header).getByRole('button').focus();
    await user.keyboard('{Enter}');

    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(firstColumnValues()).toEqual(['Anchor', 'Bolt']);

    await user.keyboard('{Enter}');

    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(firstColumnValues()).toEqual(['Bolt', 'Anchor']);
  });

  it('keeps rows visible but busy while refreshing', () => {
    renderTable({ refreshing: true });

    expect(screen.getByRole('region', { name: 'Widgets' }).parentElement).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(firstColumnValues()).toEqual(['Bolt', 'Anchor']);
  });

  it('renders the error node in place of rows', () => {
    renderTable({ error: <p>Could not load</p> });

    expect(screen.getByText('Could not load')).toBeInTheDocument();
    expect(screen.queryByText('Bolt')).not.toBeInTheDocument();
  });

  it('leaves a hidden column out of the header and the rows', () => {
    renderTable({ columnVisibility: { batch: false } });

    expect(screen.queryByRole('columnheader', { name: /Batch/ })).not.toBeInTheDocument();
    expect(screen.queryByText('B-1')).not.toBeInTheDocument();
  });

  it('reports server-side sorting without reordering the rows', async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    renderTable({ sorting: [], onSortingChange });

    await user.click(screen.getByRole('button', { name: /Name/ }));

    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: false }]);
    expect(firstColumnValues()).toEqual(['Bolt', 'Anchor']);
  });

  it('renders every row up to the threshold and only a window beyond it', () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ id: `w${i}`, name: `W${i}`, batch: 'B' }));

    const { unmount } = renderTable({ rows: many(VIRTUALIZE_THRESHOLD) });
    expect(screen.getAllByRole('row')).toHaveLength(VIRTUALIZE_THRESHOLD + 1);
    unmount();

    renderTable({ rows: many(500) });
    const table = screen.getByRole('table', { name: 'Widgets' });
    expect(table).toHaveAttribute('aria-rowcount', '501');
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows.length).toBeGreaterThan(0);
    expect(bodyRows.length).toBeLessThan(500);
    expect(bodyRows[0]).toHaveAttribute('aria-rowindex', '2');
  });
});
