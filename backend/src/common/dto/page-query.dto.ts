import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { Optional } from '../validators.js';

/**
 * Cursor paging. `cursor` is the id of the last row of the previous page.
 * @Type(() => Number) is needed because query params arrive as strings and
 * implicit conversion is deliberately off.
 */
export class PageQueryDto {
  @Optional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @Optional()
  @IsUUID()
  cursor?: string;
}

export const paginate = ({ limit, cursor }: PageQueryDto) => ({
  take: limit,
  ...(cursor && { cursor: { id: cursor }, skip: 1 }),
});
