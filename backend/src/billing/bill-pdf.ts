import PDFDocument from 'pdfkit';
import { ToWords } from 'to-words';
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

// The built-in PDF fonts have no ₹ glyph: headers say "Rs." and cells carry plain figures.
const FIGURE = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const figure = (amount: string) => FIGURE.format(Number(amount));
const rupees = (amount: string) => `Rs. ${figure(amount)}`;
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

// Same wording as the app's amount-in-words line, so the bill reads like the screen.
const WORDS = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    doNotAddOnly: true,
    currencyOptions: {
      name: 'Rupee',
      plural: 'Rupees',
      symbol: '₹',
      fractionalUnit: { name: 'Paisa', plural: 'Paise', symbol: '' },
    },
  },
});

// The app's palette (tailwind.css, light theme).
const C = {
  brand: '#111417',
  brandMuted: '#8b93a1',
  accent: '#2a9d8f',
  accentSoft: '#e2f4f0',
  accentInk: '#14675c',
  ink: '#1f2328',
  muted: '#6b7280',
  faint: '#9aa1ab',
  line: '#e5e7eb',
  panel: '#f6f7f9',
  zebra: '#fafbfc',
  warning: '#985311',
  warningSoft: '#fdeedd',
  danger: '#c73a3f',
  dangerSoft: '#feecec',
};

