// Structurally TanStack's SortingState, so utils/ stays free of the table library.
export type SortState = { id: string; desc: boolean }[];

// The API's `sort` param is one field, `-` prefixed for descending: `-name`.
export const toSortParam = (sorting: SortState): string | undefined => {
  const first = sorting[0];
  if (!first) return undefined;
  return first.desc ? `-${first.id}` : first.id;
};

export const fromSortParam = (sort: string | null | undefined): SortState => {
  if (!sort || sort === '-') return [];
  return sort.startsWith('-') ? [{ id: sort.slice(1), desc: true }] : [{ id: sort, desc: false }];
};
