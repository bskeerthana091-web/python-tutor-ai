import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import LevelSelection from './components/LevelSelection.jsx';
import MainLearning from './components/MainLearning.jsx';
import Analytics from './components/Analytics.jsx';
import Gamification from './components/Gamification.jsx';
import CodingDuels from './components/CodingDuels.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import DailyChallenge from './components/DailyChallenge.jsx';
import MockInterview from './components/MockInterview.jsx';
import ResumeBuilder from './components/ResumeBuilder.jsx';
import { LanguageProvider } from './components/LanguageContext.jsx';

function NavLink({ to, children }) {
  return (
    <Link to={to} style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.3s', fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap' }}
      onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'}
      onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}>
      {children}
    </Link>
  );
}

function NavBar({ user, onLogout }) {
  const displayName = user?.name || localStorage.getItem('userName') || 'Student';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <nav className="nav-bar" style={{ padding: '10px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/logo.png" alt="PyAI Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PyAI Tutor</h2>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <NavLink to="/learn">📖 Lessons</NavLink>
          <NavLink to="/daily">🎯 Daily Challenge</NavLink>
          <NavLink to="/interview">🎤 Interview</NavLink>
          <NavLink to="/leaderboard">🏆 Leaderboard</NavLink>
          <NavLink to="/analytics">📊 Analytics</NavLink>
          <NavLink to="/resume">📄 Resume</NavLink>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid var(--border)', paddingLeft: '15px' }}>
          <Link 
            to="/gamification" 
            title="Click your avatar to view your Profile & Achievements"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              textDecoration: 'none',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1.5px solid rgba(59, 130, 246, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'; }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</span>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontWeight: 'bold', 
              fontSize: '0.9rem', 
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
            }}>
              {initials}
            </div>
          </Link>
          <button 
            onClick={onLogout} 
            title="Click wrong mark (❌) to logout"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: '#dc2626', 
              border: '1.5px solid #ef4444', 
              color: '#ffffff', 
              padding: '6px 14px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              boxShadow: '0 2px 10px rgba(220, 38, 38, 0.35)',
              transition: 'all 0.2s transform' 
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#b91c1c'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#dc2626'; }}
          >
            <span style={{ fontSize: '1rem', fontWeight: 900 }}>❌</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function PageWithNav({ user, onLogout, children }) {
  return (
    <>
      <NavBar user={user} onLogout={onLogout} />
      {children}
    </>
  );
}

function AppRoutes() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('userName');
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');
    return saved ? { name: saved, role, email } : null;
  });

  const handleLogin = (userInfo) => {
    setUser(userInfo);
  };

  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    setUser(null);
  };

  // Inactivity auto-logout disabled as requested:
  // Logout occurs when the user clicks the wrong mark (❌) on the screen.

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={user ? <Navigate to="/learn" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/level" element={user ? <LevelSelection /> : <Navigate to="/" replace />} />
        <Route path="/learn" element={user ? <PageWithNav user={user} onLogout={handleLogout}><MainLearning user={user} /></PageWithNav> : <Navigate to="/" replace />} />
        <Route path="/analytics" element={user ? <PageWithNav user={user} onLogout={handleLogout}><Analytics user={user} /></PageWithNav> : <Navigate to="/" replace />} />
        <Route path="/gamification" element={user ? <PageWithNav user={user} onLogout={handleLogout}><Gamification user={user} /></PageWithNav> : <Navigate to="/" replace />} />
        <Route path="/leaderboard" element={user ? <PageWithNav user={user} onLogout={handleLogout}><Leaderboard /></PageWithNav> : <Navigate to="/" replace />} />
        <Route path="/daily" element={user ? <PageWithNav user={user} onLogout={handleLogout}><DailyChallenge user={user} /></PageWithNav> : <Navigate to="/" replace />} />
        <Route path="/interview" element={user ? <PageWithNav user={user} onLogout={handleLogout}><MockInterview /></PageWithNav> : <Navigate to="/" replace />} />
        <Route path="/resume" element={user ? <PageWithNav user={user} onLogout={handleLogout}><ResumeBuilder user={user} /></PageWithNav> : <Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AppRoutes />
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
