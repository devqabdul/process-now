import {
  amountInWords,
  type BillPdfInput,
  formatBillDate,
  renderBillPdf,
  scriptRuns,
} from './bill-pdf.js';

const bill = (
  lines: number,
  overrides: Partial<BillPdfInput> = {},
): BillPdfInput => ({
  company: { name: 'FuseNow', gstNo: '27AABCF1234M1Z5' },
  vendor: { name: 'Ravi Textiles', phone: '9800022222', address: 'Surat' },
  billNo: 'FN-0001',
  orderNo: 'FN-0001',
  issuedAt: new Date('2026-09-20T06:00:00.000Z'),
  status: 'due',
  voidReason: null,
  payments: [
    {
      paidAt: new Date('2026-09-21T06:00:00.000Z'),
      method: 'upi',
      account: 'HDFC Current',
      amount: '500.00',
    },
  ],
  lines: Array.from({ length: lines }, (_, i) => ({
    service: `Collar fusing ${i + 1}`,
    options: 'Finish: Stiff',
    qty: '120',
    unit: 'piece',
    rate: '12.50',
    amount: '1500.00',
  })),
  subtotal: '1500.00',
  gstAmount: '270.00',
  total: '1770.00',
  amountPaid: '0.00',
  amountDue: '1770.00',
  ...overrides,
});

// Page objects are dictionaries, which pdfkit leaves uncompressed.
const pages = (pdf: Buffer) =>
  pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0;

describe('renderBillPdf', () => {
  it('draws a one-page PDF for an ordinary bill', async () => {
    const pdf = await renderBillPdf(bill(2));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pages(pdf)).toBe(1);
  });

  it('runs a long bill onto more pages instead of off the bottom', async () => {
    expect(pages(await renderBillPdf(bill(60)))).toBeGreaterThan(1);
  });

  it('renders without GST and when voided', async () => {
    const pdf = await renderBillPdf(
      bill(1, {
        company: { name: 'CrushNow', gstNo: null },
        gstAmount: null,
        status: 'voided',
        voidReason: 'Wrong quantity billed',
        payments: [],
      }),
    );
    expect(pages(pdf)).toBe(1);
  });

  it('sets Gujarati, Devanagari and Latin runs in their own embedded Noto fonts', async () => {
    expect(scriptRuns("ગુજરાતી वेंडर O'Brien ₹12")).toEqual([
      { script: 'gujr', text: 'ગુજરાતી ' },
      { script: 'deva', text: 'वेंडर ' },
      { script: 'latin', text: "O'Brien ₹12" },
    ]);
    const pdf = (
      await renderBillPdf(
        bill(1, {
          vendor: {
            name: 'ગુજરાતી वेंडर 🙂',
            phone: '9800022222',
            address: null,
          },
          lines: [
            {
              service: 'क्षेत्र ફ્યુઝિંગ',
              options: '',
              qty: '1',
              unit: 'piece',
              rate: '1.00',
              amount: '1.00',
            },
          ],
        }),
      )
    ).toString('latin1');
    for (const font of [
      'NotoSansGujarati-Bold',
      'NotoSansDevanagari-Bold',
      'NotoSans-Regular',
      'NotoSans-Bold',
    ])
      expect(pdf).toMatch(new RegExp(`/BaseFont /[A-Z]{6}\\+${font}\\b`));
    expect(pdf).not.toContain('Helvetica');
  });

  it('spells the total in Indian numbering, rupees and paise', () => {
    expect(amountInWords('123456.50')).toBe(
      'One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Rupees and Fifty Paise Only',
    );
    expect(amountInWords('10000001.01')).toBe(
      'One Crore One Rupees and One Paisa Only',
    );
    expect(amountInWords('1.00')).toBe('One Rupee Only');
    expect(amountInWords('0.75')).toBe('Seventy-Five Paise Only');
    expect(amountInWords('0.00')).toBe('Zero Rupees Only');
    expect(amountInWords('2345678901.00')).toBe(
      'Two Hundred Thirty-Four Crore Fifty-Six Lakh Seventy-Eight Thousand Nine Hundred One Rupees Only',
    );
  });

  it("dates the bill by the IST calendar day, in the app's format", () => {
    // 20:00 UTC on 25 Sep is already 26 Sep in Surat.
    expect(formatBillDate(new Date('2026-09-25T20:00:00.000Z'))).toBe(
      '26 Sep 2026',
    );
    expect(formatBillDate(new Date('2026-08-01T06:00:00.000Z'))).toBe(
      '1 Aug 2026',
    );
  });
});
