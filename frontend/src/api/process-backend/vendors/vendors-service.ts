import { http } from '../axios';
import type { ApiEnvelope } from '../types';

import type {
  CreateVendorPayload,
  UpdateVendorPayload,
  Vendor,
  VendorsQuery,
} from './vendors.types';

export const getVendors = (params: VendorsQuery = {}) =>
  http.get<ApiEnvelope<Vendor[]>>('/vendors', { params });

export const createVendor = (payload: CreateVendorPayload) =>
  http.post<ApiEnvelope<Vendor>>('/vendors', payload);

export const updateVendor = (id: string, payload: UpdateVendorPayload) =>
  http.patch<ApiEnvelope<Vendor>>(`/vendors/${id}`, payload);
