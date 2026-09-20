import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { AxiosResponse } from 'axios';

import { type ApiEnvelope, isSuccess, safeApiError } from '@api/process-backend';
import { billsKeys } from '@api/process-backend/billing';
import { dashboardKeys } from '@api/process-backend/dashboard';
import {
  cancelOrder,
  type Order,
  type OrderStatus,
  ordersKeys,
  returnOrder,
  startOrder,
  useOrders,
} from '@api/process-backend/orders';
import type { ReturnQuantities } from '@components/sections/orders/return-order-dialog';
import { useMediaQuery } from '@hooks/use-media-query';

// Long enough that typing an order number doesn't fire a request per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

export const STATUS_FILTERS = [
  { value: '', label: 'All open' },
  { value: 'received', label: 'Received' },
  { value: 'processing', label: 'Processing' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export interface UseOrdersListPageResult {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  orders: Order[];
  showTable: boolean;
  isLoading: boolean;
  isError: boolean;
  returnTarget: Order | null;
  cancelTarget: Order | null;
  isSubmitting: boolean;
  actionError: string | null;
  saved: string | null;
  start: (order: Order) => void;
  openReturn: (order: Order) => void;
  closeReturn: () => void;
  confirmReturn: (quantities: ReturnQuantities) => void;
  openCancel: (order: Order) => void;
  closeCancel: () => void;
  confirmCancel: (reason: string) => void;
  dismissSaved: () => void;
  retry: () => void;
  clearSearch: () => void;
}

export const useOrdersListPage = (): UseOrdersListPageResult => {
  // state
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [returnTarget, setReturnTarget] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // wiring
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useOrders({
    ...(query ? { q: query } : {}),
    ...(status ? { status: status as OrderStatus } : {}),
  });
  // Tailwind's md: below it the same rows read better as cards.
  const showTable = useMediaQuery('(min-width: 48rem)');

  // derived
  const orders = data ?? [];

  // callbacks
  /** Returning raises a bill and moves money, so the dashboard and bills go stale with it. */
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ordersKeys.all }),
      queryClient.invalidateQueries({ queryKey: billsKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
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

  // effects
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  return {
    search,
    setSearch,
    status,
    setStatus,
    orders,
    showTable,
    isLoading: isPending,
    isError,
    returnTarget,
    cancelTarget,
    isSubmitting,
    actionError,
    saved,
    start: (order) => void run(() => startOrder(order.id), `${order.orderNo} is now processing.`),
    openReturn: (order) => {
      setActionError(null);
      setSaved(null);
      setReturnTarget(order);
    },
    closeReturn: () => setReturnTarget(null),
    confirmReturn: (quantities) => void confirmReturn(quantities),
    openCancel: (order) => {
      setActionError(null);
      setSaved(null);
      setCancelTarget(order);
    },
    closeCancel: () => setCancelTarget(null),
    confirmCancel: (reason) => void confirmCancel(reason),
    dismissSaved: () => setSaved(null),
    retry: () => void refetch(),
    clearSearch: () => setSearch(''),
  };
};
