# Emahu Professional-Level JWT Authentication & Authorization Documentation

This document describes the state-of-the-art role-based token authentication and session-management system built for the Emahu E-Commerce Platform.

---

## 🛡️ Architecture & Security Features

* **Dual-Token Strategy**:
  * **Access Token**: Short-lived (expires in **15 minutes**). Used to authenticate API requests. Transmitted in the HTTP `Authorization` header as a Bearer token.
  * **Refresh Token**: Long-lived (expires in **7 days**). Used to request new Access Tokens. Transmitted inside a secure, **HTTP-Only, SameSite cookie** to protect against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).
* **Refresh Token Rotation (RTR)**: Every time a refresh operation occurs, the previous Refresh Token is destroyed in the database, and a brand new pair of Access & Refresh tokens is generated. If an attacker attempts to reuse an old refresh token, they will fail because it was deleted.
* **Session Tracking**: Active sessions are logged in the database (`RefreshToken` schema) with client device/user-agent strings and IP addresses.
* **Secure Expiry Handling**: Expired sessions are automatically pruned from the database via MongoDB's TTL (Time To Live) indexing.

---

## 🔒 Roles Supported
Role inputs are strictly validated against:
1. `buyer` — Default customer role for browsing/purchasing.
2. `seller` — Merchant role for listing and managing items.
3. `delivery` — Delivery crew role for order dispatching and logistics.

---

## 🌐 Endpoints Summary

| Method | Endpoint | Access | Headers / Cookies | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | **Public** | *None* | Registers user, sets refresh cookie, returns Access Token |
| **POST** | `/api/auth/login` | **Public** | *None* | Validates password, sets refresh cookie, returns Access Token |
| **POST** | `/api/auth/refresh` | **Public** | Cookie: `refreshToken` | Validates session, rotates tokens, returns new Access Token |
| **POST** | `/api/auth/logout` | **Public** | Cookie: `refreshToken` | Revokes database session and clears cookie |
| **GET** | `/api/auth/me` | **Private** | Header: `Authorization: Bearer <access_token>` | Returns logged-in user profile details |
| **PUT** | `/api/auth/update-details` | **Private** | Header: `Authorization: Bearer <access_token>` | Updates user name, phone, and address |
| **PUT** | `/api/auth/update-password` | **Private** | Header: `Authorization: Bearer <access_token>` | Securely shifts current password to a new password |

---

## 📖 Endpoint Specifications

### 1. Register Account (`POST /api/auth/register`)
* **Request Body (JSON)**:
```json
{
  "name": "Kathan Patel",
  "email": "kathan@example.com",
  "password": "securepassword123",
  "role": "buyer", // 'buyer', 'seller', 'delivery'
  "phone": "+919876543210",
  "address": "123 Emahu Market Street"
}
```
* **Successful Response (201 Created)**:
  * *Sets HTTP-Only Cookie*: `refreshToken`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "645d9fa...",
    "name": "Kathan Patel",
    "email": "kathan@example.com",
    "role": "buyer",
    "phone": "+919876543210",
    "address": "123 Emahu Market Street"
  }
}
```

---

### 2. Login Account (`POST /api/auth/login`)
* **Request Body (JSON)**:
```json
{
  "email": "kathan@example.com",
  "password": "securepassword123"
}
```
* **Successful Response (200 OK)**:
  * *Sets HTTP-Only Cookie*: `refreshToken`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "645d9fa...",
    "name": "Kathan Patel",
    "email": "kathan@example.com",
    "role": "buyer",
    "phone": "+919876543210",
    "address": "123 Emahu Market Street"
  }
}
```

---

### 3. Rotate Session / Refresh Token (`POST /api/auth/refresh`)
Call this endpoint when the Access Token is about to expire, or when initializing the client-side app to verify if a user has an active session cookie.

* **Required Cookies**: `refreshToken` (Managed automatically by browsers)
* **Successful Response (200 OK)**:
  * *Sets updated HTTP-Only Cookie*: `refreshToken` (rotated session token)
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIs...",
  "user": {
    "id": "645d9fa...",
    "name": "Kathan Patel",
    "email": "kathan@example.com",
    "role": "buyer",
    "phone": "+919876543210",
    "address": "123 Emahu Market Street"
  }
}
```

---

### 4. Logout / Revoke Session (`POST /api/auth/logout`)
* **Required Cookies**: `refreshToken`
* **Successful Response (200 OK)**:
  * *Clears Cookie*: `refreshToken`
```json
{
  "success": true,
  "message": "Successfully logged out and session revoked"
}
```

---

### 5. Fetch Profile (`GET /api/auth/me`)
* **Headers**: `Authorization: Bearer <accessToken>`
* **Successful Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "645d9fa...",
    "name": "Kathan Patel",
    "email": "kathan@example.com",
    "role": "buyer",
    "phone": "+919876543210",
    "address": "123 Emahu Market Street",
    "createdAt": "2026-06-01T10:30:00.000Z"
  }
}
```

---

### 6. Update Profile Info (`PUT /api/auth/update-details`)
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body (JSON)** (Send only fields you wish to change):
```json
{
  "name": "Kathan Patel Updated",
  "phone": "+910000000000"
}
```
* **Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile details updated successfully",
  "user": {
    "id": "645d9fa...",
    "name": "Kathan Patel Updated",
    "email": "kathan@example.com",
    "role": "buyer",
    "phone": "+910000000000",
    "address": "123 Emahu Market Street"
  }
}
```

---

### 7. Shift Password (`PUT /api/auth/update-password`)
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body (JSON)**:
```json
{
  "currentPassword": "securepassword123",
  "newPassword": "newsupersecurepass789"
}
```
* **Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## 🌐 JavaScript Frontend Integration Guide

To allow the browser to save and send the secure HTTP-Only cookies, you must include the `credentials: 'include'` flag in all your `fetch()` requests, and set the request headers to receive JSON.

### Register / Login Hook
```javascript
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // CRITICAL: Tells the browser to accept and store the HTTP-Only cookies
      credentials: 'include', 
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (data.success) {
      // Save Access Token in memory or React state (do NOT store in localStorage for top security)
      const accessToken = data.accessToken;
      const user = data.user;
      console.log('Login success! User:', user);
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error('Login request failed', error);
  }
}
```

### Silent Refresh Handler (Token Renewal)
Set an interval timer to run every **14 minutes** in the background of your frontend app to silently query this endpoint and fetch a fresh Access Token.

```javascript
async function refreshAccessToken() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // CRITICAL: Browser automatically attaches the HTTP-Only session cookie
      credentials: 'include'
    });

    const data = await response.json();
    if (data.success) {
      console.log('Access token rotated successfully!');
      return data.accessToken;
    } else {
      console.log('Session expired. Redirecting to login.');
      return null;
    }
  } catch (error) {
    console.error('Session rotation failed', error);
  }
}
```

### Accessing Private Routes
```javascript
async function getProfile(accessToken) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Your Profile:', data.user);
  } catch (error) {
    console.error('Fetch profile failed', error);
  }
}
```
