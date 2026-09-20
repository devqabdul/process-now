import { Decimal } from '@prisma/client/runtime/client';

/** DECIMAL(12,2): the largest value the money columns can hold. */
export const MAX_STORED_MONEY = new Decimal('9999999999.99');

/** A computed amount can overflow even when every input was in range. */
export const fitsInMoneyColumn = (value: Decimal) =>
  value.abs().lte(MAX_STORED_MONEY);

/**
 * Money always crosses the wire with exactly 2 decimals ("450.00"), so the
 * contract doesn't change shape with the value. Quantities are left at their
 * own precision — rounding 95.125 kg to 2 places would lose data.
 */
export const money = (value: Decimal | number | string) =>
  new Decimal(value).toFixed(2);

/** The money fields every order item carries. */
export const itemMoney = <
  T extends { unitPrice: Decimal; unitCost: Decimal; amount: Decimal | null },
>(
  item: T,
) => ({
  ...item,
  unitPrice: money(item.unitPrice),
  unitCost: money(item.unitCost),
  amount: item.amount === null ? null : money(item.amount),
});
