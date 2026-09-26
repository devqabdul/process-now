import { Decimal } from '@prisma/client/runtime/client';

export interface LedgerLine {
  // ISO timestamp; ties keep their input order.
  at: string;
  // What the line adds to, and takes off, the amount owed.
  debit: Decimal;
  credit: Decimal;
}

/** Oldest first, each line carrying what is owed once it has happened. */
export const withRunningBalance = <T extends LedgerLine>(
  opening: Decimal,
  lines: T[],
) => {
  let balance = opening;
  return [...lines]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((line) => {
      balance = balance.plus(line.debit).minus(line.credit);
      return { ...line, balance };
    });
};
