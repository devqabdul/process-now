import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import type { AxiosResponse } from 'axios';

import {
  type ApiEnvelope,
  fetchAllPages,
  isSuccess,
  MAX_PAGE_SIZE,
  type NormalizedError,
  safeApiError,
  usePagedList,
} from '@api/process-backend';
import { billsKeys } from '@api/process-backend/billing';
import { dashboardKeys } from '@api/process-backend/dashboard';
import {
  cancelOrder,
  createOrder,
  getOrders,
  type Order,
  type OrderStatus,
  ordersKeys,
  returnOrder,
  startOrder,
} from '@api/process-backend/orders';
import { type ServiceType, serviceTypesKeys } from '@api/process-backend/service-types';
import { useVendors, type Vendor, vendorsKeys } from '@api/process-backend/vendors';
import {
  fromOptionKey,
  type NewOrderField,
  type NewOrderFormInput,
  type NewOrderSaveResult,
} from '@components/sections/orders/new-order-dialog';
import { buildOrderColumns } from '@components/sections/orders/orders-table';
import type { ReturnQuantities } from '@components/sections/orders/return-order-dialog';
import type { PickerColumn } from '@components/ui/column-picker';
import {
  type ColumnVisibilityState,
  type DataTableColumn,
  exportRows,
  pickerColumns,
  type SortingState,
} from '@components/ui/data-table';
import type { FilterOption } from '@components/ui/filter-chip';
import { useCsvExport } from '@hooks/use-csv-export';
import { useListParams } from '@hooks/use-list-params';
import { useMediaQuery } from '@hooks/use-media-query';
import { usePersistedState } from '@hooks/use-persisted-state';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'received',
  'processing',
  'returned',
  'cancelled',
];
const SORT_KEYS = ['receivedAt', 'orderNo', 'vendor'];

// The API says `items.0.selectedOptions`; the form calls that list `options`.
const toNewOrderField = (key: string) => key.replace(/\.selectedOptions$/, '.options');
const isNewOrderField = (key: string): key is NewOrderField =>
  /^(vendorId|notes|items\.\d+\.(serviceTypeId|qtyIn|options))$/.test(key);

const toNewOrderError = (err: NormalizedError) =>
  err.error_type === 'network'
    ? 'Unable to save this order. Check your connection and try again.'
    : (err.message ?? 'Unable to save this order right now. Try again in a moment.');

// No prices: the server works them out from the service type.
const toOrderPayload = (values: NewOrderFormInput) => ({
  vendorId: values.vendorId,
  ...(values.notes.trim() && { notes: values.notes.trim() }),
  items: values.items.map((item) => ({
    serviceTypeId: item.serviceTypeId,
    selectedOptions: item.options.map(fromOptionKey),
    qtyIn: Number(item.qtyIn),
  })),
});

export interface UseOrdersListPageResult {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sorting: SortingState;
  statuses: OrderStatus[];
  vendorIds: string[];
  vendorOptions: FilterOption[];
  hasFilters: boolean;
  // Chips holding a value, for the phone Filters badge.
  activeFilters: number;
  columns: DataTableColumn<Order>[];
  columnVisibility: ColumnVisibilityState;
  pickerColumns: PickerColumn[];
  showTable: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  exportError: string | null;
  returnTarget: Order | null;
  cancelTarget: Order | null;
  isSubmitting: boolean;
  actionError: string | null;
  saved: string | null;
  creating: boolean;
  activeVendors: Vendor[];
  serviceTypes: ServiceType[];
  isLoadingNew: boolean;
  openNew: () => void;
  closeNew: () => void;
  saveNew: (values: NewOrderFormInput) => Promise<NewOrderSaveResult>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setQ: (q: string) => void;
  setSorting: (sorting: SortingState) => void;
  setStatuses: (statuses: string[]) => void;
  setVendor: (selected: string[]) => void;
  clearFilters: () => void;
  setColumnVisibility: (visibility: ColumnVisibilityState) => void;
  toggleColumn: (id: string, visible: boolean) => void;
  loadMore: () => void;
  exportCsv: () => Promise<void>;
  start: (order: Order) => void;
  openReturn: (order: Order) => void;
  closeReturn: () => void;
  confirmReturn: (quantities: ReturnQuantities) => void;
  openCancel: (order: Order) => void;
  closeCancel: () => void;
  confirmCancel: (reason: string) => void;
  dismissSaved: () => void;
  retry: () => void;
}

