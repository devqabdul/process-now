import { isRouteErrorResponse, useRouteError } from 'react-router';

const RELOADED_KEY = 'pn.chunkReload';

// A failed chunk import after a deploy means the tab is running an old build. Reload once —
// a chunk that stays unfetchable (bad deploy, stale service worker) must not loop forever.
const isChunkLoadError = (error: unknown) =>
  error instanceof Error &&
  /Failed to fetch dynamically imported module|Importing a module script failed/.test(
    error.message,
  );

const readReloaded = () => {
  try {
    return sessionStorage.getItem(RELOADED_KEY) === '1';
  } catch {
    return true;
  }
};

const markReloaded = () => {
  try {
    sessionStorage.setItem(RELOADED_KEY, '1');
  } catch {
    // Storage blocked: the reload still happens, it just can't be remembered.
  }
};

export const RouteErrorBoundary = () => {
  const error = useRouteError();

  if (isChunkLoadError(error) && !readReloaded()) {
    markReloaded();
    window.location.reload();
    return null;
  }

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'This page failed to load';

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6">
      <div className="w-full max-w-[420px] rounded-16 border border-line bg-surface p-7 shadow-card">
        <h1 className="mb-2 text-xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mb-5 text-[13.5px] leading-relaxed text-fg-muted">
          Refresh the page to try again. If it keeps happening, contact support.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-11 rounded-12 bg-primary px-5 text-sm font-semibold text-primary-fg transition-colors duration-200 hover:bg-primary-hover"
        >
          Refresh
        </button>
      </div>
    </main>
  );
};
