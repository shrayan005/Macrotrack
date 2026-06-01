/**
 * ResetPasswordPage
 *
 * Legacy redirect page for the old /reset-password URL.
 *
 * Password resets previously used a link-based flow where the backend
 * emailed a URL like /reset-password?token=abc123. That flow has been
 * replaced by the OTP modal inside ForgotPasswordModal.js.
 *
 * Anyone landing here (e.g. from an old bookmarked link or email) is
 * automatically redirected to /login after 3 seconds, where they can
 * open the "Forgot Password?" modal to use the new flow.
 *
 * Props:
 *   None
 *
 * Used in: App.js (route "/reset-password")
 */
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/auth.css";

function ResetPasswordPage() {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to login after 3 seconds
        // replace: true removes /reset-password from browser history
        // so the Back button doesn't bring them back here
        const timer = setTimeout(() => navigate("/login", { replace: true }), 3000);

        // Cleanup: cancel the timer if the component unmounts before 3s
        // (e.g. user clicks "Go to Login" manually)
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">MACROTRACK</div>
                <h1 className="auth-title">Password Reset</h1>
                <p className="auth-subtitle">
                    Password resets now use a secure verification code sent to your email.
                </p>
                <p className="auth-subtitle" style={{ marginTop: 8 }}>
                    Redirecting you to the login page…
                </p>
                {/* Manual redirect button in case the user doesn't want to wait */}
                <button
                    className="btn btn-primary btn-block"
                    style={{ marginTop: 24 }}
                    onClick={() => navigate("/login", { replace: true })}
                >
                    Go to Login
                </button>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
