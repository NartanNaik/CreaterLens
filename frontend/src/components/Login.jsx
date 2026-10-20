import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

// --- Inline SVGs ---
const ShieldIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const AlertIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

function Login() {
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
      localStorage.setItem("token", accessToken);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

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

      {/* Background glow */}
      <div className="login-glow-top" />
      <div className="login-glow-bottom" />

      {/* Login Card */}
      <div className="login-card glass-panel">

        {/* Header: centered, symmetric */}
        <div className="login-header-section">
          <div className="login-icon-box">
            <ShieldIcon />
          </div>
          <h1 className="login-heading">Pink Data</h1>
          <p className="login-subheading">Sign in securely with your Google account</p>
        </div>

        <div className="login-form">
          {message && (
            <div className="login-error-box" role="alert" style={{ marginBottom: "20px" }}>
              <AlertIcon />
              <span>{message}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: "10px" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px" }}>
                <span className="login-spinner" aria-hidden="true" />
                <span>Setting up your secure workspace...</span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="100%"
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;