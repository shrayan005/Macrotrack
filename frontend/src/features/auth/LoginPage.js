/**
 * LoginPage
 *
 * Renders the sign-in form for existing users. Handles email/password login,
 * Google OAuth login, and navigates to the forgot-password flow via a modal.
 *
 * Props:
 *   None — reads auth state from AuthContext and navigation from React Router.
 *
 * Used in: App.js (route "/login")
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
// Pull login function and loading state from global auth context
import { useAuth } from "../../context/AuthContext";
import GoogleSignInButton from "./GoogleSignInButton";
import ForgotPasswordModal from "./ForgotPasswordModal";


function LoginPage() {
  // login() sends credentials to the backend and saves the token
  // loading is true while waiting for the backend to respond
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // Controlled inputs — each keystroke updates the matching state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Error message shown in red above the form if login fails
  const [error, setError] = useState("");

  // Controls whether the ForgotPassword modal is open or closed
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Toggles the password field between hidden (●●●) and visible (abc)
  const [showPassword, setShowPassword] = useState(false);

  // Called when the user clicks "Sign In"
  const handleSubmit = async (e) => {
    e.preventDefault(); // stop the browser from reloading the page
    setError("");        // clear any previous error message

    try {
      // Send email + password to the backend via AuthContext
      await login(email, password);
      // On success the token is stored and we navigate to the main app
      navigate("/dashboard");
    } catch (err) {
      // Special case: user signed up but never verified their email
      // Backend returns HTTP 403 with needs_verification: true
      if (err?.needs_verification) {
        navigate("/verify-email", { state: { email } });
        return;
      }
      // Any other error — wrong password, account disabled, etc.
      setError(
        (err && err.error) || "Invalid email or password. Please try again."
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* App logo / brand name */}
        <div className="auth-logo">MACROTRACK</div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          Sign in to continue tracking your nutrition
        </p>

        {/* Only renders if error is not empty */}
        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email field */}
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
              title="Please enter a valid email address"
              required
              autoFocus
            />
          </div>

          {/* Password field — label row has a "Forgot Password?" link on the right */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label>Password</label>
              {/* Opens the ForgotPasswordModal without navigating away */}
              <button
                type="button"
                className="btn-link"
                onClick={() => setShowForgotPassword(true)}
                style={{ fontSize: "14px" }}
              >
                Forgot Password?
              </button>
            </div>
            {/* Wrapper so the eye icon button sits inside the input */}
            <div style={{ position: "relative", width: "100%" }}>
              {/* type switches between "password" (hidden) and "text" (visible) */}
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                minLength="10"
                title="Password must be at least 10 characters"
                required
                style={{ width: "100%", paddingRight: "44px", boxSizing: "border-box" }}
              />
              {/* Eye toggle button — absolutely positioned inside the input */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: "12px", top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", padding: "0",
                  color: "var(--text-secondary)", display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit button — disabled while waiting for the backend response */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Visual separator between email/password and Google login */}
        <div className="auth-divider">
          <span>OR</span>
        </div>

        {/* Google OAuth button — handles the entire Google popup internally */}
        <GoogleSignInButton />

        {/* Link to signup for users who don't have an account yet */}
        <div className="auth-footer">
          Don't have an account?{" "}
          <button className="btn-link" onClick={() => navigate("/signup")}>
            Sign up
          </button>
        </div>

        <button className="btn-text" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>

      {/* Password reset modal — rendered here but only visible when showForgotPassword is true */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}

export default LoginPage;
