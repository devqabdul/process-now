import {
  billableQty,
  billTotals,
  lineAmount,
  type OptionGroup,
  PricingError,
  priceItem,
} from './pricing.js';

const sherwani = {
  basePrice: 0,
  baseCost: 0,
  options: [
    {
      group: 'Part',
      multi: true,
      choices: [
        { name: 'Front', price: 20, cost: 6 },
        { name: 'Side', price: 10, cost: 3 },
      ],
    },
    {
      group: 'Finish',
      multi: false,
      choices: [
        { name: 'Soft', price: 0, cost: 0 },
        { name: 'Hard', price: 5, cost: 1 },
      ],
    },
  ] satisfies OptionGroup[],
};

describe('pricing', () => {
  it('FuseNow: 15 pcs sherwani, front and side = 450', () => {
    const { unitPrice, unitCost, chosen } = priceItem(sherwani, [
      { group: 'Part', choice: 'Front' },
      { group: 'Part', choice: 'Side' },
    ]);
    expect(unitPrice.toFixed(2)).toBe('30.00');
    expect(unitCost.toFixed(2)).toBe('9.00');
    expect(chosen).toHaveLength(2);
    expect(lineAmount(unitPrice, billableQty('in', 15, 14)).toFixed(2)).toBe(
      '450.00',
    );
  });

  it('CrushNow: 100 kg in, 95 kg out, billed on out = 760', () => {
    const { unitPrice } = priceItem(
      { basePrice: '8.00', baseCost: '3.00', options: [] },
      [],
    );
    expect(lineAmount(unitPrice, billableQty('out', 100, 95)).toFixed(2)).toBe(
      '760.00',
    );
  });

  it('keeps decimals exact and rounds half up', () => {
    expect(lineAmount('0.10', '0.3').toFixed(2)).toBe('0.03');
    expect(lineAmount('8.35', '1.5').toFixed(2)).toBe('12.53'); // 12.525
  });

  it.each([
    [[{ group: 'Colour', choice: 'Red' }], /Unknown option group/],
    [[{ group: 'Part', choice: 'Back' }], /Unknown choice/],
    [
      [
        { group: 'Part', choice: 'Front' },
        { group: 'Part', choice: 'Front' },
      ],
      /selected twice/,
    ],
    [
      [
        { group: 'Finish', choice: 'Soft' },
        { group: 'Finish', choice: 'Hard' },
      ],
      /only one/,
    ],
  ])('rejects invalid selections %#', (selected, message) => {
    expect(() => priceItem(sherwani, selected)).toThrow(PricingError);
    expect(() => priceItem(sherwani, selected)).toThrow(message);
  });

  it('adds GST only when a rate is given', () => {
    const withGst = billTotals(['450.00', '760.00'], 18);
    expect(withGst.subtotal.toFixed(2)).toBe('1210.00');
    expect(withGst.gstAmount?.toFixed(2)).toBe('217.80');
    expect(withGst.total.toFixed(2)).toBe('1427.80');

    const noGst = billTotals(['760.00'], null);
    expect(noGst.gstAmount).toBeNull();
    expect(noGst.total.toFixed(2)).toBe('760.00');
  });
});
