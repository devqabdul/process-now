/**
 * The role keys the code knows about. `roles` is a table now — a role can carry
 * a label, and later permissions, without a migration — but these two keys are
 * what the guards and the JWT compare, so they stay pinned here.
 */
export const ROLE_KEYS = ['super_admin', 'company_admin'] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];
