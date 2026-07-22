/**
 * Authentication and Session Management Utility for EMAHU Web Client
 * Coordinates client-side fetch requests to the secure backend JWT API on Port 5000.
 */

import API_BASE from './config';

const API_BASE_URL = `${API_BASE}/api/auth`;

/**
 * Smart fetch wrapper that automatically retries when backend/database is waking up from standby/sleep (503 Service Unavailable).
 */
export async function fetchWithRetry(url, options = {}, retries = 2, delayMs = 2000) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, options);

      // If 503 Service Unavailable (e.g. database server waking up), retry cleanly
      if (response.status === 503 && attempt < retries) {
        console.warn(`[API] Server/DB waking up. Retrying attempt ${attempt + 1}/${retries} in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        attempt++;
        continue;
      }

      return response;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`[API] Network error. Retrying attempt ${attempt + 1}/${retries} in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        attempt++;
        continue;
      }
      throw err;
    }
  }
}

/**
 * Safely parses response JSON. If response is HTML (e.g. 404/502 error page), extracts error message cleanly.
 */
export async function safeParseJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html') || contentType.includes('text/plain')) {
    const text = await response.text();
    if (response.status === 404) {
      throw new Error(`API Endpoint Not Found (404). Please verify backend server deployment.`);
    } else if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(`Database / Server is starting up (${response.status}). Please retry in a few seconds.`);
    }
    throw new Error(`Server returned non-JSON response (${response.status}).`);
  }

  try {
    return await response.json();
  } catch (err) {
    throw new Error(`Invalid server response format (${response.status}).`);
  }
}

/**
 * Helper to get default fetch headers
 */
const getHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Securely register a user (buyer, seller, delivery)
 */
export async function registerUser(userData) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });

    const data = await safeParseJson(response);
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  } catch (error) {
    console.error('API Register Error:', error.message);
    throw error;
  }
}

/**
 * Securely log in user & retrieve dual tokens
 */
export async function loginUser(email, password, role) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password, role }),
    });

    const data = await safeParseJson(response);
    if (!response.ok) {
      throw new Error(data.error || 'Invalid credentials');
    }
    return data;
  } catch (error) {
    console.error('API Login Error:', error.message);
    throw error;
  }
}

/**
 * Authenticate via Google payload
 */
export async function googleLoginUser({ email, name, role, idToken }) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/google`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, name, role, idToken }),
    });

    const data = await safeParseJson(response);
    if (!response.ok) {
      throw new Error(data.error || 'Google login failed');
    }
    return data;
  } catch (error) {
    console.error('API Google Login Error:', error.message);
    throw error;
  }
}

/**
 * Clear session cookies on the backend and destroy database token record
 */
export async function logoutUser() {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await safeParseJson(response);
  } catch (error) {
    console.error('API Logout Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve user details using standard access token
 */
export async function getProfile(token) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    const data = await safeParseJson(response);
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch profile');
    }
    return data;
  } catch (error) {
    console.error('API Profile Error:', error.message);
    throw error;
  }
}

/**
 * Client Helper: Save user credentials & token upon login/register
 */
export function saveAuthSession(data, role) {
  if (typeof window === 'undefined') return;

  const keyPrefix = role === 'seller' ? 'emahu_seller' : role === 'delivery' ? 'emahu_delivery' : role === 'admin' ? 'emahu_admin' : 'emahu_buyer';

  localStorage.setItem(`${keyPrefix}_logged_in`, 'true');
  localStorage.setItem(`${keyPrefix}_token`, data.accessToken);
  localStorage.setItem(`${keyPrefix}_user`, JSON.stringify(data.user));

  // Dispatch global storage event so Next.js header component receives update instantly
  window.dispatchEvent(new Event('storage'));
}

/**
 * Client Helper: Clear user credentials & tokens upon signout
 */
export function clearAuthSession(role) {
  if (typeof window === 'undefined') return;

  const keyPrefix = role === 'seller' ? 'emahu_seller' : role === 'delivery' ? 'emahu_delivery' : role === 'admin' ? 'emahu_admin' : 'emahu_buyer';

  localStorage.removeItem(`${keyPrefix}_logged_in`);
  localStorage.removeItem(`${keyPrefix}_registered`);
  localStorage.removeItem(`${keyPrefix}_token`);
  localStorage.removeItem(`${keyPrefix}_user`);

  // Dispatch global storage event so Next.js header component receives update instantly
  window.dispatchEvent(new Event('storage'));
}

/**
 * Client Helper: Check if user session is active
 */
export function checkIsLoggedIn(role) {
  if (typeof window === 'undefined') return false;

  const keyPrefix = role === 'seller' ? 'emahu_seller' : role === 'delivery' ? 'emahu_delivery' : role === 'admin' ? 'emahu_admin' : 'emahu_buyer';
  return localStorage.getItem(`${keyPrefix}_logged_in`) === 'true';
}

/**
 * Request a backend role switch and update user details
 */
export async function changeUserRole(newRole, token, details = {}) {
  try {
    const payload = { role: newRole };
    if (newRole === 'seller') {
      payload.storeDetails = details;
    } else if (newRole === 'delivery') {
      payload.vehicleDetails = details;
    }

    const response = await fetchWithRetry(`${API_BASE}/api/auth/change-role`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to change role');
    }
    return data;
  } catch (error) {
    console.error('API Change Role Error:', error.message);
    throw error;
  }
}
