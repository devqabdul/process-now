const DECIMAL = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

// Units are per service type ('piece', 'kg', …); pieces read better shortened.
const UNIT_LABELS: Record<string, string> = { piece: 'pcs' };

export const formatQuantity = (qty: string, unit: string) =>
  `${DECIMAL.format(Number(qty))} ${UNIT_LABELS[unit] ?? unit}`;
