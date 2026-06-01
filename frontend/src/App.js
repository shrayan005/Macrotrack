/**
 * App.js
 *
 * Root component for MacroTrack. Sets up global providers (Theme, Auth),
 * the React Router route tree, and wraps every page in an ErrorBoundary so a
 * single page crash cannot take down the whole app.
 *
 * Critical public pages are eagerly imported; heavy authenticated pages use
 * React.lazy so they are only downloaded when the user first visits them.
 */
// src/App.js
// Updated to use React Router + AuthProvider + ProtectedRoute + Lazy Loading

import React, { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
// Global context providers that wrap the entire app
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
// Shared route guard — redirects unauthenticated users to /login
import ProtectedRoute from "./shared/ProtectedRoute";
// Class-based error boundary — catches render errors and shows a fallback UI
import ErrorBoundary from "./shared/ErrorBoundary";
import "./App.css";

// Eager load only critical pages (landing, login, signup)
// These are loaded immediately because they are the first pages users see
import LandingPage from "./pages/LandingPage";
import LoginPage from "./features/auth/LoginPage";
import SignupPage from "./features/auth/SignupPage";
import OnboardingPage from "./features/auth/OnboardingPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";
import VerifyEmailPage from "./features/auth/VerifyEmailPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

// Lazy load heavy authenticated pages — each is code-split into its own JS chunk
const Dashboard = lazy(() => import("./features/dashboard/Dashboard"));
const DiaryPage = lazy(() => import("./features/diary/DiaryPage"));
const FoodSearchPage = lazy(() => import("./features/foods/FoodSearchPage"));
const ProgressPage = lazy(() => import("./features/progress/ProgressPage"));
const ReportsPage = lazy(() => import("./features/reports/ReportsPage"));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage"));
const CoachPage = lazy(() => import("./features/coach/CoachPage"));

// Public guide pages — lazily loaded because they are rarely visited
const NutritionGuidePage = lazy(() => import("./pages/NutritionGuidePage"));

const ExercisePage = lazy(() => import("./features/exercise/ExercisePage"));
const RecipesPage = lazy(() => import("./features/recipes/RecipesPage"));

// Loading fallback component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>
    Loading...
  </div>
);



function App() {
  // User data state - only used for ProfilePage
  const [userData, setUserData] = useState(null);

  // Update user data (for profile changes)
  const updateUserData = (data) => {
    setUserData((prev) => ({ ...prev, ...data }));
  };

  return (
    <ThemeProvider>
        <AuthProvider>
          <div className="app">
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public pages */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/nutrition-guide" element={<NutritionGuidePage />} />

              {/* Protected Onboarding Route */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <OnboardingPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              {/* Main app pages — each has its own ErrorBoundary so a single
                  page crash doesn't take down the entire app. */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Dashboard />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/diary"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <DiaryPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/foods"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <FoodSearchPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <ProgressPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <ReportsPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/coach"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <CoachPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <ProfilePage
                        userData={userData}
                        updateUserData={updateUserData}
                      />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/exercises"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <ExercisePage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/recipes"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <RecipesPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </div>
        </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
