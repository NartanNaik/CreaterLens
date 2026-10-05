import { BrowserRouter, Routes, Route, Navigate, Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "./services/api";
import Login from "./components/Login";
import ProfileDashboard from "./components/ProfileDashboard";
import StagingQueue from "./components/StagingQueue";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import "./App.css";

const readVideoTheme = () => {
  try {
    return localStorage.getItem('videoTheme') === 'true';
  } catch {
    return false;
  }
};

function GlobalLayout() {
  const [globalCount, setGlobalCount] = useState(0);
  const [isVideoTheme, setIsVideoTheme] = useState(readVideoTheme);
  const location = useLocation();
  const navigate = useNavigate();

  // Refetch on every page change so the count stays correct after approving/rejecting in Staging.
  // (Also only runs once the user is logged in, because this layout now sits inside ProtectedRoute.)
  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await api.get('/profiles/count');
        if (!cancelled && res.data && res.data.success) {
          setGlobalCount(res.data.count);
        }
      } catch (err) {
        console.error("Failed to fetch global count:", err);
      }
    };

    fetchCount();
    return () => { cancelled = true; };
  }, [location.pathname]);

  const toggleVideoTheme = () => {
    setIsVideoTheme(prev => {
      const next = !prev;
      try { localStorage.setItem('videoTheme', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleLogout = () => {
    try { localStorage.removeItem('token'); } catch { /* ignore */ }
    navigate('/login', { replace: true });
  };

  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <div className={`app-shell${isVideoTheme ? ' video-mode' : ''}`}>

      {/* Global Navbar */}
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="brand">Pink Data</h1>

          <nav className="app-nav">
            <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            <NavLink to="/staging" className={navClass}>Staging Queue</NavLink>
          </nav>
        </div>

        <div className="app-header-right">
          {/* Counter lives in the header now. It used to be position:fixed in the top-right
              corner, which sat on top of the theme button. */}
          <div className="count-pill" title="Total profiles">
            <svg className="svg-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <span>Total IDs: {globalCount.toLocaleString()}</span>
          </div>

          <button
            onClick={toggleVideoTheme}
            className={`theme-toggle${isVideoTheme ? ' active' : ''}`}
          >
            {isVideoTheme ? '🌙 Normal Theme' : '🎥 Video Theme'}
          </button>

          <button onClick={handleLogout} className="theme-toggle">
            Log out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main">
        <Outlet context={{ isVideoTheme }} />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#4a044e',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '8px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* FIX: ProtectedRoute now wraps the whole layout. Before, the navbar rendered (and
            fetched the count) for logged-out visitors, and only the page inside was guarded. */}
        <Route
          element={
            <ProtectedRoute>
              <GlobalLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<ProfileDashboard />} />
          <Route path="/staging" element={<StagingQueue />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;