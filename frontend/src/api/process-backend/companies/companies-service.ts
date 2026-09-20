import { http } from '../axios';
import type { ApiEnvelope } from '../types';

import type {
  CompaniesQuery,
  Company,
  CreateCompanyPayload,
  CreateCompanyResponse,
  ResetAdminPasswordResponse,
} from './companies.types';

export const getCompanies = (params: CompaniesQuery = {}) =>
  http.get<ApiEnvelope<Company[]>>('/admin/companies', { params });

/** Creates the company and its first admin in one transaction. */
export const createCompany = (payload: CreateCompanyPayload) =>
  http.post<ApiEnvelope<CreateCompanyResponse>>('/admin/companies', payload);

/** Suspends or restores a company. Suspended, nobody from it can sign in or keep a session. */
export const setCompanyActive = (companyId: string, isActive: boolean) =>
  http.patch<ApiEnvelope<Company>>(`/admin/companies/${companyId}`, { isActive });

/** Sets the company admin's password and signs out their existing sessions. */
export const resetAdminPassword = (companyId: string, password: string) =>
  http.patch<ApiEnvelope<ResetAdminPasswordResponse>>(
    `/admin/companies/${companyId}/admin-password`,
    { password },
  );
