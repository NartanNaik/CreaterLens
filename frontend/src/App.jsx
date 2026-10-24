import { BrowserRouter, Routes, Route, Navigate, Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import api from "./services/api";
import Login from "./components/Login";
import ProfileDashboard from "./components/ProfileDashboard";
import StagingQueue from "./components/StagingQueue";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import Setup from "./components/Setup";
import Tour from "./components/Tour";
import { clearSession, getStoredUser, patchStoredUser, getFirstName } from "./utils/session";
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

const MailIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const CONTACT_EMAIL = "naiknartana@gmail.com";

const CONTACT_LINKS = [
  // Opens Gmail's compose window with "To" already filled in
  { label: "Email", href: `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`, Icon: MailIcon },
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

// --- Small shared hook for dropdowns: closes on outside click or Escape ---
function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

const HelpIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const CompassIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
  </svg>
);

const ListIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const LogOutIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

// --- Guide menu: reopen the setup page or the product tour at any time ---
function GuideMenu({ onSetup, onTour }) {
  const { open, setOpen, ref } = useMenu();

  return (
    <div className="dropdown-container" ref={ref} data-tour="guide">
      <button type="button" className="action-btn" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <HelpIcon /> Guide
      </button>
      <div className={`dropdown-menu${open ? " show" : ""}`} role="menu">
        <button type="button" className="dropdown-item" role="menuitem" onClick={() => { setOpen(false); onSetup(); }}>
          <ListIcon /> Setup guide
        </button>
        <button type="button" className="dropdown-item" role="menuitem" onClick={() => { setOpen(false); onTour(); }}>
          <CompassIcon /> Product tour
        </button>
      </div>
    </div>
  );
}

// --- Profile avatar: the first letter of the signed-in user's first name ---
function UserMenu({ user, onLogout }) {
  const { open, setOpen, ref } = useMenu();
  const firstName = getFirstName(user);
  const letter = (firstName.charAt(0) || "?").toUpperCase();

  return (
    <div className="dropdown-container" ref={ref}>
      <button
        type="button"
        className="avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user?.email || firstName}`}
        title={user?.email || firstName}
      >
        {letter}
      </button>
      <div className={`dropdown-menu${open ? " show" : ""}`} role="menu">
        <div className="user-menu-info">
          <span className="user-menu-name">{user?.name || firstName || "Signed in"}</span>
          {user?.email && <span className="user-menu-email">{user.email}</span>}
        </div>
        <button type="button" className="dropdown-item" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>
          <LogOutIcon /> Log out
        </button>
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
  const [tourOpen, setTourOpen] = useState(false);
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const user = getStoredUser();

  const saveFlags = useCallback((flags) => {
    patchStoredUser(flags);
    api.put('/settings/onboarding', flags).catch(() => { /* flags are a convenience, never block the user */ });
  }, []);

  // "Done" / "Skip" on the setup page: remember it, go to the dashboard and start the tour
  const finishSetup = useCallback(() => {
    saveFlags({ onboardingDone: true });
    navigate('/dashboard', { state: { startTour: true } });
  }, [navigate, saveFlags]);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    saveFlags({ tourDone: true });
  }, [saveFlags]);

  // Opened by finishSetup (route state) or by the Guide menu
  useEffect(() => {
    if (location.state?.startTour) {
      setTourOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const handleStepChange = useCallback((step) => {
    if (step.route && pathRef.current !== step.route) navigate(step.route);
  }, [navigate]);

  const tourSteps = useMemo(() => [
    { id: 'welcome', route: '/dashboard', title: 'Welcome to CreatorLens', text: 'A quick tour of the places you will use most. Use the arrow keys or the buttons. You can skip any time.' },
    { id: 'count', route: '/dashboard', selector: '.count-pill', title: 'Your total', text: 'How many creators are saved in your dashboard right now.' },
    { id: 'dashboard', route: '/dashboard', selector: 'a[href="/dashboard"]', title: 'Dashboard', text: 'Your approved creators live here, as a table you can search, sort and edit.' },
    { id: 'search', route: '/dashboard', selector: '.dashboard-container .search-input', title: 'Search and check', text: 'Type a username to find a creator, or to check whether you already have them before adding.' },
    { id: 'actions', route: '/dashboard', selector: '.dashboard-toolbar .dropdown-container', title: 'Actions', text: 'Add your own columns, mass upload usernames, copy every username, or delete all.' },
    { id: 'table', route: '/dashboard', selector: '.table-wrapper', title: 'Your table', text: 'Click a cell to edit it. Right-click a column header to hide or rename it.' },
    { id: 'staging', route: '/staging', selector: 'a[href="/staging"]', title: 'Staging Queue', text: 'New creators wait here for your review before they reach the dashboard.' },
    { id: 'garbage', route: '/staging', selector: '.garbage-panel', title: 'JSON Garbage Eater', text: 'Paste a saved-posts export here and everything is queued at once.' },
    { id: 'review', route: '/staging', selector: '.table-wrapper', isNew: true, title: 'Review the queue', text: 'Scan runs the AI on a row, Approve sends it to the dashboard, Reject removes it. Approve All and Reject All sit at the top.' },
    { id: 'guide', route: '/staging', selector: '[data-tour="guide"]', title: 'Need this again?', text: 'The Guide menu reopens this tour and the setup page whenever you like.' }
  ], []);

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
    clearSession(); // token, user, per-account column settings and every in-memory cache
    navigate('/login', { replace: true });
  };

  // Stable context object: children that depend on updateGlobalCount no longer re-run every render.
  const outletContext = useMemo(() => ({ updateGlobalCount: setGlobalCount, finishSetup }), [finishSetup]);

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
          <GuideMenu onSetup={() => navigate('/setup')} onTour={() => setTourOpen(true)} />
          <ContactMenu />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <UserMenu user={user} onLogout={handleLogout} />
        </div>
      </header>
      <main className="app-main">
        <Outlet context={outletContext} />
      </main>
      {tourOpen && <Tour steps={tourSteps} onClose={closeTour} onStepChange={handleStepChange} />}
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
              <Route path="/setup" element={<Setup />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;