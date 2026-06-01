/**
 * LegalConsentCheckbox
 *
 * Renders a labeled checkbox that links to one or both of the Terms of Service
 * and Privacy Policy pages. The `type` prop selects which legal documents to
 * reference so the same component can be reused in different signup flows.
 *
 * Props:
 *   checked  (boolean)  — controlled checked state
 *   onChange (function) — change handler passed to the underlying input
 *   type     (string)   — 'both' | 'privacy' | 'terms' (default: 'both')
 *   required (boolean)  — adds an asterisk and the HTML required attribute
 *                         (default: true)
 *
 * Used in: features/auth/SignupPage, features/onboarding/OnboardingPage
 */
import React from "react";
import { Link } from "react-router-dom";

function LegalConsentCheckbox({ checked, onChange, type = "both", required = true }) {
    // Each branch renders a slightly different label; returning null for unknown
    // type values prevents accidental rendering of an empty container
    if (type === "both") {
        return (
            <div className="legal-consent-group">
                <label className="legal-consent-checkbox">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={onChange}
                        required={required}
                    />
                    <span className="checkbox-text">
                        I agree to the{" "}
                        <Link to="/terms-of-service" target="_blank" className="legal-link">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy-policy" target="_blank" className="legal-link">
                            Privacy Policy
                        </Link>
                        {required && <span className="required-asterisk">*</span>}
                    </span>
                </label>
            </div>
        );
    }

    if (type === "privacy") {
        return (
            <div className="legal-consent-group">
                <label className="legal-consent-checkbox">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={onChange}
                        required={required}
                    />
                    <span className="checkbox-text">
                        I agree to the{" "}
                        <Link to="/privacy-policy" target="_blank" className="legal-link">
                            Privacy Policy
                        </Link>
                        {required && <span className="required-asterisk">*</span>}
                    </span>
                </label>
            </div>
        );
    }

    if (type === "terms") {
        return (
            <div className="legal-consent-group">
                <label className="legal-consent-checkbox">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={onChange}
                        required={required}
                    />
                    <span className="checkbox-text">
                        I agree to the{" "}
                        <Link to="/terms-of-service" target="_blank" className="legal-link">
                            Terms of Service
                        </Link>
                        {required && <span className="required-asterisk">*</span>}
                    </span>
                </label>
            </div>
        );
    }

    return null;
}

export default LegalConsentCheckbox;
