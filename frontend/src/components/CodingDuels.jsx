import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { WS_BASE_URL } from '../config/api.js';

export default function CodingDuels() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState(localStorage.getItem('userName') || 'Keerthana');
  const [opponents, setOpponents] = useState({}); // mapping: username -> progress
  const [myProgress, setMyProgress] = useState(0);
  const [myCode, setMyCode] = useState('# Write a function find_evens(nums) that returns a list of even numbers\n\ndef find_evens(nums):\n    ');
  const [gameState, setGameState] = useState('lobby'); // lobby, active, won, lost
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Exciting Gamified States
  const [mana, setMana] = useState(100);
  const [isBlurred, setIsBlurred] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isShielded, setIsShielded] = useState(false);
  const [spellLog, setSpellLog] = useState([]);

  const wsRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Mana Regeneration Loop
  useEffect(() => {
    if (!joined || gameState !== 'active') return;
    const interval = setInterval(() => {
      setMana(prev => Math.min(100, prev + 5));
    }, 2000);
    return () => clearInterval(interval);
  }, [joined, gameState]);

  // Calculate my code progress dynamically based on coding target
  useEffect(() => {
    if (gameState !== 'active') return;

    let progress = 0;
    if (myCode.includes('def find_evens')) progress += 25;
    if (myCode.includes('for') || myCode.includes('in nums') || (myCode.includes('[') && myCode.includes('for'))) progress += 25;
    if (myCode.includes('% 2 == 0') || myCode.includes('%2==0')) progress += 25;
    if (myCode.includes('return')) progress += 25;

    setMyProgress(progress);

    // Sync progress to all opponents in the room
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'progress',
        username: username,
        progress: progress
      }));
    }

    if (progress === 100) {
      handleWin();
    }
  }, [myCode, gameState]);

  const handleJoin = () => {
    if (!roomId.trim()) return;

    const ws = new WebSocket(`${WS_BASE_URL}/collaborate/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setJoined(true);
      setGameState('active');
      setOpponents({});
      setSpellLog(["⚔️ Entered Arena. Mana charging up!"]);
      
      // Announce entry
      ws.send(JSON.stringify({
        type: 'join',
        username: username
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'join') {
        // Add new opponent
        setOpponents(prev => ({ ...prev, [msg.username]: 0 }));
        // Reply with our identity and current progress
        ws.send(JSON.stringify({
          type: 'identity',
          username: username,
          progress: myProgress
        }));
        setSpellLog(prev => [...prev, `👤 ${msg.username} entered the race!`]);
      } else if (msg.type === 'identity') {
        // Save opponent details
        setOpponents(prev => ({ ...prev, [msg.username]: msg.progress }));
      } else if (msg.type === 'progress') {
        // Update progress of specific opponent
        setOpponents(prev => ({ ...prev, [msg.username]: msg.progress }));
      } else if (msg.type === 'cast_spell') {
        if (msg.target === username) {
          handleIncomingSpell(msg.spell, msg.sender);
        }
      } else if (msg.type === 'spell_deflected') {
        if (msg.target === username) {
          setSpellLog(prev => [...prev, `🛡️ Spell deflected! ${msg.sender} has a Shield.`]);
        }
      } else if (msg.type === 'status') {
        if (msg.status === 'won') {
          handleLose(msg.username);
        }
      } else if (msg.type === 'chat') {
        setMessages(prev => [...prev, { sender: msg.username, text: msg.text }]);
      }
    };

    ws.onclose = () => {
      setJoined(false);
      setGameState('lobby');
    };
  };

  const castSpell = (spellType, targetUser) => {
    let cost = 0;
    if (spellType === 'blur') cost = 35;
    if (spellType === 'freeze') cost = 50;
    if (spellType === 'shield') cost = 25;

    if (mana < cost) return;
    setMana(prev => prev - cost);
    playSound('spell_cast');

    if (spellType === 'shield') {
      setIsShielded(true);
      setSpellLog(prev => [...prev, "🛡️ Shield activated (lasts 12s)!"]);
      setTimeout(() => setIsShielded(false), 12000);
    } else {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'cast_spell',
          spell: spellType,
          target: targetUser,
          sender: username
        }));
      }
      setSpellLog(prev => [...prev, `🌌 Casted ${spellType} spell on ${targetUser}!`]);
    }
  };

  const handleIncomingSpell = (spellType, caster) => {
    if (isShielded) {
      // Deflect spell back to caster
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'spell_deflected',
          sender: username,
          target: caster
        }));
      }
      setSpellLog(prev => [...prev, `🛡️ You deflected ${spellType} spell from ${caster}!`]);
      return;
    }

    playSound('spell_hit');
    if (spellType === 'blur') {
      setIsBlurred(true);
      setSpellLog(prev => [...prev, `🌌 Blurred by ${caster} (7s)!`]);
      setTimeout(() => setIsBlurred(false), 7000);
    } else if (spellType === 'freeze') {
      setIsFrozen(true);
      setSpellLog(prev => [...prev, `❄️ Frozen by ${caster} (3s)!`]);
      setTimeout(() => setIsFrozen(false), 3000);
    }
  };

  const handleWin = () => {
    setGameState('won');
    playSound('win');
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'status',
        status: 'won',
        username: username
      }));
    }
  };

  const handleLose = (winner) => {
    setGameState('lost');
    playSound('lose');
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      username: username,
      text: chatInput
    }));
    setMessages(prev => [...prev, { sender: 'You', text: chatInput }]);
    setChatInput('');
  };

  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'spell_cast') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      } else if (type === 'spell_hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, ctx.currentTime);
        osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(392.00, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch (e) {
      console.log("Audio API not supported.");
    }
  };

  if (!joined) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '460px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>⚔️</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px' }}>PyAI Coding Duels</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '30px' }}>
            Enter a room code to race against other online students in real-time. Only racers inside this room will be visible!
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" 
              placeholder="Enter Room ID (e.g. class101)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '1rem', outline: 'none' }}
            />
            <button onClick={handleJoin} className="btn-primary" style={{ padding: '14px', fontSize: '1rem' }}>
              Enter Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  const otherRacers = Object.keys(opponents);

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '25px', height: 'calc(100vh - 70px)', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Left panel: Duel details, opponents progress, and Spells */}
      <div className="glass-panel" style={{ flex: '1 1 35%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        <div>
          <span style={{ background: 'var(--error)', fontSize: '0.75rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', color: 'white' }}>ACTIVE DUEL</span>
          <h3 style={{ marginTop: '10px', fontSize: '1.3rem' }}>Challenge: Filter Even Numbers</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '5px' }}>
            Write a Python function named <code style={{ color: 'var(--accent-secondary)' }}>find_evens(nums)</code> that accepts a list of integers and returns a new list containing only the even numbers.
          </p>
        </div>

        {/* Progress trackers (Displays ONLY active opponents in room) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.9rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Racers in Room</h4>
          
          {/* Me */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
              <strong>{username} (You) {isShielded && "🛡️"}</strong>
              <span>{myProgress}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <div style={{ width: `${myProgress}%`, height: '100%', background: 'var(--success)', borderRadius: '4px', transition: 'width 0.3s' }}></div>
            </div>
          </div>

          {/* Opponents */}
          {otherRacers.length > 0 ? (
            otherRacers.map(opponent => (
              <div key={opponent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                  <strong>👤 {opponent}</strong>
                  <span>{opponents[opponent]}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                  <div style={{ width: `${opponents[opponent]}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '4px', transition: 'width 0.3s' }}></div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
              Waiting for other students to join this room...
            </div>
          )}
        </div>

        {/* Gamified Mana & Actions Card */}
        <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>⚡ Mana Level:</span>
            <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{mana} MP</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${mana}%`, height: '100%', background: 'var(--accent-secondary)', borderRadius: '4px', transition: 'width 0.2s' }}></div>
          </div>

          {/* Cast spells buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sabotage Opponents:</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                onClick={() => otherRacers.length > 0 && castSpell('blur', otherRacers[0])}
                disabled={mana < 35 || otherRacers.length === 0}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid var(--accent-primary)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: (mana >= 35 && otherRacers.length > 0) ? 'pointer' : 'default',
                  opacity: (mana >= 35 && otherRacers.length > 0) ? 1 : 0.5
                }}
              >
                🌌 Blur Screen (35 MP)
              </button>

              <button 
                onClick={() => otherRacers.length > 0 && castSpell('freeze', otherRacers[0])}
                disabled={mana < 50 || otherRacers.length === 0}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid var(--accent-secondary)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: (mana >= 50 && otherRacers.length > 0) ? 'pointer' : 'default',
                  opacity: (mana >= 50 && otherRacers.length > 0) ? 1 : 0.5
                }}
              >
                ❄️ Freeze Code (50 MP)
              </button>
            </div>

            <button 
              onClick={() => castSpell('shield', '')}
              disabled={mana < 25}
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid var(--success)',
                color: 'white',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: mana >= 25 ? 'pointer' : 'default',
                opacity: mana >= 25 ? 1 : 0.5
              }}
            >
              🛡️ Shield Defense (25 MP)
            </button>
          </div>
        </div>

        {/* Combat Spell Log */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Arena Activity</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {spellLog.map((log, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '3px' }}>
                {log}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right panel: Monaco Editor */}
      <div className="glass-panel" style={{ 
        flex: '1 1 65%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        position: 'relative',
        border: isShielded ? '2px solid var(--success)' : '1px solid var(--border)',
        boxShadow: isShielded ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none',
        transition: 'all 0.3s'
      }}>
        
        {/* Frozen screen overlay block */}
        {isFrozen && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(59, 130, 246, 0.25)',
            backdropFilter: 'blur(3px)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            animation: 'fadeIn 0.2s'
          }}>
            <div style={{ textAlign: 'center', background: '#0a0f1c', padding: '20px 40px', borderRadius: '12px', border: '2px solid var(--accent-secondary)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <span style={{ fontSize: '3rem' }}>❄️</span>
              <h3 style={{ margin: '10px 0 0 0', fontWeight: 'bold' }}>FROZEN BY OPPONENT!</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Wait 3 seconds to resume typing...</p>
            </div>
          </div>
        )}

        {gameState === 'won' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(16, 185, 129, 0.95)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', animation: 'fadeIn 0.4s' }}>
            <span style={{ fontSize: '4.5rem' }}>🏆</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>VICTORY!</h2>
            <p>You solved the challenge first! Earned +50 XP!</p>
            <button onClick={() => { setJoined(false); setGameState('lobby'); }} className="btn-primary" style={{ marginTop: '20px', background: 'white', color: 'var(--success)', padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Leave Arena</button>
          </div>
        )}

        {gameState === 'lost' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(239, 68, 68, 0.95)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', animation: 'fadeIn 0.4s' }}>
            <span style={{ fontSize: '4.5rem' }}>💀</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>DEFEAT</h2>
            <p>An opponent solved the challenge first. Nice try!</p>
            <button onClick={() => { setJoined(false); setGameState('lobby'); }} className="btn-primary" style={{ marginTop: '20px', background: 'white', color: 'var(--error)', padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Leave Arena</button>
          </div>
        )}

        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>duel_editor.py</h3>
          {isShielded && <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold' }}>🛡️ Shield Active</span>}
        </div>

        {/* Monaco Editor Container (Blurs if blurred spell hits) */}
        <div style={{ 
          flex: 1, 
          filter: isBlurred ? 'blur(6px)' : 'none', 
          transition: 'filter 0.3s ease-in-out',
          pointerEvents: isFrozen ? 'none' : 'auto' 
        }}>
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={myCode}
            onChange={setMyCode}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 20 },
              fontFamily: "'Fira Code', 'Courier New', monospace",
              readOnly: isFrozen
            }}
          />
        </div>
      </div>
    </div>
  );
}
