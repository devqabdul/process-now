export type UserRole = 'super_admin' | 'company_admin';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  /*
   * The signed-in role's own label and accent, from the API's roles table. It rides along with
   * /auth/me so a page load doesn't spend a second round trip asking what this user already is.
   * Accent is one of our token names ("brand", "warning"), never a hex.
   */
  roleMeta: { label: string; accent: string };
  // Whichever one they sign in with; at least one is set.
  phone: string | null;
  email: string | null;
  company: { id: string; name: string; isActive?: boolean } | null;
}

export interface LoginPayload {
  // Email (lower-cased) or a 10-digit mobile number.
  identifier: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
