// Serves the API from the app's own origin so the session cookie (SameSite=Lax) is first-party.
// ponytail: the API sees the Worker's IP, so the login rate limit is shared; forward CF-Connecting-IP if that bites.
export default {
  fetch(request: Request, env: { API_ORIGIN: string }): Promise<Response> {
    const { pathname, search } = new URL(request.url);
    return fetch(new URL(pathname + search, env.API_ORIGIN), request);
  },
};
