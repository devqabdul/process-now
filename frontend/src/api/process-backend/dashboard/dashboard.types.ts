// Money and quantities are Prisma Decimals: they arrive as strings and are only formatted.

export type PendingOrderStatus = 'received' | 'processing';

export interface DashboardPendingOrder {
  id: string;
  orderNo: string;
  vendorName: string;
  serviceTypeName: string;
  qtyIn: string;
  // The service type's unit ('piece', 'kg', …).
  unit: string;
  receivedAt: string;
  status: PendingOrderStatus;
}

// Units are never added together, so each one is its own total.
export interface DashboardProcessedQuantity {
  unit: string;
  qty: string;
}

export interface DashboardDailyLog {
  machineHours: string;
  electricityUnits: string;
  // units × the company's electricity rate from settings
  electricityCost: string;
}

export interface Dashboard {
  date: string;
  pendingOrdersCount: number;
  amountToCollect: string;
  itemsProcessed: DashboardProcessedQuantity[];
  dailyLog: DashboardDailyLog | null;
  earnings: string;
  // From the configured per-unit costs of the day's bills.
  estimatedCost: string;
  estimatedProfit: string;
  // Recorded expenses for the day; shown on its own, never taken out of the profit.
  expenses: string;
  pendingOrders: DashboardPendingOrder[];
  // False only for a company that has never created an order (first-run empty state).
  hasOrders: boolean;
}
