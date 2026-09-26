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
import { ListQueryDto, ToArray } from '../../common/dto/list-query.dto.js';
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

/**
 * `q` matches vendor name, notes or the order number ("FN-0012", "12");
 * sort by `receivedAt` (default `-receivedAt`), `orderNo` or `vendor`.
 */
export class ListOrdersQueryDto extends ListQueryDto {
  /** Repeat to match any of several; cancelled orders are hidden unless asked for */
  @Optional()
  @ToArray()
  @IsIn(['received', 'processing', 'returned', 'cancelled'], { each: true })
  status?: ('received' | 'processing' | 'returned' | 'cancelled')[];

  /** Repeat to match any of several vendors */
  @Optional()
  @ToArray()
  @IsUUID('all', { each: true })
  vendorId?: string[];
}
