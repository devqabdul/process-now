import { IsIn, IsUUID, Min } from 'class-validator';
import { ListQueryDto, ToArray } from '../../common/dto/list-query.dto.js';
import { IsAmount, IsName, Optional } from '../../common/validators.js';

export const PAYMENT_METHODS = [
  'cash',
  'upi',
  'bank',
  'cheque',
  'other',
] as const;

export class VoidBillDto {
  /** Why it was voided, kept on the bill for the audit trail */
  @IsName(200)
  reason: string;
}

export class RecordPaymentDto {
  @IsAmount()
  @Min(0.01)
  amount: number;

  @IsIn(PAYMENT_METHODS)
  method: (typeof PAYMENT_METHODS)[number];

  /** The account the money landed in; optional, left out of every statement when unset */
  @Optional()
  @IsUUID()
  bankAccountId?: string;
}

/** `q` matches vendor name or the bill number; sort by `issuedAt` (default `-issuedAt`), `billNo` or `total`. */
export class ListBillsQueryDto extends ListQueryDto {
  /** Computed from payments; repeat to combine. Voided bills are excluded unless asked for */
  @Optional()
  @ToArray()
  @IsIn(['due', 'paid', 'voided'], { each: true })
  status?: ('due' | 'paid' | 'voided')[];
}
