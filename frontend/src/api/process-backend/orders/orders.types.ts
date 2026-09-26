import type { ListParams } from '../common.types';
import type { BillOn } from '../service-types';

export type OrderStatus = 'received' | 'processing' | 'returned' | 'cancelled';

/** The choice a vendor picked, snapshotted with its price when the order was created. */
export interface ChosenOption {
  group: string;
  name: string;
  price: number;
  cost: number;
}

export interface OrderItem {
  id: string;
  serviceTypeId: string;
  // Snapshot: editing the service type later never changes this item.
  billOn: BillOn;
  selectedOptions: ChosenOption[];
  qtyIn: string;
  qtyOut: string | null;
  unitPrice: string;
  unitCost: string;
  // Set when the order is returned.
  amount: string | null;
  serviceType: { id: string; name: string; unit: string; billOn?: BillOn };
}

export interface Order {
  id: string;
  // Formatted with the company's prefix: "FN-0001", or "1" without one.
  orderNo: string;
  status: OrderStatus;
  receivedAt: string;
  returnedAt: string | null;
  notes: string | null;
  vendor: { id: string; name: string; phone: string };
  items: OrderItem[];
  bill: { id: string; billNo: string; total: string } | null;
}

// `q`: vendor name, or an order number in any form ("FN-0012", "0012", "12").
// Sort: receivedAt (default -receivedAt), orderNo, vendor.
export interface OrdersQuery extends ListParams {
  // Any of these; cancelled orders are hidden unless asked for.
  status?: OrderStatus[];
  vendorId?: string[];
}

/** No prices: the server computes them from the service type. */
export interface CreateOrderPayload {
  vendorId: string;
  notes?: string;
  items: {
    serviceTypeId: string;
    selectedOptions: { group: string; choice: string }[];
    qtyIn: number;
  }[];
}

export interface ReturnOrderPayload {
  // One entry per item of the order, exactly once each.
  items: { orderItemId: string; qtyOut: number }[];
}
