export const AUTH_COOKIE = 'access_token';
// Short enough that a leaked cookie can't ride for a week; sessions are also
// revocable through users.token_version.
export const SESSION_TTL_SECONDS = 24 * 60 * 60;
