import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
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

function NavBar({ user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const displayName = user?.name || localStorage.getItem('userName') || 'Student';
  const initials = displayName.charAt(0).toUpperCase();

  // Close mobile drawer whenever location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/learn', label: '📖 Lessons' },
    { to: '/daily', label: '🎯 Daily Challenge' },
    { to: '/interview', label: '🎤 Interview' },
    { to: '/leaderboard', label: '🏆 Leaderboard' },
    { to: '/analytics', label: '📊 Analytics' },
    { to: '/resume', label: '📄 Resume' },
    { to: '/gamification', label: '⭐ Profile & XP' }
  ];

  return (
    <>
      <nav className="nav-bar" style={{ padding: '10px 16px', position: 'sticky', top: 0, zIndex: 1000, background: '#111827', borderBottom: '1px solid var(--border)' }}>
        {/* Brand */}
        <Link to="/learn" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="PyAI Logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
            PyAI Tutor
          </h2>
        </Link>

        {/* Desktop Nav Links (Hidden on mobile via CSS) */}
        <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {navItems.slice(0, 6).map(item => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.88rem',
                  whiteSpace: 'nowrap',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right User Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Avatar Profile Link */}
          <Link 
            to="/gamification" 
            title="Profile & Achievements"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              textDecoration: 'none',
              padding: '3px 8px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <span className="user-name-desktop" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <div style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontWeight: 800, 
              fontSize: '0.85rem', 
              border: '1.5px solid rgba(255,255,255,0.25)',
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)'
            }}>
              {initials}
            </div>
          </Link>

          {/* Logout Button */}
          <button 
            onClick={onLogout} 
            title="Click to logout"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: '#dc2626', 
              border: '1px solid #ef4444', 
              color: '#ffffff', 
              padding: '5px 10px', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
            }}
          >
            <span>❌</span>
            <span className="logout-text-desktop">Logout</span>
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle Navigation Menu"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '52px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 15, 28, 0.96)',
          backdropFilter: 'blur(16px)',
          zIndex: 999,
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            Navigation Menu
          </div>
          {navItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.98rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#38bdf8' : '#e2e8f0',
                  background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255,255,255,0.05)'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
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
