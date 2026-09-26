import type { UserRole } from '@api/process-backend/auth';

/**
 * Accent names come from the API's roles table ("brand", "warning"). What each one looks like
 * is ours: the server picks which accent a role wears, never the colour itself.
 */
export const ACCENT_AVATAR: Record<string, string> = {
  brand: 'from-brand-line to-brand-bg text-brand-fg',
  warning: 'from-warning-bright to-warning-solid text-brand-fg',
  success: 'from-success-bright to-success-solid text-brand-fg',
};

/*
 * The tile behind the ProcessNow mark, so the workspace itself says which login this is.
 * A diagonal sheen, a hairline edge to catch the light and a soft lift — the mark is the
 * first thing seen on every screen, so it is worth the three extra utilities.
 */
const TILE_FINISH = 'bg-linear-135 text-brand-fg shadow-raise ring-1 ring-white/10';

export const ACCENT_TILE: Record<string, string> = {
  brand: `${TILE_FINISH} from-brand-line to-brand-bg`,
  warning: `${TILE_FINISH} from-warning-bright to-warning-solid`,
  success: `${TILE_FINISH} from-success-bright to-success-solid`,
};

export const accentAvatar = (accent: string | undefined): string =>
  ACCENT_AVATAR[accent ?? ''] ?? 'from-brand-line to-brand-bg text-brand-fg';

export const accentTile = (accent: string | undefined): string =>
  ACCENT_TILE[accent ?? ''] ?? ACCENT_TILE.brand ?? '';

// Where each role lands after sign-in. The label and accent come from the API.
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: '/admin/companies',
  company_admin: '/',
};
