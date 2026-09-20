import { IsBoolean, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { IsName, IsPhone, Optional } from '../../common/validators.js';

export class CreateVendorDto {
  @IsName()
  name: string;

  @IsPhone()
  phone: string;

  @Optional()
  @IsString()
  @MaxLength(500)
  address?: string;
}

// Written out rather than PartialType(CreateVendorDto): PartialType re-applies
// class-validator's @IsOptional(), which lets an explicit null through unvalidated.
export class UpdateVendorDto {
  /** false retires the vendor: hidden from new orders, kept on old ones */
  @Optional()
  @IsBoolean()
  isActive?: boolean;

  @Optional()
  @IsName()
  name?: string;

  @Optional()
  @IsPhone()
  phone?: string;

  @Optional()
  @IsString()
  @MaxLength(500)
  address?: string;
}

export class ListVendorsQueryDto extends PageQueryDto {
  /** Matches name or phone */
  @Optional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
