import { Decimal } from '@prisma/client/runtime/client';
import { withRunningBalance } from './ledger.js';

const line = (at: string, debit: number, credit: number) => ({
  at,
  debit: new Decimal(debit),
  credit: new Decimal(credit),
});

describe('withRunningBalance', () => {
  it('carries the opening due through bills and payments in time order', () => {
    const rows = withRunningBalance(new Decimal('100.50'), [
      line('2026-09-03T10:00:00.000Z', 0, 600),
      line('2026-09-01T10:00:00.000Z', 1000, 0),
      line('2026-09-02T10:00:00.000Z', 0, 0),
    ]);
    expect(rows.map((r) => r.at.slice(0, 10))).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
    expect(rows.map((r) => r.balance.toFixed(2))).toEqual([
      '1100.50',
      '1100.50',
      '500.50',
    ]);
  });

  it('returns nothing for an empty period', () => {
    expect(withRunningBalance(new Decimal(0), [])).toEqual([]);
  });
});
