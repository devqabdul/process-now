import { type Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

import { env } from '@app/config/env';

/*
 * Field measurements, not lab ones: these are the numbers real shop-floor phones produce.
 * In development they go to the console; in production they're only sent if an endpoint is
 * configured, so nothing leaves the device by default.
 */
const send = (metric: Metric) => {
  if (import.meta.env.DEV) {
    console.info(`[vitals] ${metric.name} ${Math.round(metric.value)} (${metric.rating})`);
    return;
  }

  const url = env.VITE_VITALS_URL;
  if (!url) return;

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: window.location.pathname,
    appEnv: env.VITE_APP_ENV,
  });

  // sendBeacon survives the page being closed, which is when the final values arrive.
  if (navigator.sendBeacon?.(url, body)) return;
  void fetch(url, { body, method: 'POST', keepalive: true }).catch(() => {
    // Losing a measurement must never affect the person using the app.
  });
};

export const reportWebVitals = () => {
  onCLS(send);
  onFCP(send);
  onINP(send);
  onLCP(send);
  onTTFB(send);
};
