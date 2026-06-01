/**
 * AuthContext.js
 *
 * Stores and manages the authenticated user's session, including the DRF token,
 * user profile object, and a loading flag used during initial token validation.
 *
 * Provides to consumers:
 *   user            (object|null) — full user profile from the backend
 *   setUser         (function)    — directly update the user object (e.g. after profile edit)
 *   token           (string|null) — DRF authentication token
 *   loading         (boolean)     — true while the token is being validated on startup
 *   isAuthenticated (boolean)     — true when a token is present
 *   login(email, password)        — authenticate and store token
 *   signup(formData)              — register and optionally store token
 *   logout()                      — invalidate token and clear state
 *   googleLogin(idToken)          — OAuth login via Google
 *   loginWithToken(token, user)   — atomically set token + user (used after email verification)
 *
 * Usage: const { user, logout } = useAuth();
 */
// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../api/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Authenticated user profile — null means not logged in
  const [user, setUser] = useState(null);
  // DRF token — lazy-initialised from localStorage so refreshes don't log users out
  const [token, setToken] = useState(
    () => localStorage.getItem("authToken") || null
  );
  // Start as true only when there is a stored token to validate; prevents a
  // flash of the login page before the profile fetch completes
  const [loading, setLoading] = useState(() => !!localStorage.getItem("authToken"));

  // On mount (and whenever token changes), validate the stored token by fetching
  // the user's profile. Clears the token if the server rejects it (expired/invalid).
  // `token` in the dep array means this also re-runs after login/logout.
  useEffect(() => {
    async function fetchProfile() {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const profile = await authService.getProfile(token);
        setUser(profile);
      } catch (err) {
        // token might be invalid
        setUser(null);
        setToken(null);
        localStorage.removeItem("authToken");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("authToken", data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (formData) => {
    setLoading(true);
    try {
      const data = await authService.signup(formData);
      // Email/password signups require email verification before getting a token.
      // Clear any stale previous-user state so their profile picture / data
      // doesn't bleed into the new account's session.
      if (data.needs_verification) {
        setUser(null);
        setToken(null);
        localStorage.removeItem("authToken");
        return data; // Caller handles redirect to /verify-email
      }
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("authToken", data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Used after email verification: atomically sets token + user so the app
  // never briefly shows a stale previous user's data (e.g. profile picture).
  const loginWithToken = (tokenValue, userData) => {
    localStorage.setItem("authToken", tokenValue);
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = async () => {
    if (token) {
      try {
        await authService.logout(token);
      } catch {
        // ignore errors for now
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
  };

  const googleLogin = async (idToken) => {
    setLoading(true);
    try {
      const data = await authService.googleAuth(idToken);
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("authToken", data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    setUser,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    signup,
    logout,
    googleLogin,
    loginWithToken,
  };

  // Provider exposes all auth state and actions to the component tree
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
