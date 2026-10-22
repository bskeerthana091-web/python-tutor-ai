import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

/**
 * Unique Single-Card Auth Page with the "Sliding Blade / Skewed Band" Slit-Scan Transition
 * 
 * - Single, unified, impressive centered card (no two-column split)
 * - Exactly ONE clean switcher for switching between Sign In and Create Account
 * - No demo login button
 * - Fully implements the skewed slit-scan aperture blade from the user's design:
 *   .auth.band : skewed by var(--rake), translated by var(--sweep), overflow: hidden
 *   .band_inner : counters backwards with translateX(calc(-1 * var(--sweep))) skewX(calc(-1 * var(--rake)))
 *   Two lit seams (.band_edge-lead, .band_edge-trail) with laser neon edges
 *   Slices through the headline: Welcome back. / Create account.
 */
export default function Login({ onLogin }) {
  const [activeMode, setActiveMode] = useState('signin'); // 'signin' | 'signup'
  const [targetMode, setTargetMode] = useState('signin');
  const [animating, setAnimating] = useState(false);
  const [sweepDir, setSweepDir] = useState('ltr');

  // Separate Form Fields for Sign In and Sign Up (prevents cross-contamination & autofill bleed)
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  const navigate = useNavigate();
  const authCardRef = useRef(null);
  const panesRef = useRef({});

  // Timing configuration
  const T = {
    total: 750, // total blade sweep duration in ms
    cover: 375  // moment the blade blankets the card to swap states
  };

  // Seed default accounts if none exist
  useEffect(() => {
    try {
      const existing = localStorage.getItem('pyai_accounts');
      if (!existing || JSON.parse(existing).length === 0) {
        const seedAccounts = [
          { name: 'Python Explorer', email: 'student@python.ai', password: 'Password123!', role: 'student' }
        ];
        localStorage.setItem('pyai_accounts', JSON.stringify(seedAccounts));
      }
    } catch {
      localStorage.setItem('pyai_accounts', JSON.stringify([]));
    }
  }, []);

  // Password validation rules (for sign up)
  const hasMinLength = signUpPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(signUpPassword);
  const hasLowercase = /[a-z]/.test(signUpPassword);
  const hasNumber = /[0-9]/.test(signUpPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(signUpPassword);

  const getStrengthPercent = () => {
    let count = 0;
    if (hasMinLength) count++;
    if (hasUppercase) count++;
    if (hasLowercase) count++;
    if (hasNumber) count++;
    if (hasSpecial) count++;
    return (count / 5) * 100;
  };

  const getStrengthColor = () => {
    const pct = getStrengthPercent();
    if (pct <= 40) return '#ef4444';
    if (pct <= 80) return '#f59e0b';
    return '#10b981';
  };

  const getStrengthLabel = () => {
    const pct = getStrengthPercent();
    if (!signUpPassword) return 'None';
    if (pct <= 40) return 'Weak 🔴';
    if (pct <= 80) return 'Medium 🟡';
    return 'Strong 🔥';
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Trigger the Skewed Blade / Band Sweep Transition
  const switchMode = (next) => {
    if (animating || next === activeMode) return;
    setErrorMessage('');
    // Clear inputs when switching mode so credentials never carry over
    if (next === 'signup') {
      setSignUpName('');
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpConfirmPassword('');
    } else {
      setSignInEmail('');
      setSignInPassword('');
    }
    setAnimating(true);
    setTargetMode(next);

    // Direction: signin -> signup sweeps LTR, signup -> signin sweeps RTL
    const direction = next === 'signup' ? 'ltr' : 'rtl';
    setSweepDir(direction);

    if (authCardRef.current) {
      authCardRef.current.dataset.mode = next;
    }

    // Midpoint: trade places under the dark blade
    setTimeout(() => {
      setActiveMode(next);
      const other = next === 'signin' ? 'signup' : 'signin';
      if (panesRef.current[other]) panesRef.current[other].inert = true;
      if (panesRef.current[next]) panesRef.current[next].inert = false;
    }, T.cover);

    // Completion: reset blade ready for next travel
    setTimeout(() => {
      setAnimating(false);
    }, T.total);
  };

  // Handle Authentication Submission
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    let accounts = [];
    try {
      accounts = JSON.parse(localStorage.getItem('pyai_accounts') || '[]');
    } catch {
      accounts = [];
    }

    if (activeMode === 'signup') {
      if (!signUpName.trim()) {
        setErrorMessage('Full name is required');
        triggerShake();
        return;
      }
      if (accounts.some(acc => acc.email.toLowerCase() === signUpEmail.trim().toLowerCase())) {
        setErrorMessage('This email is already registered. Please sign in.');
        triggerShake();
        return;
      }
      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        setErrorMessage('Password must satisfy all strength requirements.');
        triggerShake();
        return;
      }
      if (signUpPassword !== signUpConfirmPassword) {
        setErrorMessage('Passwords do not match.');
        triggerShake();
        return;
      }

      const newAccount = {
        name: signUpName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        password: signUpPassword,
        role: 'student'
      };
      accounts.push(newAccount);
      localStorage.setItem('pyai_accounts', JSON.stringify(accounts));

      localStorage.setItem('userName', newAccount.name);
      localStorage.setItem('userRole', newAccount.role);
      localStorage.setItem('userEmail', newAccount.email);

      // Live sync with backend SQLite database to register student ID
      try {
        const res = await axios.get(`${API_BASE_URL}/student/${encodeURIComponent(newAccount.email)}?name=${encodeURIComponent(newAccount.name)}`);
        if (res.data && res.data.id) {
          localStorage.setItem('studentId', String(res.data.id));
          newAccount.id = res.data.id;
        }
      } catch (err) {
        console.error('Backend student registration sync error:', err);
      }

      if (onLogin) onLogin(newAccount);
      navigate('/level');

    } else {
      const account = accounts.find(
        acc => acc.email.toLowerCase() === signInEmail.trim().toLowerCase() && acc.password === signInPassword
      );

      if (account) {
        localStorage.setItem('userName', account.name);
        localStorage.setItem('userRole', account.role);
        localStorage.setItem('userEmail', account.email);

        // Sync with backend to retrieve student ID and latest stats
        try {
          const res = await axios.get(`${API_BASE_URL}/student/${encodeURIComponent(account.email)}?name=${encodeURIComponent(account.name)}`);
          if (res.data && res.data.id) {
            localStorage.setItem('studentId', String(res.data.id));
            account.id = res.data.id;
          }
        } catch (err) {
          console.error('Backend student login sync error:', err);
        }

        if (onLogin) onLogin(account);
        navigate('/learn');
      } else {
        setErrorMessage('Invalid email or password.');
        triggerShake();
      }
    }
  };

  return (
    <div className="auth_root">
      
      {/* Dynamic Keyframes & Blade Geometry */}
      <style>{`
        :root {
          --rake: -18deg;
          --sweep-start: -160%;
          --sweep-end: 160%;
        }

        .auth_root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #050811;
          position: relative;
          overflow: hidden;
          padding: 24px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-sizing: border-box;
        }

        /* Atmospheric Python Coder Blurred Background */
        .auth_coder_bg {
          position: absolute;
          inset: -30px;
          background-image: url('/python_coder_bg.jpg');
          background-size: cover;
          background-position: center center;
          filter: blur(8px) brightness(0.72) saturate(1.15);
          transform: scale(1.05);
          pointer-events: none;
          z-index: 1;
        }

        .auth_coder_overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(10, 15, 30, 0.25) 0%, rgba(5, 8, 17, 0.65) 100%);
          pointer-events: none;
          z-index: 2;
        }

        /* Ambient floating Python syntax snippets */
        .auth_code_watermark {
          position: absolute;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 0.82rem;
          color: rgba(56, 189, 248, 0.35);
          pointer-events: none;
          user-select: none;
          z-index: 3;
          white-space: pre;
          line-height: 1.6;
          text-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
        }

        @media (max-width: 900px) {
          .auth_code_watermark { display: none; }
        }

        /* Ambient Cyber Grid & Glow Orbs */
        .auth_grid_mesh {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(circle at 50% 50%, black 45%, transparent 85%);
          pointer-events: none;
          z-index: 4;
        }

        .auth_glow_orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          pointer-events: none;
          opacity: 0.5;
          z-index: 5;
        }

        /* Unified Single Card Container */
        .auth_single_card {
          width: 100%;
          max-width: 480px;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(28px);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 38px 36px;
          box-shadow: 
            0 30px 65px -15px rgba(0, 0, 0, 0.85),
            0 0 50px rgba(59, 130, 246, 0.15),
            inset 0 1px 1px rgba(255, 255, 255, 0.12);
          position: relative;
          overflow: hidden; /* Clips the skewed blade cleanly at card boundaries */
          z-index: 10;
          box-sizing: border-box;
        }

        /* Brand Header */
        .auth_brand_header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
          justify-content: center;
        }

        /* The ONLY Mode Switcher */
        .auth_mode_toggle {
          display: flex;
          background: rgba(3, 7, 18, 0.65);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 24px;
          position: relative;
          z-index: 12;
        }

        .auth_mode_btn {
          flex: 1;
          padding: 10px 14px;
          border-radius: 9px;
          border: none;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 700;
          color: #94a3b8;
          background: transparent;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .auth_mode_btn.is-active {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.25));
          border: 1px solid rgba(96, 165, 250, 0.45);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.25);
        }

        /* Under-the-Blade Card Panes */
        .auth_panes {
          position: relative;
          width: 100%;
          min-height: 380px;
        }

        .auth_pane {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 1;
        }

        .auth_pane.is-on {
          position: relative;
          opacity: 1;
          pointer-events: auto;
          z-index: 2;
        }

        /* Headline Slicing Typography */
        .welcome_title {
          font-size: 2.1rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin: 0 0 6px 0;
          line-height: 1.15;
        }

        .welcome_title em {
          font-style: normal;
          background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.45));
        }

        .welcome_sub {
          color: #94a3b8;
          font-size: 0.9rem;
          margin-bottom: 22px;
          line-height: 1.5;
        }

        /* ========================================================
           THE BLADE / BAND (Sliding Skewed Slit-Scan Aperture)
           ======================================================== */
        .auth.band {
          position: absolute;
          top: -15%;
          bottom: -15%;
          left: -25%;
          width: 150%;
          height: 130%;
          background: linear-gradient(145deg, rgba(5, 8, 18, 0.99), rgba(15, 23, 42, 0.99));
          box-shadow: 
            0 0 50px rgba(0, 0, 0, 0.95),
            inset 0 0 40px rgba(56, 189, 248, 0.08);
          overflow: hidden; /* Slices the headline! */
          z-index: 50;
          pointer-events: none;
          opacity: 0;
          transform: skewX(var(--rake)) translateX(-160%);
        }

        /* Two Lit Seams with Neon Glow */
        .band_edge {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 3px;
          pointer-events: none;
          z-index: 60;
        }

        .band_edge-lead {
          right: 0;
          background: linear-gradient(180deg, transparent 0%, #38bdf8 20%, #818cf8 80%, transparent 100%);
          box-shadow: 
            0 0 15px #38bdf8,
            0 0 30px rgba(56, 189, 248, 0.9),
            -4px 0 30px rgba(56, 189, 248, 0.7);
        }

        .band_edge-trail {
          left: 0;
          background: linear-gradient(180deg, transparent 0%, #c084fc 20%, #818cf8 80%, transparent 100%);
          box-shadow: 
            0 0 15px #c084fc,
            0 0 30px rgba(192, 132, 252, 0.9),
            4px 0 30px rgba(192, 132, 252, 0.7);
        }

        /* Counter-Transform inside the Band */
        .band_inner {
          position: absolute;
          top: 11.5%;
          left: 16.6%;
          width: 66.7%;
          height: 77%;
          padding: 38px 36px;
          box-sizing: border-box;
          transform: translateX(160%) skewX(calc(-1 * var(--rake)));
        }

        /* When sweeping LTR (Sign In -> Create Account) */
        .auth.band.sweep-ltr {
          animation: bladeSweepLTR 0.75s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .auth.band.sweep-ltr .band_inner {
          animation: innerCounterSweepLTR 0.75s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }

        /* When sweeping RTL (Create Account -> Sign In) */
        .auth.band.sweep-rtl {
          animation: bladeSweepRTL 0.75s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .auth.band.sweep-rtl .band_inner {
          animation: innerCounterSweepRTL 0.75s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }

        @keyframes bladeSweepLTR {
          0% {
            transform: skewX(var(--rake)) translateX(-160%);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          92% {
            opacity: 1;
          }
          100% {
            transform: skewX(var(--rake)) translateX(160%);
            opacity: 0;
          }
        }

        @keyframes innerCounterSweepLTR {
          0% {
            transform: translateX(160%) skewX(calc(-1 * var(--rake)));
          }
          100% {
            transform: translateX(-160%) skewX(calc(-1 * var(--rake)));
          }
        }

        @keyframes bladeSweepRTL {
          0% {
            transform: skewX(var(--rake)) translateX(160%);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          92% {
            opacity: 1;
          }
          100% {
            transform: skewX(var(--rake)) translateX(-160%);
            opacity: 0;
          }
        }

        @keyframes innerCounterSweepRTL {
          0% {
            transform: translateX(-160%) skewX(calc(-1 * var(--rake)));
          }
          100% {
            transform: translateX(160%) skewX(calc(-1 * var(--rake)));
          }
        }

        .band_badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.4);
          color: #38bdf8;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .band_pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 8px #38bdf8;
        }

        /* Inputs & Buttons */
        .auth_input_group {
          margin-bottom: 16px;
        }

        .auth_label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
          color: #cbd5e1;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .auth_input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.6);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 0.92rem;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .auth_input:focus {
          border-color: #38bdf8;
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.25);
        }

        .auth_input::placeholder {
          color: #64748b;
        }

        .auth_submit_btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.98rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
          margin-top: 10px;
        }

        .auth_submit_btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.5);
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
        }

        .auth_submit_btn:active {
          transform: translateY(0);
        }

        .auth_error_box {
          padding: 10px 14px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 0.84rem;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .shake_anim {
          animation: authShake 0.45s ease-in-out;
        }

        @keyframes authShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>

      {/* Atmospheric Python Coder Blurred Background */}
      <div className="auth_coder_bg" />
      <div className="auth_coder_overlay" />

      {/* Cyber Grid & Ambient Glow */}
      <div className="auth_grid_mesh" />
      <div className="auth_glow_orb" style={{ width: '450px', height: '450px', top: '-10%', left: '15%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)' }} />
      <div className="auth_glow_orb" style={{ width: '400px', height: '400px', bottom: '-10%', right: '15%', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.16) 0%, transparent 70%)' }} />

      {/* Single, Unified, Centered Card */}
      <div className={`auth_single_card ${shake ? 'shake_anim' : ''}`} ref={authCardRef} data-mode={activeMode}>
        
        {/* Top Logo & Title */}
        <div className="auth_brand_header">
          <img src="/logo.png" alt="PyAI Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>PyAI Tutor</h2>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Adaptive Python Intelligence</span>
          </div>
        </div>

        {/* The ONLY Mode Switcher */}
        <div className="auth_mode_toggle">
          <button 
            type="button"
            className={`auth_mode_btn ${activeMode === 'signin' ? 'is-active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            <span>🔓 Sign In</span>
          </button>
          <button 
            type="button"
            className={`auth_mode_btn ${activeMode === 'signup' ? 'is-active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            <span>🚀 Create Account</span>
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="auth_error_box">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Under-the-Blade Card Panes: Two States Trading Places */}
        <div className="auth_panes">
          
          {/* Sign In Pane */}
          <div 
            className={`auth_pane ${activeMode === 'signin' ? 'is-on' : ''}`}
            ref={el => panesRef.current['signin'] = el}
            inert={activeMode !== 'signin' ? '' : undefined}
          >
            <div className="pane_header">
              <h3 className="welcome_title">Welcome <em>back.</em></h3>
              <p className="welcome_sub">Enter your credentials to continue your Python journey.</p>
            </div>

            <form onSubmit={handleAuth} autoComplete="off">
              <div className="auth_input_group">
                <label className="auth_label">Email Address</label>
                <input 
                  type="email" 
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="auth_input" 
                  placeholder="Enter your email address" 
                  required 
                  autoComplete="off"
                />
              </div>

              <div className="auth_input_group">
                <div className="auth_label">
                  <span>Password</span>
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    {showPassword ? 'Hide 👁️' : 'Show 👁️'}
                  </button>
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="auth_input" 
                  placeholder="Enter your password" 
                  required 
                  autoComplete="off"
                />
              </div>

              <button type="submit" className="auth_submit_btn">
                Sign In to PyAI 🔓
              </button>
            </form>
          </div>

          {/* Sign Up / Register Pane */}
          <div 
            className={`auth_pane ${activeMode === 'signup' ? 'is-on' : ''}`}
            ref={el => panesRef.current['signup'] = el}
            inert={activeMode !== 'signup' ? '' : undefined}
          >
            <div className="pane_header">
              <h3 className="welcome_title">Create <em>account.</em></h3>
              <p className="welcome_sub">Join Python AI Tutor and master coding with AI guidance.</p>
            </div>

            <form onSubmit={handleAuth} autoComplete="off">
              <div className="auth_input_group">
                <label className="auth_label">Your Full Name</label>
                <input 
                  type="text" 
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className="auth_input" 
                  placeholder="Enter your full name" 
                  required={activeMode === 'signup'}
                  autoComplete="off"
                />
              </div>

              <div className="auth_input_group">
                <label className="auth_label">Email Address</label>
                <input 
                  type="email" 
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="auth_input" 
                  placeholder="Enter your email ID" 
                  required={activeMode === 'signup'} 
                  autoComplete="off"
                />
              </div>

              <div className="auth_input_group">
                <div className="auth_label">
                  <span>Password</span>
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    {showPassword ? 'Hide 👁️' : 'Show 👁️'}
                  </button>
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  className="auth_input" 
                  placeholder="Enter your password" 
                  required={activeMode === 'signup'} 
                  autoComplete="new-password"
                />
              </div>

              {/* Password Strength Checklist */}
              {signUpPassword && (
                <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Strength:</span>
                    <span style={{ color: getStrengthColor(), fontWeight: 700 }}>{getStrengthLabel()}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ width: `${getStrengthPercent()}%`, height: '100%', background: getStrengthColor(), transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', color: '#94a3b8' }}>
                    <span style={{ color: hasMinLength ? '#10b981' : '#64748b' }}>{hasMinLength ? '✓' : '•'} 8+ Characters</span>
                    <span style={{ color: hasUppercase ? '#10b981' : '#64748b' }}>{hasUppercase ? '✓' : '•'} Uppercase (A-Z)</span>
                    <span style={{ color: hasLowercase ? '#10b981' : '#64748b' }}>{hasLowercase ? '✓' : '•'} Lowercase (a-z)</span>
                    <span style={{ color: hasNumber ? '#10b981' : '#64748b' }}>{hasNumber ? '✓' : '•'} Number (0-9)</span>
                    <span style={{ color: hasSpecial ? '#10b981' : '#64748b', gridColumn: 'span 2' }}>{hasSpecial ? '✓' : '•'} Special Symbol (!@#...)</span>
                  </div>
                </div>
              )}

              <div className="auth_input_group">
                <label className="auth_label">Confirm Password</label>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  className="auth_input" 
                  placeholder="Enter your password again" 
                  required={activeMode === 'signup'}
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="auth_submit_btn">
                Create Account 🚀
              </button>
            </form>
          </div>

        </div>

        {/* ========================================================
           THE SLIDING BLADE: ONE SKEWED RECTANGLE, ONE TRANSLATEX
           ======================================================== */}
        <div className={`auth band ${animating ? (sweepDir === 'ltr' ? 'sweep-ltr' : 'sweep-rtl') : ''}`}>
          {/* One blade, two lit seams */}
          <span className="band_edge band_edge-lead" />
          <span className="band_edge band_edge-trail" />

          {/* Its transform, backwards */}
          <div className="band_inner">
            {/* Back in card co-ordinates */}
            <div className="band page">
              <div className="band_badge">
                <span className="band_pulse" />
                <span>AI MATRIX SHUTTER</span>
              </div>
              <h3 className="welcome_title">
                {targetMode === 'signin' ? (
                  <>Welcome <em>back.</em></>
                ) : (
                  <>Create <em>account.</em></>
                )}
              </h3>
              <p className="welcome_sub" style={{ color: '#38bdf8' }}>
                {targetMode === 'signin' ? 'Syncing your Python learning trajectory...' : 'Configuring personalized AI curriculum...'}
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
