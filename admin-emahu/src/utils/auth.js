/**
 * Authentication and Session Management Utility for Standalone Admin Panel
 */

import API_BASE from './config';

const API_BASE_URL = `${API_BASE}/api/auth`;

const getHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function registerUser({ name, email, password, role, phone, address, adminSecret }) {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password, role, phone, address, adminSecret }),
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

export async function loginUser(email, password, twoFactorCode) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password, twoFactorCode }),
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

export function saveAuthSession(data, role = 'admin') {
  if (typeof window === 'undefined') return;

  const keyPrefix = 'emahu_admin';

  localStorage.setItem(`${keyPrefix}_logged_in`, 'true');
  localStorage.setItem(`${keyPrefix}_token`, data.accessToken);
  localStorage.setItem(`${keyPrefix}_user`, JSON.stringify(data.user));

  window.dispatchEvent(new Event('storage'));
}

export function clearAuthSession(role = 'admin') {
  if (typeof window === 'undefined') return;

  const keyPrefix = 'emahu_admin';

  localStorage.removeItem(`${keyPrefix}_logged_in`);
  localStorage.removeItem(`${keyPrefix}_token`);
  localStorage.removeItem(`${keyPrefix}_user`);

  window.dispatchEvent(new Event('storage'));
}

export function checkIsLoggedIn(role = 'admin') {
  if (typeof window === 'undefined') return false;

  const keyPrefix = 'emahu_admin';
  return localStorage.getItem(`${keyPrefix}_logged_in`) === 'true';
}
