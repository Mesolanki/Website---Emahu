/**
 * Shared API configuration for Emahu frontend
 */
let API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
API_BASE = API_BASE.trim();
if (!API_BASE || API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1')) {
  API_BASE = '';
}
export default API_BASE;
