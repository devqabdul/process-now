export type PageItem = number | 'ellipsis';

// First, last and current ±1 are always shown; a gap of one page shows that page rather than "…".
export const pageItems = (page: number, pageCount: number): PageItem[] => {
  if (pageCount <= 1) return pageCount === 1 ? [1] : [];
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  const items: PageItem[] = [];
  let previous = 0;
  for (const n of pages) {
    if (n - previous === 2) items.push(previous + 1);
    else if (n - previous > 2) items.push('ellipsis');
    items.push(n);
    previous = n;
  }
  return items;
};

export const pageCountOf = (total: number, pageSize: number) =>
  Math.max(0, Math.ceil(total / pageSize));
