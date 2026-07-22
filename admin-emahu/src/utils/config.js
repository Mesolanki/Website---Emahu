/**
 * Shared API configuration for Emahu admin panel.
 * Dynamically resolves backend target URL for local dev and live deployment (emahu.com / manage.emahu.com).
 */
let API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').trim();

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    if (hostname.includes('emahu.com')) {
      API_BASE = 'https://emahu.com';
    } else {
      API_BASE = `${protocol}//${hostname}`;
    }
  } else if (!API_BASE) {
    API_BASE = 'http://127.0.0.1:5000';
  }
} else if (!API_BASE) {
  API_BASE = 'http://127.0.0.1:5000';
}

API_BASE = API_BASE.replace(/\/$/, '');

export default API_BASE;
