import { IsBoolean } from 'class-validator';
import { IsAmount, IsName, Optional } from '../../common/validators.js';

export class CreateBankAccountDto {
  /** e.g. "HDFC Current" or "Cash in hand"; unique within the company */
  @IsName(60)
  name: string;

  /** What the account held before it was tracked here */
  @Optional()
  @IsAmount()
  openingBalance?: number;
}

export class UpdateBankAccountDto {
  /** false closes the account: no new payments or expenses, history kept */
  @Optional()
  @IsBoolean()
  isActive?: boolean;

  @Optional()
  @IsName(60)
  name?: string;

  @Optional()
  @IsAmount()
  openingBalance?: number;
}
