import { IsUUID, Min } from 'class-validator';
import { DateRangeQueryDto } from '../../common/dto/date-range-query.dto.js';
import {
  IsAmount,
  IsDateOnly,
  IsName,
  IsText,
  Optional,
} from '../../common/validators.js';

export class CreateExpenseDto {
  /** The account the money was paid from */
  @IsUUID()
  bankAccountId: string;

  /** Free text, e.g. "Electricity" or "Salary"; past ones are suggested */
  @IsName(60)
  category: string;

  @IsAmount()
  @Min(0.01)
  amount: number;

  @IsDateOnly()
  spentOn: string;

  @Optional()
  @IsText(500)
  notes?: string;
}

export class UpdateExpenseDto {
  @Optional()
  @IsUUID()
  bankAccountId?: string;

  @Optional()
  @IsName(60)
  category?: string;

  @Optional()
  @IsAmount()
  @Min(0.01)
  amount?: number;

  @Optional()
  @IsDateOnly()
  spentOn?: string;

  @Optional()
  @IsText(500)
  notes?: string;
}

export class ListExpensesQueryDto extends DateRangeQueryDto {
  @Optional()
  @IsUUID()
  bankAccountId?: string;

  @Optional()
  @IsName(60)
  category?: string;
}
