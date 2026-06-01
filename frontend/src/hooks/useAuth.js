/**
 * useAuth.js
 *
 * Convenience re-export of the useAuth hook from AuthContext. Importing from
 * this file lets consumers use a consistent hooks/ import path without caring
 * about where the hook is implemented.
 *
 * Returns: { user, token, loading, isAuthenticated, login, signup, logout,
 *            googleLogin, loginWithToken, setUser }
 * Usage: const { user, logout } = useAuth();
 */
// src/hooks/useAuth.js

import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * Custom hook to access authentication context
 * Re-exports the useAuth hook from AuthContext for convenience
 * @returns {Object} - Authentication context value
 */
export const useAuth = useAuthContext;

export default useAuth;