import { http } from '../axios';
import type { Paged } from '../common.types';
import type { ApiEnvelope } from '../types';

import type { CreateOrderPayload, Order, OrdersQuery, ReturnOrderPayload } from './orders.types';

export const getOrders = (params: OrdersQuery) =>
  http.get<ApiEnvelope<Paged<Order>>>('/orders', { params });

export const getOrder = (id: string) => http.get<ApiEnvelope<Order>>(`/orders/${id}`);

export const createOrder = (payload: CreateOrderPayload) =>
  http.post<ApiEnvelope<Order>>('/orders', payload);

/** received → processing */
export const startOrder = (id: string) => http.post<ApiEnvelope<Order>>(`/orders/${id}/start`);

/** processing → returned, and creates the bill in the same transaction. */
export const returnOrder = (id: string, payload: ReturnOrderPayload) =>
  http.post<ApiEnvelope<Order>>(`/orders/${id}/return`, payload);

/** Only before the order is returned; after that the bill has to be voided. */
export const cancelOrder = (id: string, reason: string) =>
  http.post<ApiEnvelope<Order>>(`/orders/${id}/cancel`, { reason });
