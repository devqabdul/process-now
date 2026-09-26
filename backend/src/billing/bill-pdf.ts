import { readFileSync } from 'node:fs';
import PDFDocument from 'pdfkit';
import { BUSINESS_TZ } from '../common/dates.js';

export interface BillPdfLine {
  service: string;
  // "Finish: Stiff, Part: Front" — empty when none were chosen.
  options: string;
  // The quantity billed: received or returned, per the item's billOn snapshot.
  qty: string;
  unit: string;
  rate: string;
  amount: string;
}

export interface BillPdfPayment {
  paidAt: Date;
  method: string;
  account: string | null;
  amount: string;
}

export interface BillPdfInput {
  company: { name: string; gstNo: string | null };
  vendor: { name: string; phone: string; address: string | null };
  billNo: string;
  orderNo: string;
  issuedAt: Date;
  status: 'due' | 'paid' | 'voided';
  voidReason: string | null;
  lines: BillPdfLine[];
  payments: BillPdfPayment[];
  subtotal: string;
  gstAmount: string | null;
  total: string;
  amountPaid: string;
  amountDue: string;
}

const FIGURE = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const figure = (amount: string) => FIGURE.format(Number(amount));
const rupees = (amount: string) => `₹${figure(amount)}`;
const QTY = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });
// "26 Sep 2026", as the app writes dates. Intl only finds the IST calendar day; its en-IN month
// names are left out because they spell September "Sept" and every other month in three letters.
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const IST_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ });
export const formatBillDate = (moment: Date) => {
  const [year, month, day] = IST_DAY.format(moment).split('-').map(Number);
  return `${day} ${MONTHS[month! - 1]} ${year}`;
};

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];
const belowHundred = (n: number) =>
  n < 20
    ? ONES[n]!
    : TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : '');
// Indian grouping: the last three digits, then pairs for thousand and lakh, then crores.
const indianWords = (n: number): string =>
  [
    n >= 1e7 ? `${indianWords(Math.floor(n / 1e7))} Crore` : '',
    Math.floor(n / 1e5) % 100
      ? `${belowHundred(Math.floor(n / 1e5) % 100)} Lakh`
      : '',
    Math.floor(n / 1e3) % 100
      ? `${belowHundred(Math.floor(n / 1e3) % 100)} Thousand`
      : '',
    Math.floor(n / 100) % 10 ? `${ONES[Math.floor(n / 100) % 10]} Hundred` : '',
    belowHundred(n % 100),
  ]
    .filter(Boolean)
    .join(' ');

/** "1234.50" → "One Thousand Two Hundred Thirty-Four Rupees and Fifty Paise Only". */
export const amountInWords = (amount: string) => {
  const [whole = '0', fraction = ''] = amount.split('.');
  const rupeeCount = Number(whole);
  const paise = Number(fraction.padEnd(2, '0').slice(0, 2));
  const parts = [
    rupeeCount
      ? `${indianWords(rupeeCount)} Rupee${rupeeCount === 1 ? '' : 's'}`
      : '',
    paise ? `${belowHundred(paise)} Pais${paise === 1 ? 'a' : 'e'}` : '',
  ].filter(Boolean);
  return `${parts.join(' and ') || 'Zero Rupees'} Only`;
};

// Vendor and service names are typed in Gujarati and Hindi as often as English, and no single
// font covers all three, so each run of text is set in the Noto face for its script.
const FONT_DIR = new URL('../../assets/fonts/', import.meta.url);
const FACES = {
  latin: 'NotoSans',
  gujr: 'NotoSansGujarati',
  deva: 'NotoSansDevanagari',
} as const;
type Script = keyof typeof FACES;
const FONT_FILES = Object.values(FACES).flatMap((face) =>
  (['Regular', 'Bold'] as const).map((weight) => ({
    name: `${face}-${weight}`,
    data: readFileSync(new URL(`${face}-${weight}.ttf`, FONT_DIR)),
  })),
);

// Joiners and the danda belong to whichever Indic run they sit in.
const NEUTRAL = new RegExp('\\s|\\u200C|\\u200D|\\u0964|\\u0965', 'u');
const scriptOf = (ch: string): Script | null =>
  NEUTRAL.test(ch)
    ? null
    : /\p{Script=Gujarati}/u.test(ch)
      ? 'gujr'
      : /\p{Script=Devanagari}/u.test(ch)
        ? 'deva'
        : 'latin';

export const scriptRuns = (text: string) => {
  const runs: { script: Script; text: string }[] = [];
  for (const ch of text) {
    const script = scriptOf(ch);
    const last = runs.at(-1);
    if (last && (script === null || script === last.script)) last.text += ch;
    else runs.push({ script: script ?? 'latin', text: ch });
  }
  return runs;
};

