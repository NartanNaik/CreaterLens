import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { startSession } from "../utils/session";

const API_URL = import.meta.env.VITE_API_URL || "";

// --- Unique CreatorLens Cyber-Aperture Logo ---
const CreatorLensIcon = () => (
  <svg className="svg-icon login-logo" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Outer hexagon (tech framing) */}
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
    {/* Inner diamond (the lens) */}
    <polygon points="12 6 17 12 12 18 7 12 12 6"></polygon>
    {/* Core spark (the focal point) */}
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
  </svg>
);

const AlertIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

function Login({ theme = "dark" }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setMessage("");

      const googleToken = credentialResponse.credential;
      if (!googleToken) {
        throw new Error("No credential received from Google.");
      }

      // Send the Google ID token to your backend auth controller
      const { data } = await axios.post(`${API_URL}/api/auth/google`, {
        token: googleToken
      });

      const accessToken = data.token;
      if (!accessToken) {
        throw new Error("Login response did not include a session token.");
      }

      // Store the internal JWT and user profile
      // startSession wipes the previous account's cached data first
      startSession(accessToken, data.user);

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (error.response) {
        const serverMsg = error.response.data?.error || error.response.data?.message;
        if (error.response.status === 429) {
          setMessage("Too many login attempts. Please wait 15 minutes.");
        } else {
          setMessage(serverMsg || `Authentication failed (error ${error.response.status}).`);
        }
      } else if (error.request) {
        setMessage("Cannot reach the server. Check your connection.");
      } else {
        setMessage(error.message || "Unable to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setMessage("Google Sign-In popup was closed or failed. Please try again.");
  };

  return (
    <div className="login-page-container">

      {/* Login Card */}
      <div className="login-card glass-panel">

        {/* Header: centered, symmetric */}
        <div className="login-header-section">
          <div className="login-icon-box">
            <CreatorLensIcon />
          </div>
          <h1 className="login-heading">CreatorLens</h1>
          <p className="login-subheading">Sign in securely with your Google account</p>
        </div>

        <div className="login-form">
          {message && (
            <div className="login-error-box" role="alert">
              <AlertIcon />
              <span>{message}</span>
            </div>
          )}

          <div className="login-google-wrap">
            {loading ? (
              <div className="login-loading">
                <span className="login-spinner" aria-hidden="true" />
                <span>Setting up your secure workspace...</span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                key={theme}
                theme={theme === "light" ? "outline" : "filled_black"}
                logo_alignment="left"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="320"
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;