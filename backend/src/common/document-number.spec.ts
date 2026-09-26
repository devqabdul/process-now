import { formatDocumentNo, parseDocumentNo } from './document-number.js';

describe('formatDocumentNo', () => {
  it('pads to four digits behind the prefix', () => {
    expect(formatDocumentNo('FN', 1)).toBe('FN-0001');
    expect(formatDocumentNo('CN', 1048)).toBe('CN-1048');
  });

  it('keeps growing past four digits', () => {
    expect(formatDocumentNo('FN', 12345)).toBe('FN-12345');
  });

  it('falls back to a plain number', () => {
    expect(formatDocumentNo(null, 7)).toBe('7');
  });
});

describe('parseDocumentNo', () => {
  it('reads a printed or bare number', () => {
    expect(parseDocumentNo('FN-0012')).toBe(12);
    expect(parseDocumentNo('0012')).toBe(12);
  });

  it('ignores words and numbers past int4', () => {
    expect(parseDocumentNo('Ravi')).toBeUndefined();
    expect(parseDocumentNo('99999999999')).toBeUndefined();
  });
});
