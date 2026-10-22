import { BrowserRouter, Routes, Route, Navigate, Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import api from "./services/api";
import Login from "./components/Login";
import ProfileDashboard from "./components/ProfileDashboard";
import StagingQueue from "./components/StagingQueue";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import "./App.css";

const SPLASH_MS = 1800;      // total time the splash stays on screen
const SPLASH_FADE_MS = 400;  // crossfade at the end; keep in sync with .splash-screen in App.css (delay = SPLASH_MS - SPLASH_FADE_MS)
const THEME_KEY = "creatorlens-theme";

// --- Theme (VS Code Dark+ / Light+) ---
const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* ignore */ }
  return "dark";
};

function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}

// --- Custom SVG Logo for Navbar ---
const CreatorLensLogo = () => (
  <svg className="brand-logo" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
    <polygon points="12 6 17 12 12 18 7 12 12 6"></polygon>
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
  </svg>
);

const SunIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <line x1="12" y1="2" x2="12" y2="5"></line>
    <line x1="12" y1="19" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="5" y2="12"></line>
    <line x1="19" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"></line>
    <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"></line>
    <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"></line>
    <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"></line>
  </svg>
);

const MoonIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button type="button" className="theme-toggle" onClick={onToggle} aria-label={label} title={label}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

// --- Contact menu (GitHub + LinkedIn) ---
const ContactIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const GitHubIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const LinkedInIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

const CONTACT_LINKS = [
  { label: "GitHub", href: "https://github.com/NartanNaik", Icon: GitHubIcon },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/nartan-naik-90499a359/", Icon: LinkedInIcon }
];

function ContactMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="dropdown-container" ref={containerRef}>
      <button
        type="button"
        className="action-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ContactIcon /> Contact
      </button>

      <div className={`dropdown-menu${open ? " show" : ""}`} role="menu">
        {CONTACT_LINKS.map(({ label, href, Icon }) => (
          <a
            key={label}
            className="dropdown-item"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon /> {label}
          </a>
        ))}
      </div>
    </div>
  );
}

// --- Big animated logo behind the whole app (like VS Code's empty-editor watermark) ---
const BackgroundLogo = () => (
  <div className="bg-watermark" aria-hidden="true">
    <svg className="bg-watermark-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
      <polygon points="12 6 17 12 12 18 7 12 12 6"></polygon>
      <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
    </svg>
  </div>
);

// --- Full-Screen Loading Splash ---
function AppSplash({ onReveal, onComplete }) {
  useEffect(() => {
    const revealTimer = setTimeout(onReveal, SPLASH_MS - SPLASH_FADE_MS);
    const doneTimer = setTimeout(onComplete, SPLASH_MS);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
    };
  }, [onReveal, onComplete]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <svg className="splash-logo" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
          <polygon points="12 6 17 12 12 18 7 12 12 6"></polygon>
          <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
        </svg>
        <span className="splash-text">CreatorLens<span className="splash-dot">.</span></span>
      </div>
    </div>
  );
}

function GlobalLayout({ theme, onToggleTheme }) {
  const [globalCount, setGlobalCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch { /* ignore */ }
    navigate('/login', { replace: true });
  };

  // Stable context object: children that depend on updateGlobalCount no longer re-run every render.
  const outletContext = useMemo(() => ({ updateGlobalCount: setGlobalCount }), []);

  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <div className="brand-container">
            <CreatorLensLogo />
            <span className="brand-text">CreatorLens</span>
          </div>
          <nav className="app-nav">
            <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            <NavLink to="/staging" className={navClass}>Staging Queue</NavLink>
          </nav>
        </div>

        <div className="app-header-right">
          <div className="count-pill" title="Total profiles">
            <svg className="svg-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <span>Total IDs: {globalCount.toLocaleString()}</span>
          </div>
          <ContactMenu />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button onClick={handleLogout} className="action-btn">
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet context={outletContext} />
      </main>
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const handleSplashDone = useCallback(() => setShowSplash(false), []);
  const handleReveal = useCallback(() => setRevealed(true), []);

  return (
    <>
      {showSplash && <AppSplash onReveal={handleReveal} onComplete={handleSplashDone} />}
      <BackgroundLogo />
      <div className={`app-root${revealed ? '' : ' is-hidden'}`}>
        <BrowserRouter>
          <Toaster position="top-center" toastOptions={{ duration: 3000, className: 'app-toast' }} />
          <Routes>
            <Route path="/login" element={<Login theme={theme} />} />
            <Route
              element={
                <ProtectedRoute>
                  <GlobalLayout theme={theme} onToggleTheme={toggleTheme} />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<ProfileDashboard />} />
              <Route path="/staging" element={<StagingQueue />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;