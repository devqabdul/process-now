import { IsDateOnly, Optional } from '../../common/validators.js';

export class DashboardQueryDto {
  /** Defaults to today (IST) */
  @Optional()
  @IsDateOnly()
  date?: string;
}
