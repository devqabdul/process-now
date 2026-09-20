/** Every list endpoint takes the same paging contract: cursor = last row's id. */
export interface PageQuery {
  limit?: number;
  cursor?: string;
}