const STATUS = {
  due: { label: 'PAYMENT DUE', ink: C.warning, fill: C.warningSoft },
  paid: { label: 'PAID IN FULL', ink: C.accentInk, fill: C.accentSoft },
  voided: { label: 'VOIDED', ink: C.danger, fill: C.dangerSoft },
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
const BOTTOM = PAGE.h - M - 28;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('') || '?';

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

    const label = (
      text: string,
      x: number,
      y: number,
      width?: number,
      align?: 'right',
    ) =>
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(C.faint)
        .text(text.toUpperCase(), x, y, {
          width,
          align,
          characterSpacing: 0.8,
        });

    // ── Header band ─────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE.w, 118).fill(C.brand);
    doc.roundedRect(M, 34, 46, 46, 10).fill(C.accent);
    doc
      .font('Helvetica-Bold')
      .fontSize(17)
      .fillColor('#ffffff')
      .text(initials(bill.company.name), M, 49, { width: 46, align: 'center' });
    doc.fontSize(19).text(bill.company.name, M + 60, 38, { width: W / 2 });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.brandMuted)
      .text(
        bill.company.gstNo
          ? `GSTIN  ${bill.company.gstNo}`
          : 'Job-work invoice',
        M + 60,
        64,
      );

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.brandMuted)
      .text(bill.company.gstNo ? 'TAX INVOICE' : 'INVOICE', M, 36, {
        width: W,
        align: 'right',
        characterSpacing: 2,
      })
      .fontSize(22)
      .fillColor('#ffffff')
      .text(bill.billNo, M, 50, { width: W, align: 'right' })
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.brandMuted)
      .text(`Issued ${formatBillDate(bill.issuedAt)}`, M, 78, {
        width: W,
        align: 'right',
      });

    // ── Status pill ─────────────────────────────────────────────────────────
    const status = STATUS[bill.status];
    doc.font('Helvetica-Bold').fontSize(7.5);
    const pillW = doc.widthOfString(status.label, { characterSpacing: 1 }) + 20;
    doc.roundedRect(PAGE.w - M - pillW, 132, pillW, 18, 9).fill(status.fill);
    doc.fillColor(status.ink).text(status.label, PAGE.w - M - pillW, 137.5, {
      width: pillW,
      align: 'center',
      characterSpacing: 1,
    });

    // ── Info panels: billed to · details · amount due ──────────────────────
    const top = 162;
    const gap = 10;
    const panelW = (W - gap * 2) / 3;
    const panelH = 86;
    const panels = [0, 1, 2].map((i) => M + i * (panelW + gap));
    doc.roundedRect(panels[0]!, top, panelW, panelH, 8).fill(C.panel);
    doc.roundedRect(panels[1]!, top, panelW, panelH, 8).fill(C.panel);
    doc.roundedRect(panels[2]!, top, panelW, panelH, 8).fill(C.brand);

    const pad = 12;
    label('Billed to', panels[0]! + pad, top + pad);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.ink)
      .text(bill.vendor.name, panels[0]! + pad, top + pad + 12, {
        width: panelW - pad * 2,
        height: 14,
        ellipsis: true,
      })
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.muted)
      .text(`+91 ${bill.vendor.phone}`, { width: panelW - pad * 2 });
    if (bill.vendor.address)
      doc.text(bill.vendor.address, {
        width: panelW - pad * 2,
        height: 22,
        ellipsis: true,
      });

    label('Details', panels[1]! + pad, top + pad);
    const details: [string, string][] = [
      ['Bill no.', bill.billNo],
      ['Order no.', bill.orderNo],
      ['Issued on', formatBillDate(bill.issuedAt)],
    ];
    details.forEach(([key, value], i) => {
      const y = top + pad + 14 + i * 16;
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.muted)
        .text(key, panels[1]! + pad, y)
        .font('Helvetica-Bold')
        .fillColor(C.ink)
        .text(value, panels[1]! + pad, y, {
          width: panelW - pad * 2,
          align: 'right',
        });
    });

    label(
      bill.status === 'voided' ? 'Nothing due' : 'Amount due',
      panels[2]! + pad,
      top + pad,
    );
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(C.brandMuted)
      .text('Rs.', panels[2]! + pad, top + pad + 20)
      .fontSize(20)
      .fillColor('#ffffff')
      .text(figure(bill.amountDue), panels[2]! + pad, top + pad + 30, {
        width: panelW - pad * 2,
      })
      .font('Helvetica')
      .fontSize(8)
      .fillColor(C.brandMuted)
      .text(
        `of ${rupees(bill.total)} billed`,
        panels[2]! + pad,
        top + panelH - pad - 9,
      );

    // ── Line items ──────────────────────────────────────────────────────────
    const cols = [
      { label: '#', x: M + 10, w: 18, align: 'left' as const },
      { label: 'Service', x: M + 32, w: W - 32 - 268, align: 'left' as const },
      { label: 'Qty', x: M + W - 262, w: 80, align: 'right' as const },
      { label: 'Rate (Rs.)', x: M + W - 176, w: 76, align: 'right' as const },
      { label: 'Amount (Rs.)', x: M + W - 94, w: 84, align: 'right' as const },
    ];
    const serviceW = cols[1]!.w;

    const tableHeader = (y: number) => {
      doc.roundedRect(M, y, W, 24, 6).fill(C.brand);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
      cols.forEach((c) =>
        doc.text(c.label.toUpperCase(), c.x, y + 8.5, {
          width: c.w,
          align: c.align,
          characterSpacing: 0.6,
        }),
      );
      return y + 24;
    };

    let y = tableHeader(top + panelH + 22);
    bill.lines.forEach((line, index) => {
      doc.font('Helvetica-Bold').fontSize(9.5);
      const nameH = doc.heightOfString(line.service, { width: serviceW });
      doc.font('Helvetica').fontSize(7.5);
      const optionsH = line.options
        ? doc.heightOfString(line.options, { width: serviceW }) + 3
        : 0;
      const rowH = Math.max(28, nameH + optionsH + 16);

      if (y + rowH > BOTTOM) {
        doc.addPage();
        y = tableHeader(M);
      }
      if (index % 2 === 1) doc.rect(M, y, W, rowH).fill(C.zebra);
      doc
        .moveTo(M, y + rowH)
        .lineTo(M + W, y + rowH)
        .lineWidth(0.6)
        .strokeColor(C.line)
        .stroke();

      const textY = y + 8;
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(C.faint)
        .text(String(index + 1).padStart(2, '0'), cols[0]!.x, textY + 0.5, {
          width: cols[0]!.w,
        })
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(C.ink)
        .text(line.service, cols[1]!.x, textY, { width: serviceW });
      if (line.options)
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(C.muted)
          .text(line.options, cols[1]!.x, textY + nameH + 3, {
            width: serviceW,
          });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(C.ink)
        .text(
          `${QTY.format(Number(line.qty))} ${line.unit}`,
          cols[2]!.x,
          textY + 0.5,
          {
            width: cols[2]!.w,
            align: 'right',
          },
        )
        .text(figure(line.rate), cols[3]!.x, textY + 0.5, {
          width: cols[3]!.w,
          align: 'right',
        })
        .font('Helvetica-Bold')
        .text(figure(line.amount), cols[4]!.x, textY + 0.5, {
          width: cols[4]!.w,
          align: 'right',
        });
      y += rowH;
    });

    // ── Summary: words + payments on the left, totals on the right ─────────
    const totalsW = 210;
    const totalsX = M + W - totalsW;
    const leftW = W - totalsW - 20;
    const totals: [string, string][] = [
      ['Subtotal', figure(bill.subtotal)],
      ...(bill.gstAmount === null
        ? []
        : [['GST', figure(bill.gstAmount)] as [string, string]]),
    ];
    const paymentsH = bill.payments.length ? 30 + bill.payments.length * 16 : 0;
    const summaryH = Math.max(40 + totals.length * 17 + 84, 70 + paymentsH);
    if (y + 18 + summaryH > BOTTOM) {
      doc.addPage();
      y = M;
    } else {
      y += 18;
    }

    let ty = y;
    totals.forEach(([key, value]) => {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(C.muted)
        .text(key, totalsX, ty)
        .fillColor(C.ink)
        .text(value, totalsX, ty, { width: totalsW, align: 'right' });
      ty += 17;
    });
    doc
      .moveTo(totalsX, ty)
      .lineTo(totalsX + totalsW, ty)
      .lineWidth(0.8)
      .strokeColor(C.line)
      .stroke();
    ty += 8;
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(C.ink)
      .text('Total', totalsX, ty)
      .text(rupees(bill.total), totalsX, ty, {
        width: totalsW,
        align: 'right',
      });
    ty += 20;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(C.muted)
      .text('Paid', totalsX, ty)
      .text(`- ${figure(bill.amountPaid)}`, totalsX, ty, {
        width: totalsW,
        align: 'right',
      });
    ty += 18;
    doc.roundedRect(totalsX - 10, ty, totalsW + 10, 32, 8).fill(status.fill);
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(status.ink)
      .text('Amount due', totalsX, ty + 11)
      .fontSize(12)
      .text(rupees(bill.amountDue), totalsX, ty + 10, {
        width: totalsW - 8,
        align: 'right',
      });

    label('Amount in words', M, y);
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(C.ink)
      .text(`${WORDS.convert(Number(bill.total))} only`, M, y + 11, {
        width: leftW,
      });

    if (bill.payments.length) {
      let py = doc.y + 16;
      label('Payments received', M, py);
      py += 13;
      bill.payments.forEach((p) => {
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(C.muted)
          .text(formatBillDate(p.paidAt), M, py, { width: 72 })
          .fillColor(C.ink)
          .text(
            [METHODS[p.method] ?? p.method, p.account]
              .filter(Boolean)
              .join(' · '),
            M + 76,
            py,
            { width: leftW - 76 - 80, height: 11, ellipsis: true },
          )
          .font('Helvetica-Bold')
          .text(figure(p.amount), M + leftW - 80, py, {
            width: 80,
            align: 'right',
          });
        py += 16;
      });
    }

    if (bill.status === 'voided' && bill.voidReason) {
      label('Voided', M, doc.y + 14);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.danger)
        .text(bill.voidReason, { width: leftW });
    }

    // ── Sign-off ────────────────────────────────────────────────────────────
    const signY = Math.max(ty + 70, doc.y + 40);
    if (signY + 40 < BOTTOM) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(C.ink)
        .text('Thank you for your business.', M, signY + 14)
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C.muted)
        .text('Please quote the bill number with your payment.', M, signY + 28);
      doc
        .moveTo(totalsX, signY + 22)
        .lineTo(totalsX + totalsW, signY + 22)
        .lineWidth(0.8)
        .strokeColor(C.faint)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(C.ink)
        .text(`For ${bill.company.name}`, totalsX, signY + 27, {
          width: totalsW,
          align: 'right',
        })
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C.muted)
        .text('Authorised signatory', totalsX, signY + 39, {
          width: totalsW,
          align: 'right',
        });
    }

    // ── Every page: footer, and the void stamp ──────────────────────────────
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i += 1) {
      doc.switchToPage(i);
      // The footer sits in the bottom margin; pdfkit would start a new page for it otherwise.
      doc.page.margins.bottom = 0;
      // A voided bill must not pass for one that is owed.
      if (bill.status === 'voided')
        doc
          .save()
          .rotate(-30, { origin: [PAGE.w / 2, PAGE.h / 2] })
          .font('Helvetica-Bold')
          .fontSize(110)
          .fillColor(C.danger)
          .opacity(0.12)
          .text('VOIDED', 0, PAGE.h / 2 - 55, {
            width: PAGE.w,
            align: 'center',
            lineBreak: false,
          })
          .restore();
      doc
        .moveTo(M, PAGE.h - M - 14)
        .lineTo(M + W, PAGE.h - M - 14)
        .lineWidth(0.6)
        .strokeColor(C.line)
        .stroke()
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C.faint)
        .opacity(1)
        .text(`${bill.company.name} · Bill ${bill.billNo}`, M, PAGE.h - M - 6, {
          width: W / 2,
          lineBreak: false,
        })
        .text(
          `Page ${i - start + 1} of ${count} · Made with ProcessNow`,
          M + W / 2,
          PAGE.h - M - 6,
          {
            width: W / 2,
            align: 'right',
            lineBreak: false,
          },
        );
    }

    doc.end();
  });
