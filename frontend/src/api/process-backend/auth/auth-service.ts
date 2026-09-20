import { http } from '../axios';
import type { ApiEnvelope } from '../types';

import type { ChangePasswordPayload, LoginPayload, LoginResponse } from './auth.types';

export const login = (payload: LoginPayload) =>
  http.post<ApiEnvelope<LoginResponse>>('/auth/login', payload);

/** Clears the cookie and revokes the session server-side. */
export const logout = () => http.post<ApiEnvelope<{ loggedOut: true }>>('/auth/logout');

export const getMe = () => http.get<ApiEnvelope<LoginResponse>>('/auth/me');

/** Signs every other device out; this one stays signed in. */
export const changePassword = (payload: ChangePasswordPayload) =>
  http.patch<ApiEnvelope<{ changed: true }>>('/auth/password', payload);
