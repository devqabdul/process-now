import { IsString, Max, MaxLength } from 'class-validator';
import { IsAmount, Optional } from '../../common/validators.js';

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
