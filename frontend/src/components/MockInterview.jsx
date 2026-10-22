import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { useLanguage } from './LanguageContext.jsx';
import { API_BASE_URL } from '../config/api.js';

export default function MockInterview() {
  const { t } = useLanguage();
  const [phase, setPhase] = useState('lobby'); // lobby, active, results
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timer, setTimer] = useState(30 * 60);
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [cheatWarning, setCheatWarning] = useState('');
  const timerRef = useRef(null);

  const triggerCheatWarning = (msg) => {
    setCheatWarning(msg);
    setTimeout(() => setCheatWarning(''), 4500);
  };

  // Timer countdown
  useEffect(() => {
    if (phase !== 'active' || !timerRef.current === null) return;
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); finishInterview(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/get-interview-questions`, { difficulty: 'Fresher', count: 5 });
      setQuestions(res.data.questions);
      setTimer(res.data.time_limit_minutes * 60);
    } catch {
      // Fallback questions
      setQuestions([
        { id: 1, category: 'Core Python', type: 'theory', question: 'What is the difference between a list and a tuple in Python?' },
        { id: 2, category: 'Data Structures', type: 'theory', question: 'What is a dictionary comprehension? Give an example.' },
        { id: 3, category: 'OOP', type: 'theory', question: 'Explain the four pillars of Object-Oriented Programming.' },
        { id: 4, category: 'Problem Solving', type: 'code', question: 'Write a function to check if two strings are anagrams.' },
        { id: 5, category: 'Core Python', type: 'theory', question: 'What is the difference between == and is in Python?' }
      ]);
      setTimer(30 * 60);
    }
    setPhase('active'); setCurrentIdx(0); setAnswers({}); setEvaluations({}); setShowFeedback(false); setLoading(false);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;
    setEvaluating(true);
    const q = questions[currentIdx];
    setAnswers(prev => ({ ...prev, [q.id]: currentAnswer }));

    try {
      const res = await axios.post(`${API_BASE_URL}/evaluate-answer`, { question_id: q.id, answer: currentAnswer, difficulty: 'Fresher' });
      setEvaluations(prev => ({ ...prev, [q.id]: res.data }));
    } catch {
      setEvaluations(prev => ({ ...prev, [q.id]: { score: 50, feedback: 'Could not connect to evaluator. Score estimated.', ideal_answer: 'N/A', keywords_matched: 0, total_keywords: 5 } }));
    }
    setShowFeedback(true); setEvaluating(false);
    playSubmitSound();
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1); setCurrentAnswer(''); setShowFeedback(false);
    } else finishInterview();
  };

  const finishInterview = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('results');
  };

  const playSubmitSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 600;
      g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getScoreColor = (s) => s >= 80 ? 'var(--success)' : s >= 50 ? 'var(--warning)' : 'var(--error)';

  // ===== LOBBY =====
  if (phase === 'lobby') return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '30px' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '50px', maxWidth: '550px', width: '100%', textAlign: 'center', border: '1px solid rgba(59,130,246,0.12)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '15px', filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))' }}>🎯</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg, #fff, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Python Mock Interview
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
          Simulate a real Python developer interview with AI-powered evaluation
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
          {[{ icon: '📝', text: '5 Questions' }, { icon: '⏱️', text: '30 Minutes' }, { icon: '🤖', text: 'AI Evaluated' }].map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{item.icon}</div>
              {item.text}
            </div>
          ))}
        </div>

        <div className="glass-panel" style={{ padding: '18px', marginBottom: '25px', textAlign: 'left', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--accent-secondary)' }}>💡 Interview Tips</h4>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.8', paddingLeft: '18px' }}>
            <li>Use proper Python terminology</li>
            <li>Include code examples where possible</li>
            <li>Explain your thought process clearly</li>
            <li>Mention edge cases and time complexity</li>
          </ul>
        </div>

        <button onClick={startInterview} disabled={loading} className="btn-primary" style={{ padding: '16px 40px', fontSize: '1.1rem', fontWeight: 700, width: '100%', borderRadius: '12px' }}>
          {loading ? '⏳ Preparing...' : 'Start Interview 🎯'}
        </button>
      </div>
    </div>
  );

  // ===== ACTIVE INTERVIEW =====
  if (phase === 'active') {
    const q = questions[currentIdx];
    const evaluation = evaluations[q?.id];
    const timerPct = (timer / (30 * 60)) * 100;
    const circumference = 2 * Math.PI * 22;
    const dashOffset = circumference - (timerPct / 100) * circumference;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', padding: '20px', gap: '15px', position: 'relative' }}>
        {/* Floating Anti-Cheating Alert Banner */}
        {cheatWarning && (
          <div style={{
            position: 'fixed',
            top: '20px',
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

        {/* Top Bar */}
        <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ position: 'relative', width: '50px', height: '50px' }}>
              <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="25" cy="25" r="22" stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
                <circle cx="25" cy="25" r="22" stroke={timer < 120 ? 'var(--error)' : 'var(--accent-secondary)'} strokeWidth="3" fill="none"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" />
              </svg>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace', color: timer < 120 ? 'var(--error)' : 'white' }}>
                {formatTime(timer)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Question {currentIdx + 1} of {questions.length}</span>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                {questions.map((_, i) => (
                  <div key={i} style={{ width: '24px', height: '4px', borderRadius: '2px', background: i < currentIdx ? 'var(--success)' : i === currentIdx ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>
          </div>
          <span style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', padding: '4px 14px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(139,92,246,0.2)' }}>
            {q?.category}
          </span>
        </div>

        {/* Question + Answer */}
        <div style={{ flex: 1, display: 'flex', gap: '15px', overflow: 'hidden' }}>
          {/* Question (Copy Protected) */}
          <div 
            className="glass-panel" 
            style={{ 
              flex: '1 1 40%', 
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
              triggerCheatWarning('⚠️ Anti-Cheating Alert: Copying interview questions is strictly prohibited! Please answer on your own.');
            }}
            onCut={(e) => {
              e.preventDefault();
              triggerCheatWarning('⚠️ Anti-Cheating Alert: Cutting question text is prohibited!');
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              triggerCheatWarning('⚠️ Anti-Cheating Alert: Context menu is disabled to prevent copying question content!');
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: q?.type === 'code' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)', color: q?.type === 'code' ? 'var(--accent-secondary)' : 'var(--warning)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                {q?.type === 'code' ? '💻 Code' : '📝 Theory'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: '1.6', color: 'white' }}>{q?.question}</h2>

            {/* Feedback Card */}
            {showFeedback && evaluation && (
              <div className="animate-fade-in" style={{ padding: '18px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: getScoreColor(evaluation.score) }}>{evaluation.score}%</div>
                  <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${evaluation.score}%`, height: '100%', background: getScoreColor(evaluation.score), borderRadius: '4px', transition: 'width 0.5s' }} />
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px' }}>{evaluation.feedback}</p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Keywords matched: {evaluation.keywords_matched}/{evaluation.total_keywords}</div>
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--accent-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>View Ideal Answer</summary>
                  <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '6px' }}>{evaluation.ideal_answer}</p>
                </details>
              </div>
            )}
          </div>

          {/* Answer Input (Paste Protected) */}
          <div className="glass-panel" style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Your Answer (Type manually • Pasting is blocked)</span>
              {!showFeedback ? (
                <button onClick={submitAnswer} disabled={evaluating || !currentAnswer.trim()} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                  {evaluating ? '⏳ Evaluating...' : '✓ Submit Answer'}
                </button>
              ) : (
                <button onClick={nextQuestion} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                  {currentIdx < questions.length - 1 ? 'Next Question →' : 'Finish Interview'}
                </button>
              )}
            </div>
            <div 
              style={{ flex: 1 }}
              onPaste={(e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting answers from external sources is strictly prohibited! Please type your answer manually.');
              }}
            >
              {q?.type === 'code' ? (
                <Editor 
                  height="100%" 
                  defaultLanguage="python" 
                  theme="vs-dark" 
                  value={currentAnswer} 
                  onChange={setCurrentAnswer}
                  onMount={(editor, monaco) => {
                    editor.onKeyDown((e) => {
                      if ((e.ctrlKey || e.metaKey) && (e.keyCode === 52 || e.code === 'KeyV')) {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting code is not allowed! Please type your solution manually.');
                      }
                      if (e.shiftKey && (e.keyCode === 45 || e.code === 'Insert')) {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting code is not allowed! Please type your solution manually.');
                      }
                    });

                    const domNode = editor.getDomNode();
                    if (domNode) {
                      domNode.addEventListener('paste', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting code is not allowed! Please type your solution manually.');
                      }, true);
                    }
                  }}
                  options={{ 
                    minimap: { enabled: false }, 
                    fontSize: 14, 
                    padding: { top: 15 }, 
                    fontFamily: "'Fira Code', monospace", 
                    readOnly: showFeedback,
                    contextmenu: false
                  }} 
                />
              ) : (
                <textarea 
                  value={currentAnswer} 
                  onChange={e => setCurrentAnswer(e.target.value)} 
                  readOnly={showFeedback}
                  onPaste={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting answers from external sources is prohibited! Please type your answer manually.');
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                      e.preventDefault();
                      triggerCheatWarning('⚠️ Anti-Cheating Alert: Pasting answers is prohibited! Please type your answer manually.');
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    triggerCheatWarning('⚠️ Anti-Cheating Alert: Drag-and-drop text is disabled!');
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  placeholder="Type your answer here manually... (Pasting is blocked to prevent cheating. Be detailed and use proper terminology.)"
                  style={{ width: '100%', height: '100%', padding: '20px', background: 'transparent', border: 'none', color: 'white', fontSize: '0.95rem', lineHeight: '1.7', resize: 'none', outline: 'none', fontFamily: "'Inter', sans-serif" }} 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== RESULTS =====
  const allScores = Object.values(evaluations).map(e => e.score);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const catScores = {};
  questions.forEach(q => {
    const ev = evaluations[q.id];
    if (ev) { catScores[q.category] = catScores[q.category] || []; catScores[q.category].push(ev.score); }
  });
  const timeUsed = 30 * 60 - timer;

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '30px' }}>
      {/* Confetti for high scores */}
      {avgScore >= 70 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, pointerEvents: 'none' }}>
          <style>{`@keyframes confettiFall2 { 0% { transform: translateY(-100vh) rotate(0deg); opacity:1; } 100% { transform: translateY(100vh) rotate(720deg); opacity:0; } } .conf2 { position:absolute; width:8px; height:8px; top:-10px; animation: confettiFall2 3s ease-in forwards; }`}</style>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="conf2" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 4], borderRadius: i % 2 === 0 ? '50%' : '2px' }} />
          ))}
        </div>
      )}

      <div className="glass-panel animate-fade-in" style={{ padding: '40px', maxWidth: '650px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>{avgScore >= 70 ? '🎉' : avgScore >= 40 ? '💪' : '📚'}</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '5px' }}>Interview Complete!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>Here's how you performed</p>

        {/* Overall Score Circle */}
        <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 25px' }}>
          <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="65" cy="65" r="55" stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
            <circle cx="65" cy="65" r="55" stroke={getScoreColor(avgScore)} strokeWidth="8" fill="none"
              strokeDasharray={2 * Math.PI * 55} strokeDashoffset={2 * Math.PI * 55 * (1 - avgScore / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s' }} />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: getScoreColor(avgScore) }}>{avgScore}%</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Overall</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div style={{ textAlign: 'left', marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>Category Breakdown</h3>
          {Object.entries(catScores).map(([cat, scores]) => {
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            return (
              <div key={cat} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{cat}</span>
                  <span style={{ color: getScoreColor(avg), fontWeight: 600 }}>{avg}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${avg}%`, height: '100%', background: getScoreColor(avg), borderRadius: '3px', transition: 'width 1s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white' }}>{formatTime(timeUsed)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Time Used</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white' }}>{allScores.filter(s => s >= 50).length}/{allScores.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Passed</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: getScoreColor(avgScore) }}>{avgScore >= 70 ? 'Strong' : avgScore >= 40 ? 'Average' : 'Needs Work'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rating</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setPhase('lobby'); setEvaluations({}); setAnswers({}); }} className="btn-primary" style={{ flex: 1, padding: '14px' }}>Retake Interview</button>
          <button onClick={() => window.location.href = '/learn'} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Back to Learning</button>
        </div>
      </div>
    </div>
  );
}
