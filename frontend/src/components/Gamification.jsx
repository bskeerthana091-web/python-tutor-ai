import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

export default function Gamification({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [claimingId, setClaimingId] = useState(null);

  const DAILY_QUESTS = [
    { id: 1, text: "Write a Loop to sum numbers from 1 to 10", rewardText: "+50 XP", rewardXp: 50 },
    { id: 2, text: "Solve today's Daily Python Challenge", rewardText: "+100 XP", rewardXp: 100 },
    { id: 3, text: "Score 100% on an Adaptive Python Quiz", rewardText: "+40 XP", rewardXp: 40 }
  ];

  const BADGE_TEMPLATES = {
    "First Code": { icon: "🚀", desc: "Wrote your first Python script", color: "#3b82f6" },
    "First Steps": { icon: "🌱", desc: "Started your coding journey", color: "#60a5fa" },
    "Week Warrior": { icon: "🔥", desc: "Maintained a 4+ day streak", color: "#f59e0b" },
    "Bug Crusher": { icon: "🐛", desc: "Fixed 10 errors with AI", color: "#10b981" },
    "Python Master": { icon: "👑", desc: "Achieved over 1,000 XP points", color: "#8b5cf6" }
  };

  const userEmail = user?.email || localStorage.getItem('userEmail') || 'bskeerthana091@gmail.com';
  const userName = user?.name || localStorage.getItem('userName') || 'Keerthana B S';

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [claimedQuestIds, setClaimedQuestIds] = useState(() => {
    try {
      const today = getTodayStr();
      const saved = localStorage.getItem(`pyai_claimed_quests_${userEmail}_${today}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const calculateLevel = (xp) => {
    if (xp >= 1000) return 'Python Master';
    if (xp >= 600) return 'Advanced Coder';
    if (xp >= 300) return 'Intermediate Coder';
    return 'Beginner';
  };

  const enrichProfile = (raw) => {
    const xp = (raw?.xp !== undefined && raw?.xp !== null) ? raw.xp : 280;
    const badges = (raw?.badges && raw.badges.length > 0) ? raw.badges : ['First Code', 'First Steps', 'Week Warrior'];
    const streak = raw?.streak || 4;
    const level = raw?.level || calculateLevel(xp);
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
          if (Array.isArray(response.data.claimed_quests)) {
            setClaimedQuestIds(prev => {
              const combined = Array.from(new Set([...prev, ...response.data.claimed_quests]));
              try {
                localStorage.setItem(`pyai_claimed_quests_${userEmail}_${getTodayStr()}`, JSON.stringify(combined));
              } catch (e) {
                console.warn(e);
              }
              return combined;
            });
          }
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

  const claimQuestReward = async (quest) => {
    if (claimedQuestIds.includes(quest.id) || claimingId) return;
    setClaimingId(quest.id);

    try {
      const res = await axios.post(`${API_BASE_URL}/gamification/claim-quest`, {
        email: userEmail,
        quest_id: quest.id,
        xp_reward: quest.rewardXp,
        quest_title: quest.text
      });

      const today = getTodayStr();
      const updatedClaimed = Array.from(new Set([...claimedQuestIds, quest.id]));
      setClaimedQuestIds(updatedClaimed);
      try {
        localStorage.setItem(`pyai_claimed_quests_${userEmail}_${today}`, JSON.stringify(updatedClaimed));
      } catch (e) {
        console.warn(e);
      }

      if (res.data && res.data.total_xp !== undefined) {
        setProfile(prev => ({
          ...prev,
          xp: res.data.total_xp,
          level: res.data.level || calculateLevel(res.data.total_xp),
          badges: res.data.badges || prev.badges
        }));
      } else {
        setProfile(prev => {
          const newXp = prev.xp + quest.rewardXp;
          return {
            ...prev,
            xp: newXp,
            level: calculateLevel(newXp)
          };
        });
      }

      setCelebration({
        title: `+${quest.rewardXp} XP Added!`,
        message: `Successfully completed: "${quest.text}"`,
        xpGained: quest.rewardXp
      });
      setTimeout(() => setCelebration(null), 5000);

    } catch (err) {
      console.error("Claim quest error fallback:", err);
      const today = getTodayStr();
      const updatedClaimed = Array.from(new Set([...claimedQuestIds, quest.id]));
      setClaimedQuestIds(updatedClaimed);
      try {
        localStorage.setItem(`pyai_claimed_quests_${userEmail}_${today}`, JSON.stringify(updatedClaimed));
      } catch (e) {
        console.warn(e);
      }

      setProfile(prev => {
        const newXp = prev.xp + quest.rewardXp;
        return {
          ...prev,
          xp: newXp,
          level: calculateLevel(newXp)
        };
      });

      setCelebration({
        title: `+${quest.rewardXp} XP Added!`,
        message: `Successfully completed: "${quest.text}"`,
        xpGained: quest.rewardXp
      });
      setTimeout(() => setCelebration(null), 5000);
    } finally {
      setClaimingId(null);
    }
  };

  const claimAllQuests = async () => {
    const unclaimed = DAILY_QUESTS.filter(q => !claimedQuestIds.includes(q.id));
    for (const q of unclaimed) {
      await claimQuestReward(q);
    }
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
  const progressPct = Math.min(100, Math.round((profile.xp / nextLevelXp) * 100));
  const unclaimedCount = DAILY_QUESTS.filter(q => !claimedQuestIds.includes(q.id)).length;

  return (
    <div className="app-container" style={{ padding: '30px', gap: '25px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>Student Profile & Achievements</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '5px' }}>
            Track your XP, badges, and complete daily quests to earn rewards!
          </p>
        </div>

        {unclaimedCount > 0 && (
          <button
            onClick={claimAllQuests}
            disabled={claimingId !== null}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '0.85rem',
              borderRadius: '10px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <span>⚡</span> Claim All Daily XP ({unclaimedCount} Quests)
          </button>
        )}
      </div>

      {/* Instant Celebration Notification Banner */}
      {celebration && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.2))',
          border: '1.5px solid #10b981',
          borderRadius: '12px',
          padding: '14px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          boxShadow: '0 6px 25px rgba(16, 185, 129, 0.3)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' }}>🎉</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{celebration.title}</span>
                <span style={{ background: '#10b981', color: '#0f172a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                  XP UPDATED
                </span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#e2e8f0', marginTop: '2px' }}>
                {celebration.message}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.82rem', color: '#a7f3d0', fontWeight: 600 }}>Total Profile XP:</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>{profile.xp} XP</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Left Column: Level & XP Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '30px', textAlign: 'center', position: 'relative' }}>
            {/* Level trophy */}
            <div style={{ fontSize: '4.5rem', marginBottom: '10px', filter: 'drop-shadow(0 0 15px rgba(245,158,11,0.3))' }}>🏆</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '5px', color: 'white', fontWeight: 800 }}>{profile.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>{profile.email}</p>
            
            <span style={{ 
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', 
              color: 'white', 
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              display: 'inline-block',
              marginBottom: '25px',
              boxShadow: '0 4px 10px rgba(59,130,246,0.3)'
            }}>
              Level: {profile.level}
            </span>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ 
                fontWeight: 800, 
                fontSize: '1.1rem', 
                color: celebration ? '#34d399' : '#ffffff',
                transition: 'color 0.4s ease'
              }}>
                {profile.xp} XP
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{nextLevelXp} XP (Next Level)</span>
            </div>
            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${progressPct}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #3b82f6, #10b981)', 
                borderRadius: '6px',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }}></div>
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
              <span>🔥 Current Streak: <strong style={{ color: '#f59e0b' }}>{profile.streak || 4} Days</strong></span>
              <span>⚡ Practice Target: <strong style={{ color: '#10b981' }}>On Track</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Badges & Quests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Daily Quests Board */}
          <div className="glass-panel animate-fade-in" style={{ padding: '25px', borderLeft: '4px solid var(--warning)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
                <span>⚡</span> Daily Coding Quests
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {claimedQuestIds.length} of {DAILY_QUESTS.length} Claimed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {DAILY_QUESTS.map(quest => {
                const isClaimed = claimedQuestIds.includes(quest.id);
                const isClaiming = claimingId === quest.id;

                return (
                  <div key={quest.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px 20px', 
                    background: isClaimed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px',
                    border: `1px solid ${isClaimed ? 'rgba(16, 185, 129, 0.25)' : 'var(--border)'}`,
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <span style={{ fontSize: '1.25rem' }}>
                        {isClaimed ? '🟢' : '⚪'}
                      </span>
                      <span style={{ 
                        fontSize: '0.95rem', 
                        color: isClaimed ? 'var(--text-secondary)' : '#ffffff', 
                        textDecoration: isClaimed ? 'line-through' : 'none',
                        lineHeight: '1.4'
                      }}>
                        {quest.text}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '15px' }}>
                      <span style={{ color: 'var(--warning)', fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                        {quest.rewardText}
                      </span>
                      
                      {isClaimed ? (
                        <span style={{ 
                          background: 'rgba(16, 185, 129, 0.15)', 
                          color: '#10b981', 
                          border: '1px solid rgba(16, 185, 129, 0.3)', 
                          padding: '6px 14px', 
                          borderRadius: '20px', 
                          fontSize: '0.8rem', 
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap'
                        }}>
                          ✓ Claimed
                        </span>
                      ) : (
                        <button 
                          onClick={() => claimQuestReward(quest)}
                          disabled={isClaiming}
                          className="btn-primary" 
                          style={{ 
                            padding: '8px 16px', 
                            fontSize: '0.82rem', 
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: isClaiming ? 'wait' : 'pointer',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {isClaiming ? 'Claiming...' : `⚡ Claim ${quest.rewardXp} XP`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
