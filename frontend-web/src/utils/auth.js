/**
 * Authentication and Session Management Utility for EMAHU Web Client
 * Coordinates client-side fetch requests to the secure backend JWT API on Port 5000.
 */

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth`;

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
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });

    const data = await response.json();
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
export async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/google`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, name, role, idToken }),
    });

    const data = await response.json();
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
 * Authenticate via Apple payload
 */
export async function appleLoginUser({ email, name, role }) {
  try {
    const response = await fetch(`${API_BASE_URL}/apple`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, name, role }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Apple login failed');
    }
    return data;
  } catch (error) {
    console.error('API Apple Login Error:', error.message);
    throw error;
  }
}

/**
 * Clear session cookies on the backend and destroy database token record
 */
export async function logoutUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    const data = await response.json();
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
