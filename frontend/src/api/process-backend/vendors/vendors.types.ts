import type { ListParams } from '../common.types';

export interface Vendor {
  id: string;
  name: string;
  // 10 digits, no +91.
  phone: string;
  address: string | null;
  // false retires the vendor: hidden from new orders, their history untouched.
  isActive: boolean;
  createdAt: string;
}

// `q` matches name, address or phone. Sort: name (default), createdAt.
export type VendorsQuery = ListParams;

export interface CreateVendorPayload {
  name: string;
  phone: string;
  address?: string;
}

export type UpdateVendorPayload = Partial<CreateVendorPayload> & { isActive?: boolean };

export type VendorStatementKind = 'order' | 'bill' | 'payment';

export interface VendorStatementEntry {
  kind: VendorStatementKind;
  id: string;
  // YYYY-MM-DD in the business timezone.
  date: string;
  at: string;
  // "Order FN-0003 received", "Bill FN-0002", "Payment · upi".
  title: string;
  detail: string;
  // order: received/processing/…; bill: issued/voided; payment: received.
  status: string;
  // null for an order: taking in a lot moves no money.
  amount: string | null;
  // What the vendor owed once this line had happened.
  balance: string;
  orderId: string | null;
  billId: string | null;
}

export interface VendorStatement {
  vendor: Vendor;
  from: string;
  to: string;
  // Owed going into the period: earlier bills (voided excluded) less earlier payments.
  openingDue: string;
  billed: string;
  received: string;
  closingDue: string;
  ordersIn: number;
  // Newest first.
  entries: VendorStatementEntry[];
}
