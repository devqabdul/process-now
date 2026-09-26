import { shiftIsoDate, todayIso } from '@utils/format/date';

import type { Dashboard, DashboardPendingOrder } from './dashboard.types';

const TODAY = todayIso();
const YESTERDAY = shiftIsoDate(TODAY, -1);

const PENDING_ORDERS: DashboardPendingOrder[] = [
  {
    id: 'o-1048',
    orderNo: 'FN-1048',
    vendorName: 'Rajwadi Creations',
    serviceTypeName: 'Sherwani fusing',
    qtyIn: '180',
    unit: 'piece',
    receivedAt: TODAY,
    status: 'received',
  },
  {
    id: 'o-1047',
    orderNo: 'FN-1047',
    vendorName: 'Meher Silk Mills',
    serviceTypeName: 'Collar fusing',
    qtyIn: '640',
    unit: 'piece',
    receivedAt: TODAY,
    status: 'processing',
  },
  {
    id: 'o-1045',
    orderNo: 'FN-1045',
    vendorName: 'Shalimar Textiles',
    serviceTypeName: 'Kurta fusing',
    qtyIn: '1200',
    unit: 'piece',
    receivedAt: YESTERDAY,
    status: 'processing',
  },
  {
    id: 'o-1043',
    orderNo: 'FN-1043',
    vendorName: 'Anand Fabrics',
    serviceTypeName: 'Lining fusing',
    qtyIn: '85',
    unit: 'kg',
    receivedAt: shiftIsoDate(TODAY, -2),
    status: 'processing',
  },
  {
    id: 'o-1041',
    orderNo: 'FN-1041',
    vendorName: 'Kohinoor Garments',
    serviceTypeName: 'Shirt fusing',
    qtyIn: '2400',
    unit: 'piece',
    receivedAt: shiftIsoDate(TODAY, -3),
    status: 'received',
  },
];

const FIXTURES: Record<string, Dashboard> = {
  [TODAY]: {
    date: TODAY,
    pendingOrdersCount: 9,
    amountToCollect: '246800.00',
    itemsProcessed: [{ unit: 'piece', qty: '1420' }],
    dailyLog: {
      machineHours: '9.5',
      electricityUnits: '138.4',
      electricityCost: '1314.8',
    },
    earnings: '58400.00',
    estimatedCost: '37050.00',
    estimatedProfit: '21350.00',
    expenses: '1850.00',
    pendingOrders: PENDING_ORDERS,
    hasOrders: true,
  },
  // The day the shop forgot to fill in its log: the dashboard prompts for it.
  [YESTERDAY]: {
    date: YESTERDAY,
    pendingOrdersCount: 7,
    amountToCollect: '231400.00',
    itemsProcessed: [
      { unit: 'piece', qty: '960' },
      { unit: 'kg', qty: '42' },
    ],
    dailyLog: null,
    earnings: '34250.00',
    estimatedCost: '21770.00',
    estimatedProfit: '12480.00',
    expenses: '0.00',
    pendingOrders: PENDING_ORDERS.slice(1),
    hasOrders: true,
  },
};

const quietDay = (date: string): Dashboard => ({
  date,
  pendingOrdersCount: 9,
  amountToCollect: '246800.00',
  itemsProcessed: [],
  dailyLog: null,
  earnings: '0.00',
  estimatedCost: '0.00',
  estimatedProfit: '0.00',
  expenses: '0.00',
  pendingOrders: PENDING_ORDERS,
  hasOrders: true,
});

export const dashboardFixture = (date: string): Dashboard => FIXTURES[date] ?? quietDay(date);
