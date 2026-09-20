import { http } from '../axios';
import type { ApiEnvelope } from '../types';

import type { DailyLog, DailyLogsQuery, UpsertDailyLogPayload } from './daily-logs.types';

export const getDailyLogs = (params: DailyLogsQuery = {}) =>
  http.get<ApiEnvelope<DailyLog[]>>('/daily-logs', { params });

/** One entry per day: saving the same date again overwrites it. */
export const saveDailyLog = (date: string, payload: UpsertDailyLogPayload) =>
  http.put<ApiEnvelope<DailyLog>>(`/daily-logs/${date}`, payload);
