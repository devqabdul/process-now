import { formatDocumentNo } from './document-number.js';
import type { Prisma } from '../generated/prisma/client.js';

/** One small lookup per request; the prefix is the same for every row of a company. */
export const companyPrefix = async (
  db: Prisma.TransactionClient,
  companyId: string,
) =>
  (
    await db.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { numberPrefix: true },
    })
  ).numberPrefix;

export const withDocumentNo = <T extends { orderNo: number }>(
  row: T,
  prefix: string | null,
) => ({ ...row, orderNo: formatDocumentNo(prefix, row.orderNo) });
