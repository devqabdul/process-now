import { Type } from 'class-transformer';
import { IsObject, Max, ValidateIf, ValidateNested } from 'class-validator';
import {
  IsAmount,
  IsGstNo,
  IsName,
  IsNumberPrefix,
  Optional,
} from '../../common/validators.js';

export class RatesDto {
  /** ₹ per electricity unit */
  @Optional()
  @IsAmount()
  electricityRate?: number;

  /** Percent, applied only when the company has a GST number */
  @Optional()
  @IsAmount()
  @Max(100)
  gstRate?: number;
}

export class UpdateSettingsDto {
  @Optional()
  @IsName()
  name?: string;

  /** null removes the GST number */
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsGstNo()
  gstNo?: string | null;

  /** null goes back to plain numbers; existing documents keep their stored number */
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumberPrefix()
  numberPrefix?: string | null;

  // @IsObject() rejects an array, which @ValidateNested() alone accepts —
  // Object.entries([…]) then merged numeric keys straight into the jsonb column.
  @Optional()
  @IsObject()
  @ValidateNested()
  @Type(() => RatesDto)
  settings?: RatesDto;
}
