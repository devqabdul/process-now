import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { listQueries } from '../list-query';
import { unwrap } from '../unwrap';

import { getOrder, getOrders } from './orders-service';
import type { OrdersQuery } from './orders.types';

export const ordersKeys = {
  all: ['orders'] as const,
  ...listQueries(['orders'], getOrders),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...ordersKeys.all, 'detail', id] as const,
      queryFn: () => unwrap(getOrder(id)),
    }),
};

export const useOrders = (params: OrdersQuery) => useQuery(ordersKeys.list(params));

export const useOrdersInfinite = (params: Omit<OrdersQuery, 'page'>) =>
  useInfiniteQuery(ordersKeys.infinite(params));

export const useOrder = (id: string) => useQuery(ordersKeys.detail(id));
