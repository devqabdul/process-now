import { Decimal } from '@prisma/client/runtime/client';
import { today } from '../common/dates.js';
import { formatDocumentNo } from '../common/document-number.js';
import { withRunningBalance } from '../common/ledger.js';
import { money } from '../common/money.js';

const ZERO = new Decimal(0);

export interface StatementRows {
  orders: {
    id: string;
    orderNo: number;
    numberPrefix: string | null;
    status: string;
    receivedAt: Date;
    items: { qtyIn: Decimal; serviceName: string; unit: string }[];
  }[];
  bills: {
    id: string;
    billNo: number;
    numberPrefix: string | null;
    total: Decimal;
    voidedAt: Date | null;
    voidReason: string | null;
    issuedAt: Date;
    order: { id: string; orderNo: number; numberPrefix: string | null };
  }[];
  payments: {
    id: string;
    amount: Decimal;
    method: string;
    paidAt: Date;
    bill: { id: string; billNo: number; numberPrefix: string | null };
    bankAccount: { name: string } | null;
  }[];
}

/**
 * Orders, bills and payments as one timeline, newest first. Orders move no money and a
 * voided bill owes nothing, so both leave the balance where it was.
 */
export const buildStatementEntries = (
  opening: Decimal,
  { orders, bills, payments }: StatementRows,
) => {
  const lines = [
    ...orders.map((o) => ({
      kind: 'order' as const,
      id: o.id,
      at: o.receivedAt.toISOString(),
      title: `Order ${formatDocumentNo(o.numberPrefix, o.orderNo)} received`,
      // Units differ per service, so quantities are listed, never added up.
      detail: o.items
        .map((i) => `${i.serviceName} ${i.qtyIn.toString()} ${i.unit}`)
        .join(' · '),
      status: o.status,
      amount: null,
      orderId: o.id,
      billId: null,
      debit: ZERO,
      credit: ZERO,
    })),
    ...bills.map((b) => ({
      kind: 'bill' as const,
      id: b.id,
      at: b.issuedAt.toISOString(),
      title: `Bill ${formatDocumentNo(b.numberPrefix, b.billNo)}`,
      detail: b.voidedAt
        ? `Voided: ${b.voidReason ?? 'no reason given'}`
        : `For order ${formatDocumentNo(b.order.numberPrefix, b.order.orderNo)}`,
      status: b.voidedAt ? 'voided' : 'issued',
      amount: money(b.total),
      orderId: b.order.id,
      billId: b.id,
      debit: b.voidedAt ? ZERO : b.total,
      credit: ZERO,
    })),
    ...payments.map((p) => ({
      kind: 'payment' as const,
      id: p.id,
      at: p.paidAt.toISOString(),
      title: `Payment · ${p.method}`,
      detail: `Against bill ${formatDocumentNo(p.bill.numberPrefix, p.bill.billNo)}${p.bankAccount ? ` into ${p.bankAccount.name}` : ''}`,
      status: 'received',
      amount: money(p.amount),
      orderId: null,
      billId: p.bill.id,
      debit: ZERO,
      credit: p.amount,
    })),
  ];

  const ledger = withRunningBalance(opening, lines);
  const billed = ledger.reduce((s, l) => s.plus(l.debit), ZERO);
  const received = ledger.reduce((s, l) => s.plus(l.credit), ZERO);
  return {
    openingDue: money(opening),
    billed: money(billed),
    received: money(received),
    closingDue: money(opening.plus(billed).minus(received)),
    ordersIn: orders.length,
    entries: ledger
      .map(({ debit: _debit, credit: _credit, balance, ...line }) => ({
        ...line,
        date: today(new Date(line.at)),
        balance: money(balance),
      }))
      .reverse(),
  };
};
