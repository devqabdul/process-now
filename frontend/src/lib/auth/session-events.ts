type SessionEvent = 'expired';

const listeners = new Set<(event: SessionEvent) => void>();

/**
 * The axios interceptor can't navigate — it has no router. It emits here, and
 * SessionListener (inside the router) does the navigating.
 */
export const sessionEvents = {
  emit: (event: SessionEvent) => listeners.forEach((listener) => listener(event)),
  subscribe: (listener: (event: SessionEvent) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
