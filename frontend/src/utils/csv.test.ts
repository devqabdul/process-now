import { describe, expect, it } from 'vitest';

import { toCsv } from './csv';

describe('toCsv', () => {
  it('joins headers and rows with CRLF and leaves plain values bare', () => {
    expect(toCsv(['Name', 'Qty'], [['Bolt', 12]])).toBe('Name,Qty\r\nBolt,12');
  });

  it('renders null and undefined as empty cells', () => {
    expect(toCsv(['A', 'B', 'C'], [[null, undefined, 0]])).toBe('A,B,C\r\n,,0');
  });

  it('quotes commas, quotes and newlines, doubling inner quotes', () => {
    expect(toCsv(['V'], [['a,b'], ['say "hi"'], ['line\nbreak']])).toBe(
      'V\r\n"a,b"\r\n"say ""hi"""\r\n"line\nbreak"',
    );
  });

  it('neutralises formula injection in strings', () => {
    expect(toCsv(['V'], [['=SUM(A1)'], ['+1'], ['-2'], ['@cmd'], ['\tx']])).toBe(
      "V\r\n'=SUM(A1)\r\n'+1\r\n'-2\r\n'@cmd\r\n'\tx",
    );
  });

  it('applies the guard before quoting and leaves negative numbers alone', () => {
    expect(toCsv(['V'], [['=1,2'], [-5]])).toBe(`V\r\n"'=1,2"\r\n-5`);
  });
});
