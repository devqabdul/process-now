import { queryOptions, useQuery } from '@tanstack/react-query';

import { unwrap } from '../unwrap';

import { getOrder, getOrders } from './orders-service';
import type { OrdersQuery } from './orders.types';

export const ordersKeys = {
  all: ['orders'] as const,
  list: (params: OrdersQuery = {}) =>
    queryOptions({
      queryKey: [...ordersKeys.all, 'list', params] as const,
      queryFn: () => unwrap(getOrders(params)),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...ordersKeys.all, 'detail', id] as const,
      queryFn: () => unwrap(getOrder(id)),
    }),
};

export const useOrders = (params: OrdersQuery = {}) => useQuery(ordersKeys.list(params));

export const useOrder = (id: string) => useQuery(ordersKeys.detail(id));
