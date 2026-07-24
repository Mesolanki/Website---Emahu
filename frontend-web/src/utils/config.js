/**
 * Shared API configuration for Emahu frontend web client.
 * Dynamically resolves backend target URL for local dev and live deployment (emahu.com).
 */
export function getApiBase() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}`;
    }
  }
  let envUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:5000';
}

let API_BASE = getApiBase();

export default API_BASE;

