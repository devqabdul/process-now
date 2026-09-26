import type { Prisma } from '../generated/prisma/client.js';
import { fieldError } from './validators.js';

/** Money can only land in, or leave from, an open account of the same company. */
export const assertBankAccount = async (
  db: Prisma.TransactionClient,
  companyId: string,
  id: string,
) => {
  const account = await db.bankAccount.findFirst({
    where: { id, companyId, isActive: true },
    select: { id: true },
  });
  if (!account)
    throw fieldError('bankAccountId', 'Account not found or closed');
};
