import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "./services/api"; 
import Login from "./components/Login";
import ProfileDashboard from "./components/ProfileDashboard";
import StagingQueue from "./components/StagingQueue";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast"; // Replaces ugly alerts
import "./App.css";

// 1. Create a Global Layout Component with the Counter, Branding, and Nav
function GlobalLayout() {
  const [globalCount, setGlobalCount] = useState(0);
  const [isVideoTheme, setIsVideoTheme] = useState(false); // Controls the dynamic video background
  const location = useLocation();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/profiles/count');
        if (res.data && res.data.success) {
          setGlobalCount(res.data.count);
        }
      } catch (err) {
        console.error("Failed to fetch global count:", err);
      }
    };
    
    fetchCount();
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Global Navbar with Branding and Theme Toggle */}
      <header className="bg-white/90 backdrop-blur-md border-b border-pink-200 shadow-sm sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-2xl font-black text-pink-600 tracking-tight">
            Pink Data
          </h1>
          <nav className="hidden md:flex space-x-2">
            <Link 
              to="/dashboard" 
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${location.pathname.includes('/dashboard') ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-pink-50 hover:text-pink-600'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/staging" 
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${location.pathname.includes('/staging') ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-pink-50 hover:text-pink-600'}`}
            >
              Staging Queue
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsVideoTheme(!isVideoTheme)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm flex items-center space-x-2 ${isVideoTheme ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-pink-500 text-white hover:bg-pink-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isVideoTheme ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              )}
            </svg>
            <span>{isVideoTheme ? 'Normal Theme' : 'Video Theme'}</span>
          </button>
        </div>
      </header>

      {/* Sleek Floating Counter */}
      <div className="floating-counter z-50">
        <svg className="counter-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <span>Total IDs: {globalCount}</span>
      </div>
      
      {/* Main Page Content renders here. Passing theme context down to children */}
      <main className="flex-1 relative z-10 h-full overflow-hidden">
        <Outlet context={{ isVideoTheme }} />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* Toast provider injected at root level */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '8px',
          },
        }} 
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* 2. Wrap your protected routes inside the GlobalLayout */}
        <Route element={<GlobalLayout />}>
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <ProfileDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/staging" 
            element={
              <ProtectedRoute>
                <StagingQueue />
              </ProtectedRoute>
            } 
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;