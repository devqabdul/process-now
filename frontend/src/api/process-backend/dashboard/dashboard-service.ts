import { http } from '../axios';
import type { ApiEnvelope } from '../types';

import type { Dashboard } from './dashboard.types';

/** Every tile for one business day. `date` defaults to today (IST). */
export const getDashboard = (date?: string) =>
  http.get<ApiEnvelope<Dashboard>>('/dashboard', { params: { date } });
