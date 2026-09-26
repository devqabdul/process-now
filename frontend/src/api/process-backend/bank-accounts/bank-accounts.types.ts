// Money is a Decimal string with two places; it is only ever formatted here, never summed.

export interface BankAccount {
  id: string;
  companyId: string;
  // "Cash in hand" is an account too: every rupee is somewhere.
  name: string;
  openingBalance: string;
  // false closes the account: no new payments or expenses, its history kept.
  isActive: boolean;
  moneyIn: string;
  moneyOut: string;
  balance: string;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export type StatementEntryKind = 'in' | 'out';

export interface StatementEntry {
  kind: StatementEntryKind;
  id: string;
  // YYYY-MM-DD in the business timezone.
  date: string;
  at: string;
  amount: string;
  // The vendor who paid for 'in', the expense category for 'out'.
  title: string;
  // "FN-0001 · upi" for 'in', the expense's notes for 'out'.
  detail: string | null;
  billId: string | null;
}

export interface StatementQuery {
  // Defaults: the last 30 days up to today. At most a year apart.
  from?: string;
  to?: string;
}

export interface BankStatement {
  account: BankAccount;
  from: string;
  to: string;
  moneyIn: string;
  moneyOut: string;
  // Newest first.
  entries: StatementEntry[];
}

export interface CreateBankAccountPayload {
  name: string;
  openingBalance?: number;
}

export type UpdateBankAccountPayload = Partial<CreateBankAccountPayload> & { isActive?: boolean };
