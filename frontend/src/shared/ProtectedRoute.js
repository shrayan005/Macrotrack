/**
 * ProtectedRoute
 *
 * Route guard that redirects unauthenticated users to /login and enforces the
 * onboarding flow for users who have not yet completed their profile setup.
 *
 * Props:
 *   children (ReactNode) — the page component to render when all checks pass
 *
 * Used in: App.js (wraps every route that requires authentication)
 */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // While we are checking token / profile
  if (loading) {
    return (
      <div className="page-loading">
        <p>Loading your data...</p>
      </div>
    );
  }

  // Not logged in → send to login, remember where they tried to go
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isOnboardingPage = location.pathname === "/onboarding";

  // Use the backend-computed is_onboarded flag (requires height + goal to be set).
  // This is more reliable than checking individual fields client-side, since
  // user.weight comes from WeightLog and can be null for users who haven't logged
  // weight yet — which should not block access after onboarding.
  const isProfileIncomplete = user && user.is_onboarded === false;

  if (isProfileIncomplete && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  // If profile is complete but they try to go to onboarding, send to dashboard
  if (!isProfileIncomplete && isOnboardingPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // Logged in & profile valid → show the page
  return children;
}

export default ProtectedRoute;
