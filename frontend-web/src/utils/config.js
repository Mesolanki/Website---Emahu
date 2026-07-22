/**
 * Shared API configuration for Emahu frontend web client.
 * Dynamically resolves backend target URL for local dev and live deployment (emahu.com).
 */
let API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').trim();

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // In live production browser (emahu.com), use current origin so Nginx proxies /api smoothly
    API_BASE = `${protocol}//${hostname}`;
  } else if (!API_BASE) {
    API_BASE = 'http://127.0.0.1:5000';
  }
} else if (!API_BASE) {
  API_BASE = 'http://127.0.0.1:5000';
}

API_BASE = API_BASE.replace(/\/$/, '');

export default API_BASE;
