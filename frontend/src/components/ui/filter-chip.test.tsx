import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FilterChip } from './filter-chip';

const OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'billed', label: 'Billed' },
  { value: 'paid', label: 'Paid' },
];

const Harness = ({ initial = [] as string[], onChange = vi.fn() }) => {
  const [selected, setSelected] = useState(initial);
  return (
    <FilterChip
      label="State"
      options={OPTIONS}
      selected={selected}
      onChange={(next) => {
        onChange(next);
        setSelected(next);
      }}
      onClear={() => setSelected([])}
    />
  );
};

const trigger = () => screen.getByRole('button', { name: /^State/ });

describe('FilterChip', () => {
  it('names up to two values, then counts', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['open']} />);

    expect(trigger()).toHaveTextContent('State: Open');
    await user.click(trigger());
    await user.click(screen.getByRole('checkbox', { name: 'Paid' }));
    expect(trigger()).toHaveTextContent('State: Open, Paid');
    await user.click(screen.getByRole('checkbox', { name: 'Billed' }));

    expect(trigger()).toHaveTextContent('State: 3 selected');
  });

  it('reports values in option order', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={['paid']} onChange={onChange} />);

    await user.click(trigger());
    await user.click(screen.getByRole('checkbox', { name: 'Open' }));

    expect(onChange).toHaveBeenLastCalledWith(['open', 'paid']);
  });

  it('drives select all through none, some and all', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(trigger());
    const all = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all' });
    expect(all).not.toBeChecked();
    expect(all.indeterminate).toBe(false);

    await user.click(screen.getByRole('checkbox', { name: 'Billed' }));
    expect(all.indeterminate).toBe(true);

    await user.click(all);
    expect(onChange).toHaveBeenLastCalledWith(['open', 'billed', 'paid']);
    expect(all).toBeChecked();
    expect(all.indeterminate).toBe(false);

    await user.click(all);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('closes on Escape and returns focus to the chip', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('checkbox', { name: 'Open' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveFocus();
  });
});
