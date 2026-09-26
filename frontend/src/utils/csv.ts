import { downloadBlob } from './file';

export type CsvValue = string | number | null | undefined;

// A cell starting with = + - @ (or tab/CR) runs as a formula in Excel and Sheets; the leading
// quote makes it text. Plain negative numbers stay numbers — they are not strings.
const FORMULA_START = /^[=+\-@\t\r]/;

const escapeCell = (value: CsvValue) => {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (headers: string[], rows: CsvValue[][]) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');

export const downloadCsv = (filename: string, csv: string) =>
  // The BOM makes Excel read the file as UTF-8 (₹, names in Indic scripts).
  downloadBlob(
    filename.endsWith('.csv') ? filename : `${filename}.csv`,
    new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
  );
