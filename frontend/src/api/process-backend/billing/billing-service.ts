import { http } from '../axios';
import type { Paged } from '../common.types';
import type { ApiEnvelope } from '../types';

import type { Bill, BillDetail, BillPdf, BillsQuery, RecordPaymentPayload } from './billing.types';

export const getBills = (params: BillsQuery) =>
  http.get<ApiEnvelope<Paged<Bill>>>('/bills', { params });

export const getBill = (id: string) => http.get<ApiEnvelope<BillDetail>>(`/bills/${id}`);

export const recordPayment = (id: string, payload: RecordPaymentPayload) =>
  http.post<ApiEnvelope<BillDetail>>(`/bills/${id}/payments`, payload);

/** Voids a bill raised in error. Refused once it has payments. */
export const voidBill = (id: string, reason: string) =>
  http.post<ApiEnvelope<BillDetail>>(`/bills/${id}/void`, { reason });

export const getBillPdf = (id: string) => http.get<ApiEnvelope<BillPdf>>(`/bills/${id}/pdf`);
