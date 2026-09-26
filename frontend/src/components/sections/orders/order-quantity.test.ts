import { describe, expect, it } from 'vitest';

import type { Order } from '@api/process-backend/orders';

import { orderQuantity } from './order-card';

const orderOf = (...items: [string, string][]) =>
  ({ items: items.map(([qtyIn, unit]) => ({ qtyIn, serviceType: { unit } })) }) as unknown as Order;

describe('orderQuantity', () => {
  it('never adds pieces to metres', () => {
    expect(orderQuantity(orderOf(['385', 'piece'], ['60', 'piece'], ['656.1', 'metre']))).toBe(
      '445 pcs + 656.1 metre',
    );
  });

  it('shows one total when every line shares a unit', () => {
    expect(orderQuantity(orderOf(['110', 'piece'], ['925', 'piece']))).toBe('1,035 pcs');
  });
});
