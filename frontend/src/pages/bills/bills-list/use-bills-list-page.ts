import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { AxiosResponse } from 'axios';

import {
  type ApiEnvelope,
  fetchAllPages,
  isSuccess,
  safeApiError,
  usePagedList,
} from '@api/process-backend';
import {
  type BankAccount,
  bankAccountsKeys,
  useBankAccounts,
} from '@api/process-backend/bank-accounts';
import {
  type Bill,
  type BillDetail,
  billsKeys,
  type BillStatus,
  getBillPdf,
  getBills,
  recordPayment,
  voidBill,
} from '@api/process-backend/billing';
import { dashboardKeys } from '@api/process-backend/dashboard';
import { ordersKeys } from '@api/process-backend/orders';
import { vendorsKeys } from '@api/process-backend/vendors';
import { buildBillColumns } from '@components/sections/bills/bills-table';
import type { PaymentInput } from '@components/sections/bills/record-payment-dialog';
import type { PickerColumn } from '@components/ui/column-picker';
import {
  type ColumnVisibilityState,
  type DataTableColumn,
  exportRows,
  pickerColumns,
  type SortingState,
} from '@components/ui/data-table';
import { useCsvExport } from '@hooks/use-csv-export';
import { useListParams } from '@hooks/use-list-params';
import { useMediaQuery } from '@hooks/use-media-query';
import { usePersistedState } from '@hooks/use-persisted-state';
import { base64ToFile, downloadBlob } from '@utils/file';
import { formatMoney } from '@utils/format/money';

export interface ReadyShare {
  billNo: string;
  file: File;
  text: string;
}

/** What a vendor reads above the attached bill, or alone in the chat when the file can't attach. */
const shareMessage = (bill: Bill) =>
  [
    `Bill ${bill.billNo} for order ${bill.order.orderNo}`,
    `Total ${formatMoney(bill.total)}`,
    bill.status === 'due' ? `Due ${formatMoney(bill.amountDue)}` : 'Paid in full — thank you',
  ].join('\n');

