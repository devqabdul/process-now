import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, Matches, Min } from 'class-validator';
import { fieldError, IsText, Optional } from '../validators.js';

export const PAGE_SIZES = [15, 25, 50, 100] as const;

type Dir = 'asc' | 'desc';

/**
 * The query every paged list takes. Endpoint DTOs extend it with their own filters.
 * @Type(() => Number) is needed because query params arrive as strings and
 * implicit conversion is deliberately off.
 */
export class ListQueryDto {
  /** 1-based */
  @Optional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Optional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES)
  pageSize: (typeof PAGE_SIZES)[number] = 15;

  /** Free-text search across the list's text columns */
  @Optional()
  @IsText(100)
  q?: string;

  /** A sort key from the endpoint's list, `-` prefixed for descending: `name`, `-receivedAt` */
  @Optional()
  @Matches(/^-?[A-Za-z]{1,40}$/, {
    message: 'Sort by a key such as name or -name',
  })
  sort?: string;
}

/** What one list endpoint can search and sort by. */
export interface ListSpec<Where, OrderBy> {
  /** Where-clauses for `q`, OR'd together */
  search: (term: string) => Where[];
  /** Public sort key → Prisma orderBy; `id` is appended as the tiebreaker */
  sortable: Record<string, (dir: Dir) => OrderBy[]>;
  defaultSort: string;
}

const paginate = ({ page, pageSize }: ListQueryDto) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

/**
 * findMany args for one page. `baseWhere` (the company scope plus endpoint filters) is
 * required and always ANDed, so search can widen nothing past it.
 */
export function listArgs<Where, OrderBy>(
  baseWhere: NoInfer<Where>,
  query: ListQueryDto,
  spec: ListSpec<Where, OrderBy>,
) {
  const sort = query.sort ?? spec.defaultSort;
  const dir: Dir = sort.startsWith('-') ? 'desc' : 'asc';
  const key = sort.replace(/^-/, '');
  const order = Object.hasOwn(spec.sortable, key)
    ? spec.sortable[key]
    : undefined;
  if (!order) {
    throw fieldError(
      'sort',
      `Sort by one of: ${Object.keys(spec.sortable).join(', ')}`,
    );
  }
  const term = query.q?.trim();
  return {
    where: { AND: [baseWhere], ...(term && { OR: spec.search(term) }) },
    orderBy: [...order(dir), { id: dir }],
    ...paginate(query),
  };
}

export const paged = <T>(
  items: T[],
  total: number,
  { page, pageSize }: ListQueryDto,
) => ({ items, total, page, pageSize });

/** `?status=a` and `?status=a&status=b` both become an array. */
export const ToArray = () =>
  Transform(({ value }: { value: unknown }) =>
    value === undefined || Array.isArray(value) ? value : [value],
  );
