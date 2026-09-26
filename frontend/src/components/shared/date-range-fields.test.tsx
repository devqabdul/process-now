import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DateRangeFields } from './date-range-fields';

const setup = () => {
  const onChange = vi.fn();
  render(
    <DateRangeFields from="2026-09-01" to="2026-09-26" max="2026-09-26" onChange={onChange} />,
  );
  return onChange;
};

describe('DateRangeFields', () => {
  it('keeps a typed range within the year the API accepts', () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-01-01' } });
    expect(onChange).toHaveBeenLastCalledWith({ from: '2024-01-01', to: '2025-01-01' });
  });

  it('never lets the range run backwards', () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-08-01' } });
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-08-01', to: '2026-08-01' });
  });
});
