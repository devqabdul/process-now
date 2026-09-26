import { http } from '../axios';
import type { Paged } from '../common.types';
import type { StatementQuery } from '../bank-accounts';
import type { ApiEnvelope } from '../types';

import type {
  CreateVendorPayload,
  UpdateVendorPayload,
  Vendor,
  VendorsQuery,
  VendorStatement,
} from './vendors.types';

export const getVendors = (params: VendorsQuery) =>
  http.get<ApiEnvelope<Paged<Vendor>>>('/vendors', { params });

export const createVendor = (payload: CreateVendorPayload) =>
  http.post<ApiEnvelope<Vendor>>('/vendors', payload);

export const updateVendor = (id: string, payload: UpdateVendorPayload) =>
  http.patch<ApiEnvelope<Vendor>>(`/vendors/${id}`, payload);

/** Orders, bills and payments with one vendor in a window of days (default: the last 30). */
export const getVendorStatement = (id: string, params: StatementQuery) =>
  http.get<ApiEnvelope<VendorStatement>>(`/vendors/${id}/statement`, { params });