export const useOrdersListPage = (): UseOrdersListPageResult => {
  // state
  const [returnTarget, setReturnTarget] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = usePersistedState<ColumnVisibilityState>(
    'pn.table.orders.columns',
    {},
  );

  // wiring
  // In the URL, so the phone's "+ New" button and any link can open the drawer.
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const list = useListParams(SORT_KEYS, '-receivedAt');
  const statuses = list.getAll('status', ORDER_STATUSES);
  const vendorIds = list.getIds('vendorId');
  const filters = {
    ...(list.q ? { q: list.q } : {}),
    ...(list.apiSort && { sort: list.apiSort }),
    ...(statuses.length > 0 ? { status: statuses } : {}),
    ...(vendorIds.length > 0 ? { vendorId: vendorIds } : {}),
  };
  // Tailwind's lg: below it the rows read better as cards that load more.
  const showTable = useMediaQuery('(min-width: 64rem)');
  const rows = usePagedList(
    ordersKeys,
    { ...filters, page: list.page, pageSize: list.pageSize },
    showTable,
    list.setPage,
  );
  // ponytail: the vendor filter offers the first 100 by name; past that, search by vendor instead.
  const { data: vendors, isPending: vendorsPending } = useVendors({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    sort: 'name',
  });
  const creating = searchParams.has('new');
  // ponytail: the first 100 by name; a shop past that needs a searchable picker.
  const types = useQuery({
    ...serviceTypesKeys.list({ page: 1, pageSize: MAX_PAGE_SIZE, sort: 'name' }),
    enabled: creating,
  });
  const { exportError, runExport } = useCsvExport('orders');

  // derived
  // Retired vendors and inactive services take no new orders.
  const activeVendors = (vendors?.items ?? []).filter((vendor) => vendor.isActive);
  const serviceTypes = (types.data?.items ?? []).filter((type) => type.isActive);
  const vendorOptions = (vendors?.items ?? []).map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));
  const activeFilters = Number(statuses.length > 0) + Number(vendorIds.length > 0);
  const hasFilters = !!list.q || activeFilters > 0;

  // callbacks
  const setCreating = (open: boolean) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (open) next.set('new', '1');
        else next.delete('new');
        return next;
      },
      { replace: !open },
    );

  const saveNew = async (values: NewOrderFormInput): Promise<NewOrderSaveResult> => {
    try {
      const response = await createOrder(toOrderPayload(values));
      if (!isSuccess(response.data)) return { ok: false, message: 'Unable to save this order.' };
      await refresh();
      const order = response.data.data;
      setCreating(false);
      setSaved(`Order ${order.orderNo} taken in from ${order.vendor.name}.`);
      return { ok: true };
    } catch (error) {
      let result: NewOrderSaveResult = { ok: false };
      safeApiError(error, {
        context: { page: 'orders', action: 'createOrder' },
        onError: (err) => {
          const fields = Object.fromEntries(
            Object.entries(err.fields ?? {})
              .map(([key, message]) => [toNewOrderField(key), message] as const)
              .filter(([key]) => isNewOrderField(key)),
          );
          result = { ok: false, fields, message: toNewOrderError(err) };
        },
      });
      return result;
    }
  };

  /** Returning raises a bill and moves money, so the dashboard and bills go stale with it. */
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ordersKeys.all }),
      queryClient.invalidateQueries({ queryKey: billsKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: [...vendorsKeys.all, 'statement'] }),
    ]);
  };

  /** Start, return and cancel differ only in the call and the sentence they leave behind. */
  const run = async (action: () => Promise<AxiosResponse<ApiEnvelope<Order>>>, done: string) => {
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
        context: { page: 'orders', action: 'orderTransition' },
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

  const confirmReturn = async (quantities: ReturnQuantities) => {
    if (!returnTarget) return;
    const ok = await run(
      () =>
        returnOrder(returnTarget.id, {
          items: returnTarget.items.map((item) => ({
            orderItemId: item.id,
            qtyOut: Number(quantities[item.id] ?? item.qtyIn),
          })),
        }),
      `${returnTarget.orderNo} returned to ${returnTarget.vendor.name}. Its bill is ready.`,
    );
    if (ok) setReturnTarget(null);
  };

  const confirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    const ok = await run(
      () => cancelOrder(cancelTarget.id, reason),
      `${cancelTarget.orderNo} is cancelled. It stays on the list for the record.`,
    );
    if (ok) setCancelTarget(null);
  };

  const start = (order: Order) =>
    void run(() => startOrder(order.id), `${order.orderNo} is now processing.`);

  const openReturn = (order: Order) => {
    setActionError(null);
    setSaved(null);
    setReturnTarget(order);
  };

  const openCancel = (order: Order) => {
    setActionError(null);
    setSaved(null);
    setCancelTarget(order);
  };

  const columns = buildOrderColumns({ onStart: start, onReturn: openReturn, onCancel: openCancel });

  const exportCsv = () =>
    runExport(async () => exportRows(columns, await fetchAllPages(getOrders, filters)));

  return {
    orders: rows.items,
    total: rows.total,
    page: list.page,
    pageSize: list.pageSize,
    q: list.q,
    sorting: list.sorting,
    statuses,
    vendorIds,
    vendorOptions,
    hasFilters,
    activeFilters,
    columns,
    columnVisibility,
    pickerColumns: pickerColumns(columns, columnVisibility),
    showTable,
    isLoading: rows.isLoading,
    isRefreshing: rows.isRefreshing,
    isLoadingMore: rows.isLoadingMore,
    isError: rows.isError,
    exportError,
    returnTarget,
    cancelTarget,
    isSubmitting,
    actionError,
    saved,
    creating,
    activeVendors,
    serviceTypes,
    isLoadingNew: vendorsPending || types.isPending,
    openNew: () => {
      setSaved(null);
      setCreating(true);
    },
    closeNew: () => setCreating(false),
    saveNew,
    setPage: list.setPage,
    setPageSize: list.setPageSize,
    setQ: list.setQ,
    setSorting: list.setSorting,
    setStatuses: (next) => list.update({ status: next }),
    setVendor: (selected) => list.update({ vendorId: selected }),
    clearFilters: () => list.update({ q: undefined, status: undefined, vendorId: undefined }),
    setColumnVisibility,
    toggleColumn: (id, visible) =>
      setColumnVisibility((previous) => ({ ...previous, [id]: visible })),
    loadMore: rows.loadMore,
    exportCsv,
    start,
    openReturn,
    closeReturn: () => setReturnTarget(null),
    confirmReturn: (quantities) => void confirmReturn(quantities),
    openCancel,
    closeCancel: () => setCancelTarget(null),
    confirmCancel: (reason) => void confirmCancel(reason),
    dismissSaved: () => setSaved(null),
    retry: rows.retry,
  };
};