// WhatsApp wants the number with its country code; vendors are stored as 10 Indian digits.
const whatsAppLink = (phone: string, text: string) =>
  `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;

export const BILL_STATUSES: readonly BillStatus[] = ['due', 'paid', 'voided'];
const SORT_KEYS = ['issuedAt', 'billNo', 'total'];

export interface UseBillsListPageResult {
  bills: Bill[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sorting: SortingState;
  statuses: BillStatus[];
  hasFilters: boolean;
  columns: DataTableColumn<Bill>[];
  columnVisibility: ColumnVisibilityState;
  pickerColumns: PickerColumn[];
  accounts: BankAccount[];
  showTable: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  exportError: string | null;
  fileError: string | null;
  readyToShare: ReadyShare | null;
  confirmShare: () => void;
  cancelShare: () => void;
  payTarget: Bill | null;
  voidTarget: Bill | null;
  isSubmitting: boolean;
  actionError: string | null;
  saved: string | null;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setQ: (q: string) => void;
  setSorting: (sorting: SortingState) => void;
  setStatuses: (statuses: string[]) => void;
  clearFilters: () => void;
  setColumnVisibility: (visibility: ColumnVisibilityState) => void;
  toggleColumn: (id: string, visible: boolean) => void;
  loadMore: () => void;
  exportCsv: () => Promise<void>;
  openPay: (bill: Bill) => void;
  closePay: () => void;
  confirmPay: (payment: PaymentInput) => void;
  openVoid: (bill: Bill) => void;
  closeVoid: () => void;
  confirmVoid: (reason: string) => void;
  downloadPdf: (bill: Bill) => void;
  sharePdf: (bill: Bill) => void;
  dismissSaved: () => void;
  retry: () => void;
}

export const useBillsListPage = (): UseBillsListPageResult => {
  // state
  const [payTarget, setPayTarget] = useState<Bill | null>(null);
  const [voidTarget, setVoidTarget] = useState<Bill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [readyToShare, setReadyToShare] = useState<ReadyShare | null>(null);
  const [columnVisibility, setColumnVisibility] = usePersistedState<ColumnVisibilityState>(
    'pn.table.bills.columns',
    {},
  );

  // wiring
  const queryClient = useQueryClient();
  const list = useListParams(SORT_KEYS, '-issuedAt');
  const statuses = list.getAll('status', BILL_STATUSES);
  const filters = {
    ...(list.q ? { q: list.q } : {}),
    ...(list.apiSort && { sort: list.apiSort }),
    ...(statuses.length > 0 ? { status: statuses } : {}),
  };
  // Tailwind's lg: below it the rows read better as cards that load more.
  const showTable = useMediaQuery('(min-width: 64rem)');
  const rows = usePagedList(
    billsKeys,
    { ...filters, page: list.page, pageSize: list.pageSize },
    showTable,
    list.setPage,
  );
  const { data: allAccounts = [] } = useBankAccounts();
  const { exportError, runExport } = useCsvExport('bills');

  // derived
  const hasFilters = !!list.q || statuses.length > 0;
  const accounts = allAccounts.filter((account) => account.isActive !== false);

  // callbacks
  /** Generated by the API on request, so it always shows the payments made so far. */
  const fetchPdf = async (bill: Bill) => {
    setFileError(null);
    setSaved(null);
    try {
      const response = await getBillPdf(bill.id);
      if (!isSuccess(response.data)) {
        setFileError(`Couldn't prepare ${bill.billNo}. Try again in a moment.`);
        return null;
      }
      const pdf = response.data.data;
      return { ...pdf, file: base64ToFile(pdf.base64, pdf.fileName, pdf.contentType) };
    } catch (error) {
      safeApiError(error, {
        context: { page: 'bills', action: 'billPdf' },
        onError: (err) =>
          setFileError(
            err.error_type === 'network'
              ? `Couldn't prepare ${bill.billNo}. Check your connection and try again.`
              : (err.message ?? `Couldn't prepare ${bill.billNo}.`),
          ),
      });
      return null;
    }
  };

  const downloadPdf = async (bill: Bill) => {
    const pdf = await fetchPdf(bill);
    if (!pdf) return;
    downloadBlob(pdf.fileName, pdf.file);
    setSaved(`${pdf.fileName} downloaded.`);
  };

  const share = async (ready: ReadyShare) => {
    try {
      await navigator.share({
        files: [ready.file],
        title: `Bill ${ready.billNo}`,
        text: ready.text,
      });
      setReadyToShare(null);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      // Closing the share sheet is a choice, not a failure.
      if (name === 'AbortError') setReadyToShare(null);
      // Safari lets a page share only straight after a tap, and the fetch outlived it: ask for one.
      else if (name === 'NotAllowedError') setReadyToShare(ready);
      else {
        setReadyToShare(null);
        setFileError(`Couldn't share ${ready.billNo}. Download it and send it instead.`);
      }
    }
  };

  /**
   * Phones hand the PDF itself to the share sheet, WhatsApp included. Where files can't be
   * shared (most desktops) it is downloaded and WhatsApp opens on the vendor's chat to attach it.
   */
  const sharePdf = async (bill: Bill) => {
    // Asked with a stand-in file, so the WhatsApp tab can open before the fetch: a popup opened
    // after an await is blocked as unrequested.
    const canShareFiles =
      navigator.canShare?.({ files: [new File([], 'bill.pdf', { type: 'application/pdf' })] }) ??
      false;
    const chat = canShareFiles ? null : window.open('', '_blank');
    const pdf = await fetchPdf(bill);
    if (!pdf) {
      chat?.close();
      return;
    }
    const text = shareMessage(bill);
    if (canShareFiles) {
      await share({ billNo: bill.billNo, file: pdf.file, text });
      return;
    }
    downloadBlob(pdf.fileName, pdf.file);
    const link = whatsAppLink(pdf.vendor.phone, text);
    if (chat) chat.location.href = link;
    else window.open(link, '_blank', 'noopener');
    setSaved(
      `${pdf.fileName} downloaded — attach it in the WhatsApp chat with ${pdf.vendor.name}.`,
    );
  };

  // A payment lands in an account and the dashboard's amount to collect; orders show the bill.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: billsKeys.all }),
      queryClient.invalidateQueries({ queryKey: bankAccountsKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: ordersKeys.all }),
      queryClient.invalidateQueries({ queryKey: [...vendorsKeys.all, 'statement'] }),
    ]);

  const run = async (
    action: () => Promise<AxiosResponse<ApiEnvelope<BillDetail>>>,
    done: string,
  ) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const response = await action();
      if (!isSuccess(response.data)) {
        setActionError('That did not go through. Try again in a moment.');
        return false;
      }
      await refresh();
      setSaved(done);
      return true;
    } catch (error) {
      safeApiError(error, {
        context: { page: 'bills', action: 'billAction' },
        onError: (err) => {
          setActionError(
            Object.values(err.fields ?? {})[0] ?? err.message ?? 'That did not go through.',
          );
        },
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmPay = async ({ amount, method, bankAccountId }: PaymentInput) => {
    if (!payTarget) return;
    const ok = await run(
      () =>
        recordPayment(payTarget.id, {
          amount: Number(amount),
          method,
          ...(bankAccountId && { bankAccountId }),
        }),
      `${formatMoney(amount)} recorded against ${payTarget.billNo}.`,
    );
    if (ok) setPayTarget(null);
  };

  const confirmVoid = async (reason: string) => {
    if (!voidTarget) return;
    const ok = await run(
      () => voidBill(voidTarget.id, reason),
      `${voidTarget.billNo} is voided. It stays on the list for the record.`,
    );
    if (ok) setVoidTarget(null);
  };

  const openPay = (bill: Bill) => {
    setActionError(null);
    setSaved(null);
    setPayTarget(bill);
  };

  const openVoid = (bill: Bill) => {
    setActionError(null);
    setSaved(null);
    setVoidTarget(bill);
  };

  const columns = buildBillColumns({
    onPay: openPay,
    onVoid: openVoid,
    onDownload: (bill) => void downloadPdf(bill),
    onShare: (bill) => void sharePdf(bill),
  });

  const exportCsv = () =>
    runExport(async () => exportRows(columns, await fetchAllPages(getBills, filters)));

  return {
    bills: rows.items,
    total: rows.total,
    page: list.page,
    pageSize: list.pageSize,
    q: list.q,
    sorting: list.sorting,
    statuses,
    hasFilters,
    columns,
    columnVisibility,
    pickerColumns: pickerColumns(columns, columnVisibility),
    accounts,
    showTable,
    isLoading: rows.isLoading,
    isRefreshing: rows.isRefreshing,
    isLoadingMore: rows.isLoadingMore,
    isError: rows.isError,
    exportError,
    fileError,
    readyToShare,
    confirmShare: () => {
      if (readyToShare) void share(readyToShare);
    },
    cancelShare: () => setReadyToShare(null),
    payTarget,
    voidTarget,
    isSubmitting,
    actionError,
    saved,
    setPage: list.setPage,
    setPageSize: list.setPageSize,
    setQ: list.setQ,
    setSorting: list.setSorting,
    setStatuses: (next) => list.update({ status: next }),
    clearFilters: () => list.update({ q: undefined, status: undefined }),
    setColumnVisibility,
    toggleColumn: (id, visible) =>
      setColumnVisibility((previous) => ({ ...previous, [id]: visible })),
    loadMore: rows.loadMore,
    exportCsv,
    openPay,
    closePay: () => setPayTarget(null),
    confirmPay: (payment) => void confirmPay(payment),
    openVoid,
    closeVoid: () => setVoidTarget(null),
    confirmVoid: (reason) => void confirmVoid(reason),
    downloadPdf: (bill) => void downloadPdf(bill),
    sharePdf: (bill) => void sharePdf(bill),
    dismissSaved: () => setSaved(null),
    retry: rows.retry,
  };
};
