import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { IsAmount, IsName, Optional } from '../../common/validators.js';

export class SelectedOptionDto {
  @IsName(50)
  group: string;

  @IsName(50)
  choice: string;
}

export class CreateOrderItemDto {
  @IsUUID()
  serviceTypeId: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionDto)
  selectedOptions: SelectedOptionDto[];

  @IsAmount(3)
  @Min(0.001)
  qtyIn: number;
}

/** No prices: the server computes them from the service type. */
export class CreateOrderDto {
  @IsUUID()
  vendorId: string;

  @Optional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class ReturnOrderItemDto {
  @IsUUID()
  orderItemId: string;

  @IsAmount(3)
  qtyOut: number;
}

/** Quantity out for every item of the order. */
export class ReturnOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReturnOrderItemDto)
  items: ReturnOrderItemDto[];
}

export class CancelOrderDto {
  /** Why it was cancelled, appended to the order notes */
  @IsName(200)
  reason: string;
}

export class ListOrdersQueryDto extends PageQueryDto {
  /** Cancelled orders are hidden unless asked for */
  @Optional()
  @IsIn(['received', 'processing', 'returned', 'cancelled'])
  status?: 'received' | 'processing' | 'returned' | 'cancelled';

  @Optional()
  @IsUUID()
  vendorId?: string;

  /** Vendor name, or an order number */
  @Optional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
