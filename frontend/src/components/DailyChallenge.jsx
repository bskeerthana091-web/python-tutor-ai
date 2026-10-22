import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext.jsx';
import { API_BASE_URL } from '../config/api.js';

export default function DailyChallenge({ user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const userEmail = user?.email || localStorage.getItem('userEmail') || 'guest';
  const [challenge, setChallenge] = useState(null);
  
  // Empty starter comment - student writes their own solution code
  const DEFAULT_STARTER = '# Write your Python solution below:\n';
  const [code, setCode] = useState(DEFAULT_STARTER);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showStarSplash, setShowStarSplash] = useState(false);
  const [cheatWarning, setCheatWarning] = useState('');

  const triggerStarSplash = () => {
    setShowStarSplash(true);
    setTimeout(() => setShowStarSplash(false), 3400);
  };

  const triggerCheatWarning = (msg) => {
    setCheatWarning(msg);
    setTimeout(() => setCheatWarning(''), 4500);
  };

  const today = new Date().toISOString().split('T')[0];

  const FALLBACK = {
    id: 0, title: 'Sum of Digits', difficulty: 'Beginner', concept: 'Functions & Loops', xp_reward: 100,
    description: 'Write a function sum_digits(n) that returns the sum of digits.\n\nExample: sum_digits(123) → 6',
    starter_code: DEFAULT_STARTER,
    expected_output: '6', seconds_remaining: 43200, date: today
  };

  useEffect(() => {
    const fetchChallenge = async () => {
      // Check local storage completion for today first
      const doneLocal = localStorage.getItem(`daily_completed_${userEmail}_${today}`);
      if (doneLocal === 'true') {
        setCompleted(true);
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/daily-challenge?email=${encodeURIComponent(userEmail)}`);
        const data = res.data;
        if (data && data.title) {
          setChallenge(data);
          // Never give away the answer! Default only to print("Hello, World!")
          setCode(DEFAULT_STARTER);
          setTimeLeft(data.seconds_remaining || 0);
          if (data.completed_today || doneLocal === 'true') {
            setCompleted(true);
          }
        } else {
          throw new Error('Invalid response');
        }
      } catch {
        setChallenge(FALLBACK);
        setCode(DEFAULT_STARTER);
        setTimeLeft(FALLBACK.seconds_remaining);
      } finally { 
        setLoading(false); 
      }
    };
    fetchChallenge();
  }, [userEmail, today]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const diffColor = { Beginner: '#10b981', Intermediate: '#3b82f6', Advanced: '#8b5cf6' };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/submit-daily`, {
        code, challenge_id: challenge.id, email: userEmail
      });
      setResult(res.data);
      if (res.data.passed) {
        setCompleted(true);
        triggerStarSplash();
        localStorage.setItem(`daily_completed_${userEmail}_${today}`, 'true');
      }
    } catch {
      setResult({ passed: false, output: 'Server unavailable', expected: challenge.expected_output, xp_awarded: 0 });
    } finally { setSubmitting(false); }
  };

  const renderStarSplash = () => {
    if (!showStarSplash) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
        <style>{`
          @keyframes starSplashContinuous {
            0% {
              transform: translateY(0) rotate(0deg) scale(0.7);
              opacity: 0;
            }
            6% {
              opacity: 1;
              transform: translateY(8vh) rotate(40deg) scale(1.1);
            }
            85% {
              opacity: 1;
              transform: translateY(95vh) rotate(280deg) scale(0.95);
            }
            100% {
              transform: translateY(118vh) rotate(360deg) scale(0.9);
              opacity: 0.9;
            }
          }
          .splash-star-item {
            position: absolute;
            animation: starSplashContinuous 1.9s cubic-bezier(0.42, 0, 1, 1) forwards;
            user-select: none;
            line-height: 1;
            pointer-events: none;
          }
        `}</style>
        {[
          // First wave (0.0s - 0.4s)
          { star: '⭐', color: '#fbbf24', size: 28, left: '5%', delay: '0.04s' },
          { star: '✨', color: '#38bdf8', size: 24, left: '13%', delay: '0.14s' },
          { star: '🌟', color: '#f59e0b', size: 32, left: '21%', delay: '0.08s' },
          { star: '★', color: '#c084fc', size: 26, left: '29%', delay: '0.22s' },
          { star: '⭐', color: '#34d399', size: 30, left: '37%', delay: '0.06s' },
          { star: '✨', color: '#f472b6', size: 24, left: '45%', delay: '0.26s' },
          { star: '🌟', color: '#ffd700', size: 34, left: '53%', delay: '0.04s' },
          { star: '★', color: '#60a5fa', size: 26, left: '61%', delay: '0.18s' },
          { star: '⭐', color: '#f87171', size: 28, left: '69%', delay: '0.1s' },
          { star: '✨', color: '#a78bfa', size: 24, left: '77%', delay: '0.24s' },
          { star: '🌟', color: '#fbbf24', size: 32, left: '85%', delay: '0.06s' },
          { star: '★', color: '#4ade80', size: 28, left: '93%', delay: '0.16s' },
          // Second wave (0.5s - 1.1s) - stops spawning after ~1 second
          { star: '⭐', color: '#38bdf8', size: 26, left: '9%', delay: '0.52s' },
          { star: '🌟', color: '#fbbf24', size: 30, left: '18%', delay: '0.68s' },
          { star: '✨', color: '#34d399', size: 24, left: '27%', delay: '0.82s' },
          { star: '★', color: '#f472b6', size: 26, left: '42%', delay: '0.58s' },
          { star: '⭐', color: '#ffd700', size: 32, left: '50%', delay: '0.94s' },
          { star: '✨', color: '#60a5fa', size: 24, left: '58%', delay: '0.72s' },
          { star: '🌟', color: '#a78bfa', size: 30, left: '66%', delay: '1.05s' },
          { star: '★', color: '#4ade80', size: 26, left: '74%', delay: '0.64s' },
          { star: '⭐', color: '#f87171', size: 28, left: '82%', delay: '0.88s' },
          { star: '✨', color: '#fb7185', size: 24, left: '91%', delay: '1.10s' }
        ].map((item, idx) => (
          <div
            key={idx}
            className="splash-star-item"
            style={{
              left: item.left,
              top: '-55px',
              fontSize: `${item.size}px`,
              color: item.color,
              animationDelay: item.delay
            }}
          >
            {item.star}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎯</div>
        <h2 style={{ color: '#e2e8f0' }}>Loading today's challenge...</h2>
      </div>
    </div>
  );

  // Impressive Clash-of-Clans Style Victory Screen with Colorful Star Splash
  if (completed) {
    return (
      <div className="app-container" style={{ 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '30px',
        background: 'radial-gradient(circle at 50% 35%, #0f172a 0%, #060913 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Colorful Stars Splashing from the Top - Plays only ONE time */}
        {renderStarSplash()}

        <div 
          className="glass-panel animate-fade-in" 
          style={{ 
            maxWidth: '620px', 
            width: '100%', 
            padding: '48px 36px', 
            textAlign: 'center',
            borderRadius: '24px',
            border: '2px solid rgba(245, 158, 11, 0.45)',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(20, 20, 35, 0.98))',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(245, 158, 11, 0.25), inset 0 1px 1px rgba(255, 215, 0, 0.3)',
            position: 'relative',
            zIndex: 10
          }}
        >
          {/* Animated Gold Trophy Icon */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            boxShadow: '0 0 40px rgba(245, 158, 11, 0.65), inset 0 2px 4px rgba(255,255,255,0.4)',
            fontSize: '3.4rem',
            border: '4px solid #fef08a'
          }}>
            🏆
          </div>

          <span style={{ 
            display: 'inline-block',
            padding: '6px 18px', 
            borderRadius: '20px', 
            background: 'rgba(245, 158, 11, 0.18)', 
            color: '#fbbf24', 
            fontWeight: 800, 
            fontSize: '0.85rem',
            border: '1.5px solid #f59e0b',
            letterSpacing: '0.5px',
            marginBottom: '16px'
          }}>
            ⚔️ VICTORY • DAILY CHALLENGE CONQUERED
          </span>

          <h1 style={{ 
            fontSize: '2.1rem', 
            fontWeight: 800, 
            color: '#ffffff', 
            margin: '0 0 14px 0',
            lineHeight: '1.2' 
          }}>
            Your daily challenge is completed today!
          </h1>

          <p style={{ color: '#cbd5e1', fontSize: '1.05rem', lineHeight: '1.6', margin: '0 auto 30px auto', maxWidth: '520px' }}>
            Terrific work! You have already finished today's Python daily challenge and collected your <strong style={{ color: '#f59e0b' }}>+100 XP</strong> bonus. Coding consistency unlocks mastery!
          </p>

          {/* Metrics Panel */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '12px', 
            background: 'rgba(0,0,0,0.35)', 
            padding: '18px', 
            borderRadius: '14px', 
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '30px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>XP Earned</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>+100 XP ⭐</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Status</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>✓ Completed</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Next Challenge In</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace', marginTop: '4px' }}>{formatTime(timeLeft)}</div>
            </div>
          </div>

          {/* Navigation Button */}
          <button
            onClick={() => navigate('/learn')}
            className="btn-primary"
            style={{
              padding: '14px 32px',
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 6px 25px rgba(59, 130, 246, 0.45)',
              transition: 'all 0.2s transform'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            📖 Continue Learning in Lessons Tab →
          </button>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  const dc = challenge; // shorthand

  return (
    <div className="daily-challenge-layout" style={{ position: 'relative' }}>
      {/* One-Time Color Star Splash */}
      {renderStarSplash()}

      {/* Floating Anti-Cheating Alert */}
      {cheatWarning && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'linear-gradient(135deg, #dc2626, #991b1b)',
          color: '#ffffff',
          padding: '14px 28px',
          borderRadius: '12px',
          boxShadow: '0 12px 35px rgba(220, 38, 38, 0.5), 0 0 0 2px rgba(254, 202, 202, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: 700,
          fontSize: '0.96rem',
          backdropFilter: 'blur(8px)',
          animation: 'bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <span style={{ fontSize: '1.4rem' }}>🚨</span>
          <span>{cheatWarning}</span>
          <button 
            onClick={() => setCheatWarning('')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer', 
              marginLeft: '12px', 
              fontSize: '1.1rem', 
              fontWeight: 800,
              padding: '0 4px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Left: Challenge Info (Copy Protected) */}
      <div 
        className="glass-panel animate-fade-in" 
        style={{ 
          flex: '1 1 35%', 
          padding: '25px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px', 
          overflowY: 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onCopy={(e) => {
          e.preventDefault();
          triggerCheatWarning('⚠️ Anti-Cheating Alert: Copying daily challenge questions is prohibited! Please solve it on your own.');
        }}
        onCut={(e) => {
          e.preventDefault();
          triggerCheatWarning('⚠️ Anti-Cheating Alert: Cutting question text is prohibited!');
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          triggerCheatWarning('⚠️ Anti-Cheating Alert: Context menu is disabled to prevent copying challenge questions!');
        }}
      >
        {/* Countdown */}
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Today's Challenge Closes In</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>{formatTime(timeLeft)}</div>
        </div>

        {/* Challenge Card */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '2rem' }}>🎯</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>{dc.title || 'Daily Challenge'}</h2>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span style={{ background: `${diffColor[dc.difficulty] || '#3b82f6'}20`, color: diffColor[dc.difficulty] || '#3b82f6', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${diffColor[dc.difficulty] || '#3b82f6'}40` }}>{dc.difficulty || 'Beginner'}</span>
                <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(245,158,11,0.2)' }}>+{dc.xp_reward || 100} XP</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', lineHeight: '1.7', color: '#cbd5e1', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
            {dc.description || 'No description available.'}
          </div>

          <div style={{ marginTop: '12px', padding: '10px 15px', background: 'rgba(139,92,246,0.06)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.15)', fontSize: '0.85rem', color: '#a78bfa' }}>
            📚 Concept: <strong>{dc.concept || 'Python'}</strong>
          </div>
        </div>

        {/* Result message */}
        {result && (
          <div className="animate-fade-in" style={{ padding: '20px', borderRadius: '10px', background: result.passed ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '2rem' }}>{result.passed ? '🎉' : '❌'}</span>
              <div>
                <h3 style={{ margin: 0, color: result.passed ? '#10b981' : '#ef4444' }}>{result.passed ? 'Challenge Passed!' : 'Output Mismatch / Error'}</h3>
                {result.passed && <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold' }}>+{result.xp_awarded} XP Awarded! ⭐</span>}
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              <div style={{ marginBottom: '6px' }}><strong>Your Output:</strong> <code style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{result.output || 'No output'}</code></div>
              {result.error && <div style={{ marginBottom: '6px', color: '#f87171' }}><strong>Error Details:</strong> <pre style={{ margin: '4px 0', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{result.error}</pre></div>}
              <div><strong>Expected Output:</strong> <code style={{ color: '#60a5fa' }}>{result.expected}</code></div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Code Editor (Paste Protected) */}
      <div className="glass-panel animate-fade-in daily-editor-panel" style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', overflow: 'hidden', animationDelay: '0.1s' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#cbd5e1' }}>daily_challenge.py</h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Write your code and click Submit (Pasting is blocked)</span>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {submitting ? '⏳ Testing Solution...' : '🚀 Submit Solution'}
          </button>
        </div>
        <div 
          style={{ flex: 1 }}
          onPaste={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting code is not allowed! Please write your Python solution manually.');
          }}
        >
          <Editor 
            height="100%" 
            defaultLanguage="python" 
            theme="vs-dark" 
            value={code} 
            onChange={setCode}
            onMount={(editor, monaco) => {
              // Block Ctrl+V / Cmd+V and Shift+Insert
              editor.onKeyDown((e) => {
                if ((e.ctrlKey || e.metaKey) && (e.keyCode === 52 || e.code === 'KeyV')) {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting code is not allowed! Please write your Python solution manually.');
                }
                if (e.shiftKey && (e.keyCode === 45 || e.code === 'Insert')) {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting code is not allowed! Please write your Python solution manually.');
                }
              });

              // Also block paste on DOM node
              const domNode = editor.getDomNode();
              if (domNode) {
                domNode.addEventListener('paste', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting code is not allowed! Please write your Python solution manually.');
                }, true);
              }
            }}
            options={{ 
              minimap: { enabled: false }, 
              fontSize: 15, 
              padding: { top: 20 }, 
              fontFamily: "'Fira Code', 'Courier New', monospace",
              contextmenu: false
            }} 
          />
        </div>
      </div>
    </div>
  );
}
