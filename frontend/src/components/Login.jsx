import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

// --- Inline SVGs ---
const ShieldIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const UserIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LockIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const EyeIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
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

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Passwords are NOT trimmed: trimming silently changes what the user typed
    if (!id.trim() || !password) {
      setMessage("Please enter your ID and password.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const { data } = await axios.post(`${API_URL}/api/auth/login`, {
        id: id.trim(),
        password
      });

      // Backend docs mention access + refresh tokens; store whichever the API returns
      const accessToken = data.token || data.accessToken;
      if (!accessToken) {
        throw new Error("Login response did not include a token.");
      }

      localStorage.setItem("token", accessToken);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error.response) {
        // The backend sends { success:false, error:"..." }; the old code only read .message,
        // so the real reason was never shown.
        const serverMsg = error.response.data?.error || error.response.data?.message;

        if (error.response.status === 429) {
          setMessage("Too many attempts. Please wait a few minutes and try again.");
        } else if (error.response.status === 401) {
          setMessage(serverMsg || "Incorrect ID or password.");
        } else {
          setMessage(serverMsg || `Login failed (error ${error.response.status}).`);
        }
      } else if (error.request) {
        setMessage("Cannot reach the server. Check your connection and try again.");
      } else {
        setMessage(error.message || "Unable to login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    if (message) setMessage("");
  };

  return (
    <div className="login-page-container">

      {/* Background glow */}
      <div className="login-glow-top" />
      <div className="login-glow-bottom" />

      {/* Login Card */}
      <div className="login-card glass-panel">

        {/* Header: centred, symmetric */}
        <div className="login-header-section">
          <div className="login-icon-box">
            <ShieldIcon />
          </div>
          <h1 className="login-heading">Pink Data</h1>
          <p className="login-subheading">Sign in to manage your usernames</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form" noValidate>

          <div className="login-field-group">
            <label htmlFor="login-id" className="login-label">User ID</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><UserIcon /></span>
              <input
                id="login-id"
                type="text"
                placeholder="Enter your ID"
                value={id}
                onChange={(e) => { setId(e.target.value); clearError(); }}
                className="login-input"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                aria-invalid={!!message}
              />
            </div>
          </div>

          <div className="login-field-group">
            <label htmlFor="login-password" className="login-label">Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><LockIcon /></span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                className="login-input"
                autoComplete="current-password"
                aria-invalid={!!message}
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {message && (
            <div className="login-error-box" role="alert">
              <AlertIcon />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-submit-btn"
          >
            {loading && <span className="login-spinner" aria-hidden="true" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default Login;