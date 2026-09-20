import { http } from '../axios';
import type { ApiEnvelope } from '../types';

import type { Settings, UpdateSettingsPayload } from './settings.types';

export const getSettings = () => http.get<ApiEnvelope<Settings>>('/settings');

export const updateSettings = (payload: UpdateSettingsPayload) =>
  http.patch<ApiEnvelope<Settings>>('/settings', payload);
