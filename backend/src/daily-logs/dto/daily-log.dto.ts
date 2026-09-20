import { IsString, Max, MaxLength } from 'class-validator';
import { IsAmount, IsDateOnly, Optional } from '../../common/validators.js';

export class UpsertDailyLogDto {
  /** Total machine operating hours that day */
  @IsAmount()
  @Max(9999)
  machineHours: number;

  /** Electricity meter units consumed that day */
  @IsAmount()
  @Max(99_999_999)
  electricityUnits: number;

  @Optional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ListDailyLogsQueryDto {
  /** Defaults to 29 days before `to` */
  @Optional()
  @IsDateOnly()
  from?: string;

  /** Defaults to today */
  @Optional()
  @IsDateOnly()
  to?: string;
}
