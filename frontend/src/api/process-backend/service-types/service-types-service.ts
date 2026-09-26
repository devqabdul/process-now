import { http } from '../axios';
import type { Paged } from '../common.types';
import type { ApiEnvelope } from '../types';

import type {
  CreateServiceTypePayload,
  ServiceType,
  ServiceTypesQuery,
  UpdateServiceTypePayload,
} from './service-types.types';

export const getServiceTypes = (params: ServiceTypesQuery) =>
  http.get<ApiEnvelope<Paged<ServiceType>>>('/service-types', { params });

export const getServiceType = (id: string) =>
  http.get<ApiEnvelope<ServiceType>>(`/service-types/${id}`);

export const createServiceType = (payload: CreateServiceTypePayload) =>
  http.post<ApiEnvelope<ServiceType>>('/service-types', payload);

export const updateServiceType = (id: string, payload: UpdateServiceTypePayload) =>
  http.patch<ApiEnvelope<ServiceType>>(`/service-types/${id}`, payload);

export const deleteServiceType = (id: string) =>
  http.delete<ApiEnvelope<ServiceType>>(`/service-types/${id}`);
