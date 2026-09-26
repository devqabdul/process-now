import { IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ListQueryDto, ToArray } from '../../common/dto/list-query.dto.js';
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

/**
 * `q` matches category or notes; sort by `spentOn` (default `-spentOn`), `amount` or `category`.
 * from/to are written out because a class extends only one base; see DateRangeQueryDto.
 */
export class ListExpensesQueryDto extends ListQueryDto {
  /** Defaults to 29 days before `to` */
  @Optional()
  @IsDateOnly()
  from?: string;

  /** Defaults to today */
  @Optional()
  @IsDateOnly()
  to?: string;

  @Optional()
  @IsUUID()
  bankAccountId?: string;

  /** Repeat to match any of several categories (case-insensitive) */
  @Optional()
  @ToArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  category?: string[];
}
