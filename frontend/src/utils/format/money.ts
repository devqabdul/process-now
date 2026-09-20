const WHOLE_RUPEES = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const WITH_PAISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// The API sends Decimal strings with two places. Paise are dropped only when they are zero:
// rounding ₹531.50 to ₹532 on a screen someone pays from is never acceptable.
const hasPaise = (amount: string) => {
  const paise = amount.split('.')[1];
  return paise !== undefined && Number(paise) !== 0;
};

export const formatMoney = (amount: string) => {
  // Number('') is 0, and a missing amount shown as ₹0 reads as "nothing owed".
  const value = amount.trim() === '' ? Number.NaN : Number(amount);
  // A malformed Decimal must not render as ₹NaN on the figure the shop reads daily.
  if (!Number.isFinite(value)) return '—';
  return hasPaise(amount) ? WITH_PAISE.format(value) : WHOLE_RUPEES.format(value);
};
