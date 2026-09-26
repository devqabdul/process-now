import type { ListParams, Paged } from '../common.types';

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

// `q` matches category or notes. Sort: spentOn (default -spentOn), amount, category.
export interface ExpensesQuery extends ListParams {
  // Defaults: the last 30 days up to today.
  from?: string;
  to?: string;
  bankAccountId?: string;
  // Any of these, case-insensitive.
  category?: string[];
}

export interface ExpenseList extends Paged<Expense> {
  // Money total of every matching row, not just this page.
  sum: string;
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
