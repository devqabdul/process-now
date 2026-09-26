import type { PageQuery } from '../common.types';
import type { Order } from '../orders';

// Derived from payments, never stored. A voided bill owes nothing.
export type BillStatus = 'due' | 'paid' | 'voided';

export const PAYMENT_METHODS = ['cash', 'upi', 'bank', 'cheque', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  // The account the money landed in; null when none was chosen.
  bankAccountId: string | null;
  bankAccount: { id: string; name: string } | null;
}

interface BillAmounts {
  id: string;
  // Formatted with the company's prefix: "FN-0001", or "1" without one.
  billNo: string;
  subtotal: string;
  // null when the company has no GST number.
  gstAmount: string | null;
  total: string;
  amountPaid: string;
  amountDue: string;
  status: BillStatus;
  voidedAt: string | null;
  voidReason: string | null;
  issuedAt: string;
}

/** List row: enough to show who owes what. */
export interface Bill extends BillAmounts {
  order: { id: string; orderNo: string; vendor: { id: string; name: string } };
}

/** Detail: the order it bills, its lines, and every payment against it. */
export interface BillDetail extends BillAmounts {
  order: Order;
  payments: Payment[];
}

export interface BillsQuery extends PageQuery {
  // Voided bills are excluded unless asked for.
  status?: BillStatus;
}

export interface RecordPaymentPayload {
  // Rejected with a field error if it exceeds what is due.
  amount: number;
  method: PaymentMethod;
  // Must be an active account of this company.
  bankAccountId?: string;
}
