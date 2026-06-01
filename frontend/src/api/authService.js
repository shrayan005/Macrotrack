/**
 * authService.js
 *
 * Handles all authentication API calls against the /api/auth/ endpoint group.
 * Token management (persist/clear) is handled by AuthContext; this file only
 * makes the network requests and returns the raw response data.
 *
 * Key functions:
 *   signup(signupData)         — POST /api/auth/signup/ — register a new account, returns { token, user, message }
 *   login(email, password)     — POST /api/auth/login/ — authenticate, returns { token, user, message }
 *   logout(token)              — POST /api/auth/logout/ — invalidate server-side token
 *   getProfile(token)          — GET /api/auth/profile/ — fetch the authenticated user's profile
 *   googleAuth(idToken)        — POST /api/auth/google/ — OAuth login, returns { token, user, message }
 *   verifyEmail(email, otp)    — POST /api/auth/verify-email/ — confirm email address with OTP
 *   resendVerification(email)  — POST /api/auth/resend-verification/ — resend verification email
 *   updateProfile(profileData) — PUT /api/auth/profile/update/ — update the authenticated user's profile
 */
// src/api/authService.js
import { API_BASE_URL } from "./config";

const AUTH_URL = `${API_BASE_URL}/auth`;

// Register a new user account — POST /api/auth/signup/ — returns { token, user, message } or { needs_verification }
export async function signup(signupData) {
  const res = await fetch(`${AUTH_URL}/signup/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(signupData),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed'); // will be caught in UI
  }

  // data = { token, user, message }
  return data;
}

// Authenticate with email and password — POST /api/auth/login/ — returns { token, user, message }
export async function login(email, password) {
  const res = await fetch(`${AUTH_URL}/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data; // { token, user, message }
}

// Invalidate the server-side DRF token — POST /api/auth/logout/ — returns { message }
export async function logout(token) {
  const res = await fetch(`${AUTH_URL}/logout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data; // { message: "Logout successful" }
}

// Fetch the authenticated user's profile — GET /api/auth/profile/ — returns user object
export async function getProfile(token) {
  const res = await fetch(`${AUTH_URL}/profile/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data; // user object
}

// Exchange a Google ID token for a MacroTrack session — POST /api/auth/google/ — returns { token, user, message }
export async function googleAuth(idToken) {
  const res = await fetch(`${AUTH_URL}/google/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id_token: idToken }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data; // { token, user, message }
}

// Verify email address with OTP — POST /api/auth/verify-email/ — returns { token, user, message }
export async function verifyEmail(email, otp) {
  const res = await fetch(`${AUTH_URL}/verify-email/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || new Error('Request failed');
  return data; // { token, user, message }
}

// Resend the email verification OTP — POST /api/auth/resend-verification/ — returns confirmation message
export async function resendVerification(email) {
  const res = await fetch(`${AUTH_URL}/resend-verification/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || new Error('Request failed');
  return data;
}

// Update the authenticated user's profile fields — PUT /api/auth/profile/update/ — returns updated user object
export async function updateProfile(profileData) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("Not authenticated");
  }
  const res = await fetch(`${AUTH_URL}/profile/update/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw data || new Error('Request failed');
  }

  return data; // updated user object
}
