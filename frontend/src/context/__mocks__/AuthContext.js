/**
 * __mocks__/AuthContext.js
 *
 * Jest manual mock for AuthContext. Replaces the real context during unit and
 * integration tests so components that call useAuth() receive a predictable,
 * controllable stub instead of making real API calls.
 *
 * Provides to consumers (test-time only):
 *   login           (jest.fn) — stubbed login action
 *   loading         (boolean) — defaults to false
 *   user            (null)    — no user logged in by default
 *   isAuthenticated (boolean) — defaults to false
 *
 * Usage: useAuth.mockReturnValue({ user: mockUser, isAuthenticated: true });
 */
export const useAuth = jest.fn(() => ({
    login: jest.fn(),
    loading: false,
    user: null,
    isAuthenticated: false
}));

// Pass-through provider so tests can render components inside AuthProvider
// without setting up real context logic
export const AuthProvider = ({ children }) => children;
