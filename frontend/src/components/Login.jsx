import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">UC</div>
          <h1>Username Checker</h1>
          <p>Sign in to manage your usernames</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="login-id">User ID</label>
            <input
              id="login-id"
              type="text"
              placeholder="Enter your ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          {message && (
            <p className="login-error">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;