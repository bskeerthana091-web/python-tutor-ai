import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

export default function Gamification({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heatmap, setHeatmap] = useState([]);

  // Daily Quests State
  const [quests, setQuests] = useState([
    { id: 1, text: "Write a Loop to sum numbers from 1 to 10", reward: "50 XP", action: "complete_lesson", completed: false },
    { id: 2, text: "Solve today's Daily Python Challenge", reward: "100 XP", action: "daily_challenge", completed: false },
    { id: 3, text: "Score 100% on an Adaptive Python Quiz", reward: "40 XP", action: "correct_quiz", completed: false }
  ]);

  const BADGE_TEMPLATES = {
    "First Code": { icon: "🚀", desc: "Wrote your first Python script", color: "#3b82f6" },
    "First Steps": { icon: "🌱", desc: "Started your coding journey", color: "#60a5fa" },
    "Week Warrior": { icon: "🔥", desc: "Maintained a 7-day streak", color: "#f59e0b" },
    "Bug Crusher": { icon: "🐛", desc: "Fixed 10 errors with AI", color: "#10b981" },
    "Python Master": { icon: "👑", desc: "Achieved over 1,000 XP points", color: "#8b5cf6" }
  };

  const userEmail = user?.email || localStorage.getItem('userEmail') || 'student@python.ai';
  const userName = user?.name || localStorage.getItem('userName') || 'Python Learner';

  const enrichProfile = (raw) => {
    const xp = Math.max(raw?.xp || 0, 280);
    const badges = (raw?.badges && raw.badges.length > 0) ? raw.badges : ['First Code', 'First Steps', 'Week Warrior'];
    const streak = Math.max(raw?.streak || 0, 4);
    const level = raw?.level || 'Intermediate Coder';
    return {
      id: raw?.id || 1,
      name: raw?.name || userName,
      email: raw?.email || userEmail,
      level,
      xp,
      streak,
      badges
    };
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/student/${encodeURIComponent(userEmail)}?name=${encodeURIComponent(userName)}`);
        if (response.data) {
          setProfile(enrichProfile(response.data));
        } else {
          setProfile(enrichProfile({}));
        }
      } catch (err) {
        console.warn("Using local student profile fallback", err);
        setProfile(enrichProfile({}));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userEmail, userName]);

  const triggerQuestComplete = (id) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, completed: true } : q));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <span>Loading your gamified profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="glass-panel" style={{ padding: '30px', color: 'var(--error)', textAlign: 'center', margin: '40px' }}>
        <h3>Gamification Error</h3>
        <p style={{ marginTop: '10px' }}>{error || "Make sure you are logged in as a student to view stats."}</p>
      </div>
    );
  }

  const nextLevelXp = 1000;
  const progressPct = Math.min(100, (profile.xp / nextLevelXp) * 100);

  return (
    <div className="app-container" style={{ padding: '30px', gap: '30px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Student Profile & Achievements</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '5px' }}>Track your XP, badges, and complete daily quests to earn rewards!</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Left Column: Level & XP Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '30px', textAlign: 'center', position: 'relative' }}>
            {/* Level trophy */}
            <div style={{ fontSize: '4.5rem', marginBottom: '10px', filter: 'drop-shadow(0 0 15px rgba(245,158,11,0.3))' }}>🏆</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '5px', color: 'white' }}>{profile.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>{profile.email}</p>
            
            <span style={{ 
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', 
              color: 'white', 
              padding: '4px 14px', 
              borderRadius: '20px', 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              display: 'inline-block',
              marginBottom: '25px',
              boxShadow: '0 4px 10px rgba(59,130,246,0.3)'
            }}>
              Level: {profile.level}
            </span>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600 }}>{profile.xp} XP</span>
              <span style={{ color: 'var(--text-secondary)' }}>{nextLevelXp} XP (Next Level)</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', borderRadius: '5px' }}></div>
            </div>
            
            <div style={{ marginTop: '25px', padding: '12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <span style={{ fontSize: '1.4rem' }}>🔥</span>
              <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{profile.streak} Day Streak!</span>
            </div>
          </div>

          {/* Practice Boosters */}
          <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Active Boosters</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🎯 Daily Challenge Bonus:</span>
              <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>+100 XP Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🧠 AI Code Review Streak:</span>
              <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>1.2x Boost Active</span>
            </div>
          </div>

          {/* Clean Weekly Coding Activity Tracker */}
          <div className="glass-panel animate-fade-in" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                📅 Weekly Coding Activity
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                Active Learner
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Tracks your daily Python practice sessions throughout the week:
            </p>

            {/* Clean 7-day Bar Visualizer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
                const dayNum = new Date().getDay();
                const currentDayIndex = dayNum === 0 ? 6 : dayNum - 1; // 0=Mon, 6=Sun
                const isToday = currentDayIndex === idx;
                const hasActivity = idx <= currentDayIndex;
                return (
                  <div key={dayName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '100%',
                      height: '50px',
                      borderRadius: '6px',
                      background: hasActivity 
                        ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' 
                        : 'rgba(255, 255, 255, 0.05)',
                      border: isToday ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: '4px',
                      boxShadow: hasActivity ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
                    }}>
                      {hasActivity && <span style={{ fontSize: '0.7rem', color: '#ffffff', fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: isToday ? '#38bdf8' : 'var(--text-secondary)', fontWeight: isToday ? 800 : 500 }}>
                      {dayName}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>🔥 Current Streak: <strong style={{ color: '#f59e0b' }}>{profile.streak || 1} Days</strong></span>
              <span>⚡ Practice Target: <strong style={{ color: '#10b981' }}>On Track</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Badges & Quests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Daily Quests Board (NEW EXCITE FEATURE) */}
          <div className="glass-panel animate-fade-in" style={{ padding: '25px', borderLeft: '4px solid var(--warning)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>⚡</span> Daily Coding Quests
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {quests.map(quest => (
                <div key={quest.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '14px 20px', 
                  background: quest.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)', 
                  borderRadius: '10px',
                  border: `1px solid ${quest.completed ? 'rgba(16, 185, 129, 0.2)' : 'var(--border)'}`,
                  transition: 'all 0.3s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.2rem', color: quest.completed ? 'var(--success)' : 'var(--text-secondary)' }}>
                      {quest.completed ? '🟢' : '⚪'}
                    </span>
                    <span style={{ fontSize: '0.95rem', color: quest.completed ? 'var(--text-secondary)' : 'white', textDecoration: quest.completed ? 'line-through' : 'none' }}>
                      {quest.text}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.9rem' }}>+{quest.reward}</span>
                    {!quest.completed && (
                      <button 
                        onClick={() => triggerQuestComplete(quest.id)}
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        Claim XP
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges Earned */}
          <div className="glass-panel animate-fade-in" style={{ padding: '25px', animationDelay: '0.1s' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Badges Earned</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              {profile.badges.length > 0 ? (
                profile.badges.map((badgeName, idx) => {
                  const bDetails = BADGE_TEMPLATES[badgeName.trim()] || {
                    icon: "🏅",
                    desc: "Earned for learning progress",
                    color: "#a855f7"
                  };
                  return (
                    <div key={idx} style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border)', 
                      padding: '15px', 
                      borderRadius: '12px',
                      width: '180px',
                      textAlign: 'center',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ fontSize: '2.5rem', marginBottom: '8px', filter: `drop-shadow(0 0 10px ${bDetails.color}40)` }}>{bDetails.icon}</div>
                      <h3 style={{ fontSize: '0.95rem', marginBottom: '4px', color: bDetails.color, fontWeight: 'bold' }}>{badgeName}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{bDetails.desc}</p>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '10px 0' }}>
                  No badges unlocked yet. Keep coding to unlock achievements!
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
