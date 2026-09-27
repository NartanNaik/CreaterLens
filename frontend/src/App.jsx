import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "./services/api"; 
import Login from "./components/Login";
import ProfileDashboard from "./components/ProfileDashboard";
import StagingQueue from "./components/StagingQueue";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

// 1. Create a Global Layout Component with the Counter
function GlobalLayout() {
  const [globalCount, setGlobalCount] = useState(0);

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
    <div className="min-h-screen flex flex-col">
      {/* Global Top Navbar */}
{/* Sleek Floating Counter wired to App.css */}
      <div className="floating-counter">
        <svg className="counter-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <span>Total IDs: {globalCount}</span>
      </div>
      
      {/* Main Page Content renders here */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
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