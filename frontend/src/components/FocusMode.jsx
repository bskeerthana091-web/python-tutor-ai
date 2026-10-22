import React, { useState, useEffect, useRef } from 'react';

export default function FocusMode() {
  const [isOpen, setIsOpen] = useState(false);
  const [sounds, setSounds] = useState({ rain: false, keyboard: false, lofi: false });
  const [volume, setVolume] = useState(50);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [focusToday, setFocusToday] = useState(0);
  const audioCtxRef = useRef(null);
  const nodesRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('pyai_focus_today');
    const savedDate = localStorage.getItem('pyai_focus_date');
    const today = new Date().toISOString().split('T')[0];
    if (savedDate === today && saved) setFocusToday(parseInt(saved));
    else { localStorage.setItem('pyai_focus_date', today); localStorage.setItem('pyai_focus_today', '0'); }
  }, []);

  useEffect(() => {
    return () => { stopAllSounds(); if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Pomodoro timer
  useEffect(() => {
    if (!isRunning) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setPomodoroTime(prev => {
        if (prev <= 1) {
          playNotification();
          if (!isBreak) {
            setSessions(s => s + 1);
            setIsBreak(true);
            return 5 * 60;
          } else {
            setIsBreak(false);
            return 25 * 60;
          }
        }
        // Track focus time
        if (!isBreak) {
          setFocusToday(f => {
            const newVal = f + 1;
            localStorage.setItem('pyai_focus_today', String(newVal));
            return newVal;
          });
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isRunning, isBreak]);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtxRef.current;
  };

  const toggleSound = (type) => {
    const newState = !sounds[type];
    setSounds(prev => ({ ...prev, [type]: newState }));
    if (newState) startSound(type); else stopSound(type);
  };

  const startSound = (type) => {
    const ctx = getAudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = volume / 200;
    gain.connect(ctx.destination);

    if (type === 'rain') {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer; source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.5;
      source.connect(filter); filter.connect(gain); source.start();
      nodesRef.current.rain = { source, gain, filter };
    } else if (type === 'lofi') {
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = 60;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 0.2;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain);
      osc.connect(gain); osc.start(); lfo.start();
      nodesRef.current.lofi = { osc, lfo, gain };
    } else if (type === 'keyboard') {
      const interval = setInterval(() => {
        if (!sounds.keyboard && !nodesRef.current.keyboardInterval) return;
        try {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square'; osc.frequency.value = 800 + Math.random() * 400;
          g.gain.setValueAtTime(volume / 500, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 0.05);
        } catch {}
      }, 200 + Math.random() * 300);
      nodesRef.current.keyboardInterval = interval;
      nodesRef.current.keyboard = { gain };
    }
  };

  const stopSound = (type) => {
    const nodes = nodesRef.current[type];
    if (!nodes) return;
    try {
      if (type === 'rain') { nodes.source.stop(); }
      else if (type === 'lofi') { nodes.osc.stop(); nodes.lfo.stop(); }
      else if (type === 'keyboard') { clearInterval(nodesRef.current.keyboardInterval); }
    } catch {}
    delete nodesRef.current[type];
    if (type === 'keyboard') delete nodesRef.current.keyboardInterval;
  };

  const stopAllSounds = () => { ['rain', 'lofi', 'keyboard'].forEach(stopSound); };

  useEffect(() => {
    Object.keys(nodesRef.current).forEach(key => {
      if (nodesRef.current[key]?.gain) {
        try { nodesRef.current[key].gain.gain.value = volume / 200; } catch {}
      }
    });
  }, [volume]);

  const playNotification = () => {
    try {
      const ctx = getAudioCtx(); const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 523.25;
      g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.8);
    } catch {}
  };

  const formatTimer = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const focusMinutes = Math.floor(focusToday / 60);
  const focusHours = Math.floor(focusMinutes / 60);
  const totalSecs = isBreak ? 5 * 60 : 25 * 60;
  const progress = ((totalSecs - pomodoroTime) / totalSecs) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
      {/* Floating Button */}
      <button onClick={() => setIsOpen(!isOpen)} style={{
        position: 'fixed', bottom: '20px', left: '20px', width: '50px', height: '50px', borderRadius: '50%',
        background: isOpen ? 'var(--accent-primary)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer', zIndex: 999,
        boxShadow: '0 4px 20px rgba(59,130,246,0.4)', transition: 'all 0.3s',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>🎵</button>

      {/* Panel */}
      {isOpen && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'fixed', bottom: '80px', left: '20px', width: '300px', padding: '20px', zIndex: 998,
          border: '1px solid rgba(59,130,246,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <h3 style={{ margin: '0 0 15px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎵</span> Focus Mode
          </h3>

          {/* Sound Toggles */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            {[
              { key: 'rain', icon: '🌧️', label: 'Rain' },
              { key: 'keyboard', icon: '⌨️', label: 'Keys' },
              { key: 'lofi', icon: '🎶', label: 'Lo-fi' }
            ].map(s => (
              <button key={s.key} onClick={() => toggleSound(s.key)} style={{
                flex: 1, padding: '10px 5px', borderRadius: '8px', border: `1px solid ${sounds[s.key] ? 'var(--accent-primary)' : 'var(--border)'}`,
                background: sounds[s.key] ? 'rgba(59,130,246,0.15)' : 'rgba(0,0,0,0.2)', color: 'white',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '3px' }}>{s.icon}</div>
                {s.label}
              </button>
            ))}
          </div>

          {/* Volume */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
              <span>Volume</span><span>{volume}%</span>
            </div>
            <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
          </div>

          {/* Pomodoro Timer */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: isBreak ? 'var(--success)' : 'var(--accent-secondary)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isBreak ? '☕ Break Time' : '🧠 Focus Time'}
            </div>
            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 12px' }}>
              <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="55" cy="55" r="45" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
                <circle cx="55" cy="55" r="45" stroke={isBreak ? 'var(--success)' : 'var(--accent-secondary)'} strokeWidth="6" fill="none"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', color: 'white' }}>
                {formatTimer(pomodoroTime)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
              <button onClick={() => setIsRunning(!isRunning)} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                {isRunning ? '⏸ Pause' : '▶ Start'}
              </button>
              <button onClick={() => { setIsRunning(false); setPomodoroTime(25 * 60); setIsBreak(false); }}
                style={{ padding: '6px 16px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}>
                ↺ Reset
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Session {sessions + 1} of 4</span>
            <span>Today: {focusHours > 0 ? `${focusHours}h ` : ''}{focusMinutes % 60}m</span>
          </div>
        </div>
      )}
    </>
  );
}
