import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// --- Inline SVGs (No Emojis) ---
const ShieldIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const UserIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LockIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!id.trim() || !password.trim()) {
      setMessage("Please enter ID and password.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          id: id.trim(),
          password: password.trim()
        }
      );

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      
      {/* Background Cinematic Glow */}
      <div className="login-glow-top" />
      <div className="login-glow-bottom" />

      {/* Login Card */}
      <div className="login-card glass-panel">
        
        {/* Header */}
        <div className="login-header-section">
          <div className="login-icon-box">
            <ShieldIcon />
          </div>
          <h1 className="login-heading">Pink Data</h1>
          <p className="login-subheading">Sign in to manage your usernames</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          
          <div className="login-field-group">
            <label htmlFor="login-id" className="login-label">
              <UserIcon /> User ID
            </label>
            <input
              id="login-id"
              type="text"
              placeholder="Enter your ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="login-input"
            />
          </div>

          <div className="login-field-group">
            <label htmlFor="login-password" className="login-label">
              <LockIcon /> Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="login-submit-btn"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {message && (
            <div className="login-error-box">
              <AlertIcon />
              <span>{message}</span>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}

export default Login;