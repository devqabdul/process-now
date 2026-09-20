import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { IsAmount, IsName, Optional } from '../../common/validators.js';

export class OptionChoiceDto {
  @IsName(50)
  name: string;

  /** Added to the unit price when chosen */
  @IsAmount()
  price: number;

  /** Added to the unit cost when chosen */
  @IsAmount()
  cost: number;
}

export class OptionGroupDto {
  @IsName(50)
  group: string;

  /** true: pick any number of choices; false: at most one */
  @IsBoolean()
  multi: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OptionChoiceDto)
  choices: OptionChoiceDto[];
}

export class CreateServiceTypeDto {
  @IsName()
  name: string;

  /** Label shown in the UI and on bills: 'piece', 'kg', ... */
  @IsName(20)
  unit: string;

  /** Price per unit charged to the vendor */
  @IsAmount()
  basePrice: number;

  /** Estimated processing cost per unit */
  @IsAmount()
  baseCost: number;

  /** Bill on quantity received ('in') or returned ('out') */
  @IsIn(['in', 'out'])
  billOn: 'in' | 'out';

  @Optional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OptionGroupDto)
  options?: OptionGroupDto[];
}

// Written out rather than PartialType(CreateServiceTypeDto): PartialType re-applies
// class-validator's @IsOptional(), which lets an explicit null through unvalidated.
export class UpdateServiceTypeDto {
  @Optional()
  @IsName()
  name?: string;

  @Optional()
  @IsName(20)
  unit?: string;

  @Optional()
  @IsAmount()
  basePrice?: number;

  @Optional()
  @IsAmount()
  baseCost?: number;

  @Optional()
  @IsIn(['in', 'out'])
  billOn?: 'in' | 'out';

  @Optional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OptionGroupDto)
  options?: OptionGroupDto[];

  /** false hides it from new orders; old orders keep referencing it */
  @Optional()
  @IsBoolean()
  isActive?: boolean;
}
