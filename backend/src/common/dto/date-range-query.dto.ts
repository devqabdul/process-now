import { IsDateOnly, Optional } from '../validators.js';

/** A window of business days; see resolveRange() for the defaults. */
export class DateRangeQueryDto {
  /** Defaults to 29 days before `to` */
  @Optional()
  @IsDateOnly()
  from?: string;

  /** Defaults to today */
  @Optional()
  @IsDateOnly()
  to?: string;
}
