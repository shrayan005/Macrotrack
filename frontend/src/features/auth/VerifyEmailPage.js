/**
 * VerifyEmailPage
 *
 * Accepts the 6-digit OTP sent to the user's email after signup and calls the
 * backend to activate the account. Also provides a "Resend Code" button with a
 * 60-second cooldown to prevent abuse.
 *
 * Props:
 *   None — email address is passed via React Router location state.
 *
 * Used in: App.js (route "/verify-email")
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// loginWithToken lets us set the session immediately after successful verification
import { useAuth } from "../../context/AuthContext";
import { verifyEmail, resendVerification } from "../../api/authService";

function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken } = useAuth();

  // Email is passed from SignupPage via React Router navigate state
  // e.g. navigate("/verify-email", { state: { email: "user@example.com" } })
  // If the user lands here directly (e.g. bookmarked), they can type their email manually
  const [email, setEmail] = useState(location.state?.email || "");

  // The 6-digit code the user types in
  const [otp, setOtp] = useState("");

  // Error message shown in red if verification fails
  const [error, setError] = useState("");

  // Loading state while the verify request is in flight
  const [loading, setLoading] = useState(false);

  // Separate loading state for the resend button
  const [resendLoading, setResendLoading] = useState(false);

  // Success/info message shown after resending (e.g. "A new code has been sent")
  const [resendMessage, setResendMessage] = useState("");

  // Countdown in seconds before the user can click Resend again
  // Starts at 0 (button enabled), jumps to 60 after first resend
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer — ticks down every second until it reaches 0
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer); // cleanup so we don't leak timers
  }, [resendCooldown]);

  // Called when the user submits the 6-digit code
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    // Guard: email must be present
    if (!email) {
      setError("Email is required");
      return;
    }

    // Guard: OTP must be exactly 6 digits
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit code from your email");
      return;
    }

    setLoading(true);
    try {
      // POST /api/auth/verify-email/ — backend checks the OTP hash in the DB
      const data = await verifyEmail(email, otp);

      // On success the backend returns { token, user }
      // We store them atomically so no stale previous-user data bleeds in
      loginWithToken(data.token, data.user);

      // Replace the current history entry so Back doesn't return to /verify-email
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.error || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Called when the user clicks "Resend Code"
  const handleResend = async () => {
    // Do nothing if email is missing or cooldown is still active
    if (!email || resendCooldown > 0) return;

    setResendLoading(true);
    setResendMessage("");
    setError("");
    try {
      // POST /api/auth/resend-verification/ — generates a new OTP and emails it
      await resendVerification(email);
      setResendMessage("A new code has been sent to your email.");
      setResendCooldown(60); // lock the button for 60 seconds to prevent spam
    } catch {
      setResendMessage("Could not resend. Please try again shortly.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">MACROTRACK</div>
        <h1 className="auth-title">Verify Your Email</h1>
        <p className="auth-subtitle">
          We sent a 6-digit code to <strong>{email || "your email"}</strong>.
          Enter it below to activate your account.
        </p>

        {/* Error from failed verification attempt */}
        {error && <p className="auth-error">{error}</p>}

        {/* Success/info message from resend */}
        {resendMessage && (
          <p style={{ color: "var(--success-color, #2d6a4f)", marginBottom: "12px", fontSize: "14px", textAlign: "center" }}>
            {resendMessage}
          </p>
        )}

        <form onSubmit={handleVerify} className="auth-form">
          {/* Only show email input if we didn't receive it from navigation state
              (i.e. user navigated here directly, not from signup) */}
          {!location.state?.email && (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          )}

          {/* OTP input — only accepts digits, max 6 characters
              letter-spacing and large font make the code easy to read */}
          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="text"
              value={otp}
              // Strip non-digits and cap at 6 characters as the user types
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric" // shows numeric keyboard on mobile
              autoFocus
              style={{ letterSpacing: "0.3em", fontSize: "22px", textAlign: "center" }}
              required
            />
          </div>

          {/* Verify button — disabled until all 6 digits are entered */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        {/* Resend section below the form */}
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>
            Didn't receive the code?
          </p>
          {/* Shows countdown while cooling down, "Resend Code" when ready */}
          <button
            className="btn-link"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : resendLoading
              ? "Sending..."
              : "Resend Code"}
          </button>
        </div>

        <div className="auth-footer" style={{ marginTop: "24px" }}>
          <button className="btn-link" onClick={() => navigate("/login")}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
