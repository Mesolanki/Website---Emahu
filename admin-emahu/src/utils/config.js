/**
 * Shared API configuration for Emahu admin panel.
 * Dynamically resolves backend target URL for local dev and live deployment.
 */
const DEFAULT_PROD_API = 'https://website-emahu.onrender.com';

let API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
API_BASE = API_BASE.trim();

if (!API_BASE) {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    API_BASE = DEFAULT_PROD_API;
  } else {
    API_BASE = 'http://localhost:5000';
  }
}

// Clean trailing slashes
API_BASE = API_BASE.replace(/\/$/, '');

export default API_BASE;
