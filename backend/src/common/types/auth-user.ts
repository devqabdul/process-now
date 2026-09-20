import type { RoleKey } from '../roles.js';

/** JWT payload, set on req.user by JwtAuthGuard. */
export interface AuthUser {
  userId: string;
  role: RoleKey;
  companyId: string | null;
  /** must match users.token_version, or the session has been revoked */
  tokenVersion: number;
}
