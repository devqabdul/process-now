// Every key this app writes starts with this; other sites' or tools' data is left alone.
const APP_KEY_PREFIX = 'pn.';

const clearAppKeys = (storage: Storage) => {
  for (const key of Object.keys(storage)) {
    if (key.startsWith(APP_KEY_PREFIX)) storage.removeItem(key);
  }
};

/**
 * The one-tap fix for a phone stuck on an old build: drop the service worker and its caches,
 * forget this app's saved preferences, and load fresh from the server. The session cookie is
 * httpOnly and untouched, so the user stays signed in.
 */
export const resetApp = async () => {
  try {
    const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // No service worker support (or blocked): nothing to unregister.
  }
  try {
    const keys = (await window.caches?.keys()) ?? [];
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  } catch {
    // Cache Storage unavailable: the reload below still fetches from the network.
  }
  try {
    clearAppKeys(window.localStorage);
    clearAppKeys(window.sessionStorage);
  } catch {
    // Storage blocked in this browser: nothing was saved there to clear.
  }
  window.location.replace(window.location.pathname);
};
