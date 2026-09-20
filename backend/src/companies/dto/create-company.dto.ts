import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  IsEmailAddress,
  IsGstNo,
  IsName,
  IsNumberPrefix,
  IsPhone,
  Optional,
} from '../../common/validators.js';

export class CompanyAdminDto {
  @IsName()
  name: string;

  /** Phone or email is required */
  @Optional()
  @IsPhone()
  phone?: string;

  @Optional()
  @IsEmailAddress()
  email?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

export class CreateCompanyDto {
  @IsName()
  name: string;

  @Optional()
  @IsGstNo()
  gstNo?: string;

  /** Shown on orders and bills, e.g. "FN" → FN-0001. Plain numbers when left out. */
  @Optional()
  @IsNumberPrefix()
  numberPrefix?: string;

  /** The company's first Company Admin */
  // @IsObject() because @ValidateNested() alone skips a missing value and accepts an array.
  @IsObject()
  @ValidateNested()
  @Type(() => CompanyAdminDto)
  admin: CompanyAdminDto;
}

export class ResetAdminPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

export class UpdateCompanyDto {
  @Optional()
  @IsName()
  name?: string;

  /** null clears the GST number, and with it the GST line on new bills */
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsGstNo()
  gstNo?: string | null;

  /** null goes back to plain numbers; documents already issued keep theirs */
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumberPrefix()
  numberPrefix?: string | null;

  /** false suspends the company: nobody from it can sign in */
  @Optional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCompanyAdminDto {
  @Optional()
  @IsName()
  name?: string;

  @Optional()
  @IsPhone()
  phone?: string;

  @Optional()
  @IsEmailAddress()
  email?: string;

  /** false disables this login without deleting the person */
  @Optional()
  @IsBoolean()
  isActive?: boolean;
}
