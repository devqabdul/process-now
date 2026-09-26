import { IsIn, IsUUID, Min } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
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

export class ListBillsQueryDto extends PageQueryDto {
  /** Computed from payments; voided bills are excluded unless asked for */
  @Optional()
  @IsIn(['due', 'paid', 'voided'])
  status?: 'due' | 'paid' | 'voided';
}
