const COUNT = new Intl.NumberFormat('en-IN');

// "1 expense", "1,204 orders".
export const formatCount = (n: number, one: string, many: string) =>
  `${COUNT.format(n)} ${n === 1 ? one : many}`;
