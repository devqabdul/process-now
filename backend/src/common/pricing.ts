// The pricing formula (docs/module-design.md). Pure: no Nest, no DB.
import { Decimal } from '@prisma/client/runtime/client';

type Num = Decimal | number | string;

export interface OptionGroup {
  group: string;
  multi: boolean;
  choices: { name: string; price: number; cost: number }[];
}

/** What the client sends: which choice of which group. */
export interface SelectedOption {
  group: string;
  choice: string;
}

/** What the order item stores: the choice with its price and cost at order time. */
export interface ChosenOption {
  group: string;
  name: string;
  price: number;
  cost: number;
}

export class PricingError extends Error {}

/** unit price/cost = base + sum of chosen options. Prices the client sends are never used. */
export function priceItem(
  serviceType: { basePrice: Num; baseCost: Num; options: OptionGroup[] },
  selected: SelectedOption[],
) {
  const chosen: ChosenOption[] = [];
  for (const { group, choice } of selected) {
    const g = serviceType.options.find((o) => o.group === group);
    if (!g) throw new PricingError(`Unknown option group "${group}"`);
    const c = g.choices.find((x) => x.name === choice);
    if (!c) throw new PricingError(`Unknown choice "${choice}" in "${group}"`);
    if (chosen.some((x) => x.group === group && x.name === choice)) {
      throw new PricingError(`"${choice}" is selected twice`);
    }
    if (!g.multi && chosen.some((x) => x.group === group)) {
      throw new PricingError(`Pick only one choice in "${group}"`);
    }
    chosen.push({ group, name: c.name, price: c.price, cost: c.cost });
  }
  const sum = (key: 'price' | 'cost', base: Num) =>
    chosen.reduce((acc, c) => acc.plus(c[key]), new Decimal(base));
  return {
    unitPrice: sum('price', serviceType.basePrice),
    unitCost: sum('cost', serviceType.baseCost),
    chosen,
  };
}

export const billableQty = (billOn: 'in' | 'out', qtyIn: Num, qtyOut: Num) =>
  new Decimal(billOn === 'out' ? qtyOut : qtyIn);

export const lineAmount = (unitPrice: Num, qty: Num) =>
  new Decimal(unitPrice).times(qty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** gstRate null = company has no GST number, so no GST line. */
export function billTotals(amounts: Num[], gstRate: number | null) {
  const subtotal = amounts.reduce<Decimal>(
    (acc, a) => acc.plus(a),
    new Decimal(0),
  );
  const gstAmount =
    gstRate === null
      ? null
      : subtotal
          .times(gstRate)
          .dividedBy(100)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return { subtotal, gstAmount, total: subtotal.plus(gstAmount ?? 0) };
}
