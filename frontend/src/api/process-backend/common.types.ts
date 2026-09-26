/** The query every paged list takes; endpoints add their own filters on top. */
// Every field is optional: the API defaults to page 1, 15 rows and the list's own sort.
export interface ListParams {
  // 1-based.
  page?: number;
  // 15, 25, 50 or 100 — anything else is a 422.
  pageSize?: number;
  q?: string;
  // One key from the endpoint's list, `-` prefixed for descending: `-receivedAt`.
  sort?: string;
}

/** Every paged list answers with one page plus the count of every matching row. */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
