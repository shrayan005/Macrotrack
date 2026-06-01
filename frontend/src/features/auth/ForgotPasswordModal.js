/**
 * ForgotPasswordModal
 *
 * Three-step password reset modal:
 *   Step 1 — user enters their email → backend emails a 6-digit OTP
 *   Step 2 — user enters the OTP → backend returns a short-lived reset_token
 *   Step 3 — user sets a new password using that reset_token
 *
 * Props:
 *   isOpen  (boolean)  — controls whether the modal is visible
 *   onClose (function) — called when the user dismisses the modal
 *
 * Used in: LoginPage.js
 */
import React, { useState, useEffect, useRef } from "react";
import "../../styles/auth.css";
import "./ForgotPasswordModal.css";

// API base URL from environment variable, falls back to localhost for development
const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// How long (in seconds) the user must wait before they can resend the OTP
// Prevents spam / brute-force attacks on the email endpoint
const RESEND_COOLDOWN = 60;

function StepBar({ step }) {
    const steps = ["Email", "Verify", "New Password"];
    return (
        <div className="fpm-steps">
            {steps.map((label, idx) => {
                const num = idx + 1;
                const active = num === step; // currently on this step
                const done = num < step;     // already completed this step
                return (
                    <React.Fragment key={label}>
                        {/* Circle shows step number, or a checkmark if already done */}
                        <div className={`fpm-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
                            <div className="fpm-step-circle">
                                {done ? "✓" : num}
                            </div>
                            <span className="fpm-step-label">{label}</span>
                        </div>
                        {/* Connector line between steps — turns green when step is done */}
                        {idx < steps.length - 1 && (
                            <div className={`fpm-step-line ${done ? "done" : ""}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function OtpInput({ value, onChange }) {
    // Refs to each input so we can programmatically move focus
    const inputs = useRef([]);

    // Split the current value string into an array of 6 digits
    // e.g. "123" → ["1", "2", "3", "", "", ""]
    const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

    const handleKey = (e, idx) => {
        if (e.key === "Backspace") {
            const next = digits.slice();
            if (next[idx]) {
                // If current box has a digit, clear it
                next[idx] = "";
                onChange(next.join("").trim());
            } else if (idx > 0) {
                // If current box is empty, clear the previous box and move focus back
                next[idx - 1] = "";
                onChange(next.join("").trim());
                inputs.current[idx - 1]?.focus();
            }
            return;
        }
        // Ignore anything that isn't a single digit
        if (!/^\d$/.test(e.key)) return;

        const next = digits.slice();
        next[idx] = e.key;
        onChange(next.join("").trim());

        // Automatically move to the next box after a digit is entered
        if (idx < 5) inputs.current[idx + 1]?.focus();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        // Strip non-digits from pasted text and take the first 6
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        onChange(pasted);
        // Move focus to the last filled box (or box 5 if all 6 filled)
        const focusIdx = Math.min(pasted.length, 5);
        inputs.current[focusIdx]?.focus();
    };

    return (
        <div className="fpm-otp-boxes" onPaste={handlePaste}>
            {digits.map((d, idx) => (
                <input
                    key={idx}
                    ref={(el) => (inputs.current[idx] = el)} // store ref for focus management
                    type="text"
                    inputMode="numeric"   // shows numeric keyboard on mobile
                    maxLength={1}
                    value={d}
                    autoFocus={idx === 0} // focus the first box when modal opens
                    className={`fpm-otp-box ${d ? "filled" : ""}`}
                    onChange={() => {}}   // controlled via onKeyDown — onChange is a no-op
                    onKeyDown={(e) => handleKey(e, idx)}
                    onFocus={(e) => e.target.select()} // select existing digit so it's replaced on type
                    aria-label={`Digit ${idx + 1}`}
                />
            ))}
        </div>
    );
}

function ForgotPasswordModal({ isOpen, onClose }) {
    // Which step the user is on (1 = email, 2 = OTP, 3 = new password)
    const [step, setStep] = useState(1);

    // The email the user typed in Step 1 — reused in Steps 2 and 3
    const [email, setEmail] = useState("");

    // The 6-digit OTP the user types in Step 2
    const [otp, setOtp] = useState("");

    // Short-lived token returned by the backend after OTP is verified
    // Passed to Step 3 to authorise the password change
    const [resetToken, setResetToken] = useState("");

    // New password fields
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Toggle show/hide for each password field
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // True while any API request is in flight (disables buttons)
    const [loading, setLoading] = useState(false);

    // Error message shown in red below the step bar
    const [error, setError] = useState("");

    // True when Step 3 completes successfully — shows a success screen
    const [success, setSuccess] = useState(false);

    // Countdown in seconds before the user can resend the OTP
    const [resendCooldown, setResendCooldown] = useState(0);

    // Tick the resend countdown down by 1 every second
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(id); // cleanup on unmount or re-render
    }, [resendCooldown]);

    // Reset all state back to initial values — called when modal closes
    const reset = () => {
        setStep(1);
        setEmail("");
        setOtp("");
        setResetToken("");
        setPassword("");
        setConfirmPassword("");
        setError("");
        setSuccess(false);
        setResendCooldown(0);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    // ── Step 1: Request OTP ───────────────────────────────────────────────────
    // Sends the user's email to the backend. The backend looks up the account
    // and emails a 6-digit OTP. Always returns a generic success message even
    // if the email doesn't exist (to prevent account enumeration).
    const handleRequestOtp = async (e) => {
        e?.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/password-reset/request/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send code");

            // Move to OTP entry step and start the resend cooldown timer
            setStep(2);
            setResendCooldown(RESEND_COOLDOWN);
        } catch (err) {
            setError(err.message || "Failed to send code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify OTP ────────────────────────────────────────────────────
    // Sends the email + OTP to the backend. The backend:
    //   1. Finds the OTP record in the DB
    //   2. SHA-256 hashes the submitted OTP and compares to stored hash
    //   3. Checks it hasn't expired (10 min TTL) or been used
    //   4. Returns a short-lived reset_token if valid
    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        if (otp.length !== 6) {
            setError("Please enter the full 6-digit code.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/password-reset/verify-otp/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Invalid or expired code");

            // Store the reset_token — needed to authorise the password change in Step 3
            setResetToken(data.reset_token);
            setStep(3);
        } catch (err) {
            setError(err.message || "Invalid or expired code.");
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Set new password ──────────────────────────────────────────────
    // Sends the reset_token + new password to the backend. The backend:
    //   1. Looks up the OTP record by reset_token
    //   2. Checks the token hasn't expired (15 min TTL)
    //   3. Runs Django's password validators (min length, not common, etc.)
    //   4. Hashes and saves the new password
    //   5. Deletes all existing auth tokens (forces re-login on all devices)
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");

        // Frontend validation before hitting the backend
        if (password.length < 10) {
            setError("Password must be at least 10 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/password-reset/confirm/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reset_token: resetToken, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to reset password");

            // Show the success screen
            setSuccess(true);
        } catch (err) {
            setError(err.message || "Failed to reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Don't render anything if the modal is closed
    if (!isOpen) return null;

    // ── Success screen — shown after password is successfully reset ───────────
    if (success) {
        return (
            <div className="modal-overlay" onClick={handleClose}>
                <div className="modal-content fpm-card" onClick={(e) => e.stopPropagation()}>
                    <button className="modal-close" onClick={handleClose} aria-label="Close">×</button>
                    <div className="fpm-success">
                        <div className="fpm-success-icon">✓</div>
                        <h3>Password Updated!</h3>
                        <p>Your password has been reset successfully.</p>
                        <p className="fpm-muted">You can now log in with your new password.</p>
                        <button className="btn btn-primary btn-block fpm-mt" onClick={handleClose}>
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        // Clicking the dark overlay behind the modal closes it
        <div className="modal-overlay" onClick={handleClose}>
            {/* stopPropagation prevents clicks inside the card from closing the modal */}
            <div className="modal-content fpm-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={handleClose} aria-label="Close">×</button>

                <div className="modal-header">
                    <h2>Reset Password</h2>
                </div>

                {/* Visual step indicator at the top of the modal */}
                <StepBar step={step} />

                {error && <p className="auth-error fpm-error">{error}</p>}

                {/* ── Step 1: Email input ── */}
                {step === 1 && (
                    <form onSubmit={handleRequestOtp} className="auth-form">
                        <p className="fpm-hint">
                            Enter your account email and we'll send a 6-digit verification code.
                        </p>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-buttons">
                            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                                Cancel
                            </button>
                            {/* Disabled until the email field is filled */}
                            <button type="submit" className="btn btn-primary" disabled={loading || !email}>
                                {loading ? "Sending…" : "Send Code"}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Step 2: OTP verification ── */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="auth-form">
                        <p className="fpm-hint">
                            We sent a 6-digit code to <strong>{email}</strong>.
                            Check your inbox (and spam folder).
                        </p>

                        <div className="form-group">
                            <label>Verification Code</label>
                            {/* Six individual digit boxes with auto-focus and paste support */}
                            <OtpInput value={otp} onChange={setOtp} />
                        </div>

                        {/* Resend button — locked for 60s after each send to prevent spam */}
                        <div className="fpm-resend">
                            {resendCooldown > 0 ? (
                                <span className="fpm-muted">Resend in {resendCooldown}s</span>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-text"
                                    onClick={() => { setOtp(""); handleRequestOtp(); }}
                                    disabled={loading}
                                >
                                    Resend code
                                </button>
                            )}
                        </div>

                        <div className="form-buttons">
                            <button type="button" className="btn btn-secondary" onClick={() => { setStep(1); setError(""); setOtp(""); }} disabled={loading}>
                                Back
                            </button>
                            {/* Disabled until all 6 digits are entered */}
                            <button type="submit" className="btn btn-primary" disabled={loading || otp.length !== 6}>
                                {loading ? "Verifying…" : "Verify Code"}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Step 3: New password ── */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="auth-form">
                        <p className="fpm-hint">
                            Almost there! Create a strong new password for your account.
                        </p>

                        <div className="form-group">
                            <label>New Password</label>
                            <div className="fpm-pw-wrap">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 10 characters"
                                    required
                                    minLength={10}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="fpm-eye"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? "🙈" : "👁"}
                                </button>
                            </div>
                            {/* Live password strength meter — appears as the user types */}
                            {password && (
                                <PasswordStrength password={password} />
                            )}
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <div className="fpm-pw-wrap">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat your new password"
                                    required
                                    minLength={10}
                                />
                                <button
                                    type="button"
                                    className="fpm-eye"
                                    onClick={() => setShowConfirm((v) => !v)}
                                    aria-label={showConfirm ? "Hide password" : "Show password"}
                                >
                                    {showConfirm ? "🙈" : "👁"}
                                </button>
                            </div>
                            {/* Inline mismatch warning — shown as the user types */}
                            {confirmPassword && password !== confirmPassword && (
                                <span className="fpm-pw-mismatch">Passwords don't match</span>
                            )}
                        </div>

                        {/* Disabled until both fields are valid and matching */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading || password.length < 10 || password !== confirmPassword}
                        >
                            {loading ? "Saving…" : "Reset Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

function PasswordStrength({ password }) {
    let score = 0;
    if (password.length >= 10) score++;          // meets minimum length
    if (password.length >= 14) score++;          // extra points for longer password
    if (/[A-Z]/.test(password)) score++;         // has an uppercase letter
    if (/[0-9]/.test(password)) score++;         // has a number
    if (/[^A-Za-z0-9]/.test(password)) score++;  // has a special character

    const levels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
    const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
    const label = levels[score] || "Very Weak";
    const color = colors[score] || "#ef4444";

    return (
        <div className="fpm-strength">
            {/* 5 coloured bars — filled up to the score level */}
            <div className="fpm-strength-bars">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="fpm-strength-bar"
                        style={{ background: i <= score ? color : "#e5e7eb" }}
                    />
                ))}
            </div>
            <span className="fpm-strength-label" style={{ color }}>{label}</span>
        </div>
    );
}

export default ForgotPasswordModal;
