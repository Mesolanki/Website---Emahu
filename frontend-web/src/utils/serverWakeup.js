/**
 * serverWakeup.js
 * Pings the Render backend to wake it from cold-start sleep.
 * Render free-tier instances sleep after 15 min of inactivity.
 * This pre-warms the backend so the first real API call doesn't stall.
 */

const BACKEND_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'https://website-emahu.onrender.com';
  return raw
    .replace(/\/api\/auth$/, '')
    .replace(/\/api$/, '')
    .replace(/\/$/, '');
})();

const PING_ENDPOINT = `${BACKEND_URL}/api/health`;

let wakeupPromise = null; // singleton — only one ping at a time

/**
 * Sends a lightweight GET ping to the backend health endpoint.
 * Returns a promise that resolves with { ok: boolean, cold: boolean }.
 *
 * - `cold` is true if the response took more than 2000ms (cold start detected).
 * - Caches the promise so multiple callers share one ping request.
 */
export function wakeupServer() {
  if (wakeupPromise) return wakeupPromise;

  wakeupPromise = new Promise((resolve) => {
    const start = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s max

    fetch(PING_ENDPOINT, {
      method: 'GET',
      signal: controller.signal,
      // Bypass Next.js caching — we always want a fresh ping
      cache: 'no-store',
    })
      .then((res) => {
        clearTimeout(timeout);
        const elapsed = Date.now() - start;
        resolve({ ok: res.ok, cold: elapsed > 2000, elapsed });
      })
      .catch(() => {
        clearTimeout(timeout);
        const elapsed = Date.now() - start;
        // Even if ping fails, resolve so callers aren't blocked
        resolve({ ok: false, cold: elapsed > 2000, elapsed });
      });
  });

  return wakeupPromise;
}

/**
 * Resets the cached wakeup promise.
 * Call this if you want to re-ping after a long idle period.
 */
export function resetWakeup() {
  wakeupPromise = null;
}