// None of the fonts has emoji; dropping them beats printing empty boxes.
const EMOJI = new RegExp('\\p{RGI_Emoji}|\\uFE0F', 'gv');
const GRAPHEMES = new Intl.Segmenter('en', { granularity: 'grapheme' });

const C = {
  accentInk: '#14675c',
  ink: '#1f2328',
  muted: '#6b7280',
  faint: '#9aa1ab',
  line: '#e5e7eb',
  rule: '#c9ced6',
  warning: '#985311',
  danger: '#c73a3f',
  dangerSoft: '#feecec',
};

const STATUS = {
  due: { label: 'Payment due', ink: C.warning },
  paid: { label: 'Paid in full', ink: C.accentInk },
  voided: { label: 'Void', ink: C.danger },
} as const;

const METHODS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank transfer',
  cheque: 'Cheque',
  other: 'Other',
};

const PAGE = { w: 595.28, h: 841.89 };
const M = 40;
const W = PAGE.w - M * 2;
const BOTTOM = PAGE.h - M - 24;

interface TextStyle {
  size: number;
  bold?: boolean;
  color?: string;
  width?: number;
  align?: 'left' | 'right';
  maxLines?: number;
  spacing?: number;
}

/** Rendered on request from the bill's stored figures; nothing here recalculates money. */
export const renderBillPdf = (bill: BillPdfInput): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: M,
      bufferPages: true,
      info: { Title: `Bill ${bill.billNo}`, Author: bill.company.name },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    FONT_FILES.forEach(({ name, data }) => doc.registerFont(name, data));

    const face = (script: Script, s: TextStyle) =>
      doc
        .font(`${FACES[script]}-${s.bold ? 'Bold' : 'Regular'}`)
        .fontSize(s.size);
    const measure = (text: string, s: TextStyle) =>
      scriptRuns(text).reduce(
        (sum, run) =>
          sum +
          face(run.script, s).widthOfString(run.text, {
            characterSpacing: s.spacing ?? 0,
          }),
        0,
      );
    const lineHeight = (s: TextStyle) => s.size * 1.45;
    const trim = (line: string, s: TextStyle) => {
      let cut = [...GRAPHEMES.segment(line)].map((g) => g.segment);
      while (cut.length && measure(`${cut.join('')}…`, s) > s.width!)
        cut = cut.slice(0, -1);
      return `${cut.join('').trimEnd()}…`;
    };
    // Greedy word wrap into `width`, cut to `maxLines` with an ellipsis.
    const layout = (raw: string, s: TextStyle) => {
      const words = raw.replace(EMOJI, '').split(/\s+/).filter(Boolean);
      if (!s.width) return [words.join(' ')];
      const lines: string[] = [];
      for (const word of words) {
        const last = lines.at(-1);
        if (last !== undefined && measure(`${last} ${word}`, s) <= s.width)
          lines[lines.length - 1] = `${last} ${word}`;
        else lines.push(word);
      }
      const max = s.maxLines ?? lines.length;
      return lines
        .map((line, i) =>
          (i === max - 1 && lines.length > max) || measure(line, s) > s.width!
            ? trim(line, s)
            : line,
        )
        .slice(0, max);
    };
    const draw = (lines: string[], x: number, y: number, s: TextStyle) => {
      lines.forEach((line, i) => {
        let cx = s.align === 'right' ? x + s.width! - measure(line, s) : x;
        for (const run of scriptRuns(line)) {
          face(run.script, s)
            .fillColor(s.color ?? C.ink)
            .text(run.text, cx, y + s.size * 1.05 + i * lineHeight(s), {
              lineBreak: false,
              baseline: 'alphabetic',
              characterSpacing: s.spacing ?? 0,
            });
          cx += doc.widthOfString(run.text, {
            characterSpacing: s.spacing ?? 0,
          });
        }
      });
      return lines.length * lineHeight(s);
    };
    const write = (text: string, x: number, y: number, s: TextStyle) =>
      draw(layout(text, s), x, y, s);
    const label = (text: string, x: number, y: number, width?: number) =>
      write(text.toUpperCase(), x, y, {
        size: 7,
        bold: true,
        color: C.faint,
        spacing: 0.8,
        width,
        align: width ? 'right' : 'left',
      });
    const rule = (y: number, color = C.line, x = M, width = W) =>
      doc
        .moveTo(x, y)
        .lineTo(x + width, y)
        .lineWidth(0.6)
        .strokeColor(color)
        .stroke();

    // ── Header ──────────────────────────────────────────────────────────────
    const metaW = 190;
    const metaX = M + W - metaW;
    write(bill.company.name, M, M, {
      size: 16,
      bold: true,
      width: W - metaW - 24,
      maxLines: 1,
    });
    if (bill.company.gstNo)
      write(`GSTIN ${bill.company.gstNo}`, M, M + 26, {
        size: 8.5,
        color: C.muted,
      });
    label(bill.company.gstNo ? 'Tax invoice' : 'Invoice', metaX, M, metaW);
    const meta: [string, string][] = [
      ['Invoice no.', bill.billNo],
      ['Date', formatBillDate(bill.issuedAt)],
    ];
    meta.forEach(([key, value], i) => {
      const my = M + 14 + i * 14;
      write(key, metaX, my, { size: 8.5, color: C.muted });
      write(value, metaX, my, {
        size: 8.5,
        bold: true,
        width: metaW,
        align: 'right',
      });
    });
    rule(M + 50);

    let y = M + 66;

    // ── Void banner ─────────────────────────────────────────────────────────
    if (bill.status === 'voided') {
      const reason = layout(bill.voidReason ?? '', {
        size: 8.5,
        width: W - 90,
        maxLines: 3,
      });
      const bannerH = Math.max(30, 16 + reason.length * 12.3);
      doc.roundedRect(M, y, W, bannerH, 6).fill(C.dangerSoft);
      write('VOID', M + 12, y + bannerH / 2 - 7, {
        size: 10,
        bold: true,
        color: C.danger,
        spacing: 2,
      });
      draw(reason, M + 72, y + 8, { size: 8.5, color: C.danger });
      y += bannerH + 16;
    }

    // ── Billed to · order details ───────────────────────────────────────────
    const colW = W / 2 - 12;
    const rightX = M + W / 2 + 12;
    label('Billed to', M, y);
    let ly = y + 13;
    ly += write(bill.vendor.name, M, ly, {
      size: 11,
      bold: true,
      width: colW,
      maxLines: 2,
    });
    ly += write(`+91 ${bill.vendor.phone}`, M, ly + 1, {
      size: 8.5,
      color: C.muted,
    });
    if (bill.vendor.address)
      ly += write(bill.vendor.address, M, ly + 1, {
        size: 8.5,
        color: C.muted,
        width: colW,
        maxLines: 2,
      });

    label('Order details', rightX, y);
    const status = STATUS[bill.status];
    const details: [string, string, string?][] = [
      ['Order no.', bill.orderNo],
      ['Status', status.label, status.ink],
      ['Balance due', rupees(bill.amountDue)],
    ];
    details.forEach(([key, value, color], i) => {
      const dy = y + 14 + i * 15;
      write(key, rightX, dy, { size: 8.5, color: C.muted });
      write(value, rightX, dy, {
        size: 8.5,
        bold: true,
        color,
        width: colW,
        align: 'right',
      });
    });
    y = Math.max(ly, y + 14 + details.length * 15) + 14;
    rule(y);
    y += 18;

    // ── Line items ──────────────────────────────────────────────────────────
    const cols = [
      { label: '#', x: M, w: 20, align: 'left' as const },
      {
        label: 'Description',
        x: M + 24,
        w: W - 24 - 252,
        align: 'left' as const,
      },
      { label: 'Qty', x: M + W - 242, w: 72, align: 'right' as const },
      { label: 'Rate (₹)', x: M + W - 162, w: 72, align: 'right' as const },
      { label: 'Amount (₹)', x: M + W - 80, w: 80, align: 'right' as const },
    ];
    const desc = cols[1]!;
    const nameStyle: TextStyle = {
      size: 9.5,
      bold: true,
      width: desc.w,
      maxLines: 3,
    };
    const optionStyle: TextStyle = {
      size: 7.5,
      color: C.muted,
      width: desc.w,
      maxLines: 2,
    };
    const cell = (s: Partial<TextStyle>, i: number): TextStyle => ({
      size: 9,
      width: cols[i]!.w,
      align: cols[i]!.align,
      maxLines: 1,
      ...s,
    });

    const tableHeader = (top: number) => {
      cols.forEach((c) =>
        write(c.label.toUpperCase(), c.x, top, {
          size: 7,
          bold: true,
          color: C.muted,
          spacing: 0.6,
          width: c.w,
          align: c.align,
        }),
      );
      rule(top + 16, C.rule);
      return top + 16;
    };

    y = tableHeader(y);
    bill.lines.forEach((line, index) => {
      const name = layout(line.service, nameStyle);
      const options = line.options ? layout(line.options, optionStyle) : [];
      const rowH =
        name.length * lineHeight(nameStyle) +
        options.length * lineHeight(optionStyle) +
        14;
      if (y + rowH > BOTTOM) {
        doc.addPage();
        y = tableHeader(M);
      }
      const ty = y + 7;
      write(
        String(index + 1),
        cols[0]!.x,
        ty + 0.5,
        cell({ color: C.faint }, 0),
      );
      const nameH = draw(name, desc.x, ty, nameStyle);
      draw(options, desc.x, ty + nameH, optionStyle);
      write(
        `${QTY.format(Number(line.qty))} ${line.unit}`,
        cols[2]!.x,
        ty + 0.5,
        cell({}, 2),
      );
      write(figure(line.rate), cols[3]!.x, ty + 0.5, cell({}, 3));
      write(figure(line.amount), cols[4]!.x, ty + 0.5, cell({ bold: true }, 4));
      y += rowH;
      rule(y);
    });

    // ── Totals on the right; words and payments on the left ────────────────
    const totalsW = 220;
    const totalsX = M + W - totalsW;
    const leftW = W - totalsW - 28;
    const wordsStyle: TextStyle = { size: 8.5, width: leftW, maxLines: 3 };
    const words = layout(amountInWords(bill.total), wordsStyle);
    const rows: [string, string][] = [
      ['Subtotal', figure(bill.subtotal)],
      ...(bill.gstAmount === null
        ? []
        : [['GST', figure(bill.gstAmount)] as [string, string]]),
    ];
    const hasPayments = bill.payments.length > 0;
    const totalsH = rows.length * 17 + 30 + (hasPayments ? 50 : 0);
    const leftH =
      14 +
      words.length * lineHeight(wordsStyle) +
      (hasPayments ? 30 + bill.payments.length * 15 : 0);
    y += 16;
    if (y + Math.max(totalsH, leftH) > BOTTOM) {
      doc.addPage();
      y = M;
    }

    let ty = y;
    rows.forEach(([key, value]) => {
      write(key, totalsX, ty, { size: 9, color: C.muted });
      write(value, totalsX, ty, { size: 9, width: totalsW, align: 'right' });
      ty += 17;
    });
    rule(ty, C.rule, totalsX, totalsW);
    ty += 8;
    write('Grand total', totalsX, ty, { size: 11, bold: true });
    write(rupees(bill.total), totalsX, ty, {
      size: 11,
      bold: true,
      width: totalsW,
      align: 'right',
    });
    ty += 22;
    if (hasPayments) {
      write('Paid', totalsX, ty, { size: 9, color: C.muted });
      write(`- ${rupees(bill.amountPaid)}`, totalsX, ty, {
        size: 9,
        color: C.muted,
        width: totalsW,
        align: 'right',
      });
      ty += 17;
      rule(ty, C.rule, totalsX, totalsW);
      ty += 8;
      write('Balance due', totalsX, ty, {
        size: 10,
        bold: true,
        color: status.ink,
      });
      write(rupees(bill.amountDue), totalsX, ty, {
        size: 10,
        bold: true,
        color: status.ink,
        width: totalsW,
        align: 'right',
      });
    }

    label('Amount in words', M, y);
    let py = y + 13 + draw(words, M, y + 13, wordsStyle);
    if (hasPayments) {
      py += 14;
      label('Payments received', M, py);
      py += 14;
      bill.payments.forEach((p) => {
        write(formatBillDate(p.paidAt), M, py, {
          size: 8.5,
          color: C.muted,
        });
        write(
          [METHODS[p.method] ?? p.method, p.account]
            .filter(Boolean)
            .join(' · '),
          M + 72,
          py,
          { size: 8.5, width: leftW - 72 - 84, maxLines: 1 },
        );
        write(rupees(p.amount), M + leftW - 80, py, {
          size: 8.5,
          bold: true,
          width: 80,
          align: 'right',
        });
        py += 15;
      });
    }

    // ── Every page: footer, and the void watermark ──────────────────────────
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i += 1) {
      doc.switchToPage(i);
      // A voided bill must not pass for one that is owed.
      if (bill.status === 'voided') {
        doc
          .save()
          .rotate(-30, { origin: [PAGE.w / 2, PAGE.h / 2] })
          .opacity(0.1);
        const mark = { size: 140, bold: true, color: C.danger, spacing: 8 };
        write(
          'VOID',
          (PAGE.w - measure('VOID', mark)) / 2,
          PAGE.h / 2 - 90,
          mark,
        );
        doc.restore();
      }
      rule(PAGE.h - M - 14);
      write('This is a computer-generated invoice.', M, PAGE.h - M - 8, {
        size: 7.5,
        color: C.faint,
      });
      if (count > 1)
        write(`Page ${i - start + 1} of ${count}`, M, PAGE.h - M - 8, {
          size: 7.5,
          color: C.faint,
          width: W,
          align: 'right',
        });
    }

    doc.end();
  });
