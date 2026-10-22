import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

const MOCK_DATA = [
  { name: 'Arjun Mehta', xp: 4850, level: 12 },
  { name: 'Priya Sharma', xp: 4620, level: 11 },
  { name: 'Rahul Verma', xp: 4310, level: 11 },
  { name: 'Sneha Reddy', xp: 3980, level: 10 },
  { name: 'Karthik Nair', xp: 3750, level: 9 },
  { name: 'Ananya Gupta', xp: 3520, level: 9 },
  { name: 'Vikram Singh', xp: 3290, level: 8 },
  { name: 'Deepika Patel', xp: 3100, level: 8 },
  { name: 'Rohan Kumar', xp: 2870, level: 7 },
  { name: 'Keerthana', xp: 2650, level: 7 },
];

const MEDAL_COLORS = {
  1: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', glow: 'rgba(255, 215, 0, 0.5)', border: '#FFD700', emoji: '🥇', label: 'GOLD' },
  2: { bg: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', glow: 'rgba(192, 192, 192, 0.5)', border: '#C0C0C0', emoji: '🥈', label: 'SILVER' },
  3: { bg: 'linear-gradient(135deg, #CD7F32, #B8690E)', glow: 'rgba(205, 127, 50, 0.5)', border: '#CD7F32', emoji: '🥉', label: 'BRONZE' },
};

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = localStorage.getItem('userName') || '';
  const currentEmail = localStorage.getItem('userEmail') || '';

  useEffect(() => {
    axios.get(`${API_BASE_URL}/leaderboard`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : MOCK_DATA;
        setLeaders(data.length >= 3 ? data : MOCK_DATA);
      })
      .catch(() => setLeaders(MOCK_DATA))
      .finally(() => setLoading(false));
  }, []);

  const getNumericLevel = (player) => {
    if (!player) return 1;
    if (typeof player.level === 'number' && !isNaN(player.level)) return player.level;
    const parsed = parseInt(player.level, 10);
    if (!isNaN(parsed)) return parsed;
    return Math.max(1, Math.floor(((player.xp || 0)) / 100) + 1);
  };

  const maxXP = leaders.length > 0 ? Math.max(1, ...leaders.map(l => l.xp || 0)) : 1;
  const podiumOrder = leaders.length >= 3 ? [leaders[1], leaders[0], leaders[2]] : [];
  const podiumRanks = [2, 1, 3];
  const podiumHeights = ['160px', '210px', '130px'];
  const tableData = leaders.slice(3, 10);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-dark)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Loading Leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', background: 'var(--bg-dark)', padding: '40px 20px', overflow: 'auto' }}>
      <style>{`
        @keyframes podiumGlow {
          0%, 100% { box-shadow: 0 0 20px var(--glow-color); }
          50% { box-shadow: 0 0 45px var(--glow-color), 0 0 80px var(--glow-color); }
        }
        @keyframes currentUserPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.3), inset 0 0 8px rgba(59, 130, 246, 0.05); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(59, 130, 246, 0.1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes podiumRise {
          from { height: 0; opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes crownBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(-5deg); }
          75% { transform: translateY(-3px) rotate(5deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Header */}
      <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '900px', margin: '0 auto 48px' }}>
        <h1 style={{
          fontSize: '2.8rem', fontWeight: 800, margin: 0,
          background: 'linear-gradient(135deg, #e2e8f0 0%, #3b82f6 50%, #60a5fa 100%)',
          backgroundSize: '200% auto',
          animation: 'shimmer 3s linear infinite',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em'
        }}>
          🏆 Global Leaderboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '8px', fontWeight: 400 }}>
          Top Python warriors at JIT Bengaluru
        </p>
      </div>

      {/* Podium Section */}
      {podiumOrder.length === 3 && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '24px',
          maxWidth: '750px', margin: '0 auto 56px', padding: '0 20px'
        }}>
          {podiumOrder.map((player, idx) => {
            const rank = podiumRanks[idx];
            const medal = MEDAL_COLORS[rank];
            const isCurrentUser = (player.name && currentUser && player.name.toLowerCase() === currentUser.toLowerCase()) || 
                                  (player.email && currentEmail && player.email.toLowerCase() === currentEmail.toLowerCase());

            return (
              <div key={rank} className="animate-fade-in" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
                animationDelay: `${idx * 0.15}s`, animationFillMode: 'backwards'
              }}>
                {/* Avatar + Crown */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  {rank === 1 && (
                    <div style={{
                      position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)',
                      fontSize: '2rem', animation: 'crownBounce 2s ease-in-out infinite', zIndex: 2
                    }}>👑</div>
                  )}
                  <div style={{
                    width: rank === 1 ? '90px' : '74px', height: rank === 1 ? '90px' : '74px',
                    borderRadius: '50%', background: medal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: rank === 1 ? '2.2rem' : '1.8rem', fontWeight: 800, color: '#1a1a2e',
                    border: `3px solid ${medal.border}`,
                    boxShadow: `0 0 30px ${medal.glow}`,
                    '--glow-color': medal.glow,
                    animation: 'podiumGlow 3s ease-in-out infinite',
                    transition: 'transform 0.3s ease',
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Name + Stats */}
                <p style={{
                  color: 'var(--text-primary)', fontWeight: 700,
                  fontSize: rank === 1 ? '1.15rem' : '1rem', marginBottom: '4px', textAlign: 'center',
                  maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {player.name}
                </p>
                <span style={{
                  fontSize: '0.8rem', color: medal.border, fontWeight: 600, marginBottom: '6px',
                  background: `${medal.border}15`, padding: '2px 10px', borderRadius: '12px',
                  border: `1px solid ${medal.border}30`
                }}>
                  Lvl {getNumericLevel(player)}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {(player.xp || 0).toLocaleString()} XP
                </span>

                {/* Podium Pillar */}
                <div style={{
                  width: '100%', height: podiumHeights[idx], marginTop: '16px',
                  background: `linear-gradient(180deg, ${medal.border}30 0%, ${medal.border}08 100%)`,
                  borderRadius: '12px 12px 0 0',
                  border: `1px solid ${medal.border}25`,
                  borderBottom: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'podiumRise 0.8s ease-out forwards',
                  animationDelay: `${0.3 + idx * 0.15}s`,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    fontSize: rank === 1 ? '3.5rem' : '2.8rem', opacity: 0,
                    animation: 'countUp 0.5s ease-out forwards',
                    animationDelay: `${0.6 + idx * 0.15}s`
                  }}>
                    {medal.emoji}
                  </span>
                  {isCurrentUser && (
                    <div style={{
                      position: 'absolute', bottom: '12px', fontSize: '0.7rem', color: 'var(--accent-secondary)',
                      fontWeight: 600, background: 'rgba(59,130,246,0.15)', padding: '3px 10px', borderRadius: '8px'
                    }}>YOU</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Section */}
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '800px', margin: '0 auto', padding: '28px', animationDelay: '0.5s', animationFillMode: 'backwards'
      }}>
        <h3 style={{
          fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ opacity: 0.7 }}>📊</span> Rankings
        </h3>

        {/* Table Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 1fr 90px 120px',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em'
        }}>
          <span>Rank</span><span>Name</span><span>Level</span><span style={{ textAlign: 'right' }}>XP</span>
        </div>

        {/* Table Rows */}
        {tableData.map((player, idx) => {
          const rank = idx + 4;
          const isCurrentUser = (player.name && currentUser && player.name.toLowerCase() === currentUser.toLowerCase()) || 
                                (player.email && currentEmail && player.email.toLowerCase() === currentEmail.toLowerCase());
          const xpPercent = Math.round((player.xp / maxXP) * 100);

          return (
            <div key={rank} className="animate-fade-in" style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 90px 120px', alignItems: 'center',
              padding: '14px 16px', borderBottom: '1px solid rgba(30,41,59,0.5)',
              transition: 'all 0.3s ease', cursor: 'default',
              background: isCurrentUser ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
              borderLeft: isCurrentUser ? '3px solid var(--accent-primary)' : '3px solid transparent',
              animation: isCurrentUser ? 'currentUserPulse 3s ease-in-out infinite' : undefined,
              animationDelay: `${0.6 + idx * 0.08}s`, animationFillMode: 'backwards',
              borderRadius: '4px', marginBottom: '2px'
            }}
            onMouseOver={e => { if (!isCurrentUser) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            onMouseOut={e => { if (!isCurrentUser) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Rank */}
              <span style={{
                fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)',
                fontFeatureSettings: '"tnum"'
              }}>
                #{rank}
              </span>

              {/* Name + Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: isCurrentUser
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                    : 'linear-gradient(135deg, #2d3a5c, #1e293b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700, color: isCurrentUser ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${isCurrentUser ? 'var(--accent-primary)' : 'var(--border)'}`,
                  flexShrink: 0
                }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span style={{
                    fontWeight: 600, color: isCurrentUser ? 'var(--accent-secondary)' : 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}>
                    {player.name}
                  </span>
                  {isCurrentUser && (
                    <span style={{
                      marginLeft: '8px', fontSize: '0.7rem', background: 'rgba(59,130,246,0.2)',
                      color: 'var(--accent-secondary)', padding: '2px 8px', borderRadius: '8px', fontWeight: 600
                    }}>YOU</span>
                  )}
                </div>
              </div>

              {/* Level Badge */}
              <span style={{
                background: 'rgba(59,130,246,0.12)', color: 'var(--accent-secondary)',
                padding: '4px 12px', borderRadius: '16px', fontSize: '0.82rem', fontWeight: 600,
                textAlign: 'center', border: '1px solid rgba(59,130,246,0.15)'
              }}>
                Lvl {getNumericLevel(player)}
              </span>

              {/* XP with progress bar */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', fontFeatureSettings: '"tnum"' }}>
                  {(player.xp || 0).toLocaleString()}
                </span>
                <div style={{
                  width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${xpPercent}%`, height: '100%', borderRadius: '2px',
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                    transition: 'width 1s ease-out'
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="animate-fade-in" style={{
        maxWidth: '800px', margin: '24px auto 0', display: 'flex', justifyContent: 'center', gap: '32px',
        animationDelay: '0.9s', animationFillMode: 'backwards'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{leaders.length}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Players</p>
        </div>
        <div style={{ width: '1px', background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
            {leaders.length > 0 ? (leaders[0].xp || 0).toLocaleString() : 0}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Highest XP</p>
        </div>
        <div style={{ width: '1px', background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
            {leaders.length > 0 ? Math.max(...leaders.map(getNumericLevel)) : 1}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Max Level</p>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
