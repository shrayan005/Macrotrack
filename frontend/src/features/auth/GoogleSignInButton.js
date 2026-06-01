/**
 * GoogleSignInButton
 *
 * Renders the official Google OAuth sign-in button. On success it sends the
 * Google credential token to the backend via AuthContext.googleLogin and then
 * navigates to the dashboard.
 *
 * Props:
 *   None
 *
 * Used in: LoginPage.js, SignupPage.js
 */
import React from "react";
import { GoogleLogin } from "@react-oauth/google";
// googleLogin sends the Google credential to the backend for JWT exchange
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

function GoogleSignInButton() {
    const { googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse) => {
        try {
            await googleLogin(credentialResponse.credential);
            navigate("/dashboard");
        } catch (error) {
            alert("Google login failed. Please try again.");
        }
    };

    const handleError = () => {
        alert("Google login failed. Please try again.");
    };

    return (
        <div className="google-signin-container">
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                logo_alignment="left"
            />
        </div>
    );
}

export default GoogleSignInButton;
