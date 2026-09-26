export interface Expense {
  id: string;
  companyId: string;
  bankAccountId: string;
  // Free text; earlier ones come back from /expenses/categories as suggestions.
  category: string;
  amount: string;
  // YYYY-MM-DD in the business timezone.
  spentOn: string;
  notes: string | null;
  bankAccount: { id: string; name: string };
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ExpensesQuery {
  // Defaults: the last 30 days up to today.
  from?: string;
  to?: string;
  bankAccountId?: string;
  category?: string;
}

export interface ExpenseList {
  from: string;
  to: string;
  // Summed by the API over the whole filtered period.
  total: string;
  // Newest first.
  expenses: Expense[];
}

export interface CreateExpensePayload {
  // Must be an active account of this company.
  bankAccountId: string;
  category: string;
  amount: number;
  // Not in the future.
  spentOn: string;
  notes?: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;
