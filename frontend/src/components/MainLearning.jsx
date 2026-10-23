import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CodeEditor from './CodeEditor.jsx';
import AITutor from './AITutor.jsx';
import InteractiveVisualizer from './InteractiveVisualizer.jsx';
import AdaptiveQuiz from './AdaptiveQuiz.jsx';
import CodeExplainer from './CodeExplainer.jsx';
import { API_BASE_URL } from '../config/api.js';

export default function MainLearning() {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = () => {
    try {
      const search = new URLSearchParams(window.location.search);
      const tab = search.get('tab');
      if (tab && ['lessons', 'ai', 'visualizer', 'quiz', 'analysis', 'explain'].includes(tab)) {
        return tab;
      }
    } catch {}
    return 'lessons';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync activeTab whenever URL query changes (e.g., navigating from profile to /learn?tab=ai or /learn?tab=quiz)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') || location.state?.tab;
    if (tabParam && ['lessons', 'ai', 'visualizer', 'quiz', 'analysis', 'explain'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search, location.state]);

  const [currentError, setCurrentError] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('All');
  const [code, setCode] = useState('# Select a chapter on the left to begin!\n# Write your Python code here...\n');
  const [testCases, setTestCases] = useState([]);
  const [chapterCompleted, setChapterCompleted] = useState(false);
  const [completedChapterIds, setCompletedChapterIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('completed_chapters') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/chapters`);
        if (res.data && res.data.chapters) {
          setChapters(res.data.chapters);
          // Set initial chapter
          const firstCh = res.data.chapters[0];
          setSelectedChapter(firstCh);
          setCode('# Write your Python code here...\n');
          setTestCases(firstCh.test_cases || []);
        }
      } catch (err) {
        console.error("Failed to fetch chapters", err);
      }
    };
    fetchChapters();
  }, []);

  const handleSelectChapter = (ch) => {
    setSelectedChapter(ch);
    setCode('# Write your Python code here...\n');
    setTestCases(ch.test_cases || []);
    setCurrentError(null);
    setChapterCompleted(false);
    // If the chapter's level differs from current filter, switch filter to 'All'
    if (selectedLevelFilter !== 'All' && ch.level !== selectedLevelFilter) {
      setSelectedLevelFilter('All');
    }
  };

  const handleRunError = (errorMsg, code) => {
    setCurrentError(errorMsg);
    setActiveTab('analysis');
  };

  const handleRunSuccess = async () => {
    setCurrentError(null);
    if (selectedChapter) {
      setChapterCompleted(true);
      const sid = parseInt(localStorage.getItem('studentId') || '1', 10);
      try {
        await axios.post(`${API_BASE_URL}/gamification?student_id=${sid}&action=complete_lesson`);
      } catch (err) {
        console.error("Failed to award lesson completion XP", err);
      }
      setCompletedChapterIds(prev => {
        if (!prev.includes(selectedChapter.id)) {
          const updated = [...prev, selectedChapter.id];
          localStorage.setItem('completed_chapters', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  };

  const currentIndex = chapters.findIndex(c => c.id === selectedChapter?.id);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const handleNextChapter = () => {
    if (nextChapter) {
      handleSelectChapter(nextChapter);
    }
  };

  const handlePrevChapter = () => {
    if (prevChapter) {
      handleSelectChapter(prevChapter);
    }
  };

  const handleLevelFilterChange = (lvl) => {
    setSelectedLevelFilter(lvl);
    const relevant = lvl === 'All' ? chapters : chapters.filter(c => c.level === lvl);
    if (relevant.length > 0) {
      if (!selectedChapter || (lvl !== 'All' && selectedChapter.level !== lvl)) {
        handleSelectChapter(relevant[0]);
      }
    }
  };


  const filteredChapters = selectedLevelFilter === 'All' 
    ? chapters 
    : chapters.filter(c => c.level === selectedLevelFilter);

  return (
    <div className="dual-panel">
      {/* Left Panel */}
      <div className="panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="main-learning-tabs">
          <TabButton active={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')}>📖 Lessons</TabButton>
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')}>🤖 AI Tutor</TabButton>
          <TabButton active={activeTab === 'visualizer'} onClick={() => setActiveTab('visualizer')}>📊 Visualizer</TabButton>
          <TabButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')}>📝 Quiz</TabButton>
          <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')}>🔍 Analysis</TabButton>
          <TabButton active={activeTab === 'explain'} onClick={() => setActiveTab('explain')}>🔍 Explain</TabButton>
        </div>
        
        {activeTab === 'lessons' && (
          <div className="glass-panel" style={{ padding: '20px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Daily Challenge Quick-Access Banner (Always Visible on Full, Half-Screen, & Mobile) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.16), rgba(245, 158, 11, 0.08))',
              border: '1.5px solid rgba(245, 158, 11, 0.55)',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🎯</span>
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#fef08a', letterSpacing: '-0.01em' }}>
                    Today's Python Daily Challenge
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    Solve today's unique challenge question to earn +100 XP & maintain your daily streak!
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/daily')}
                style={{
                  background: 'linear-gradient(135deg, #eab308, #f59e0b)',
                  color: '#090d16',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(234, 179, 8, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                <span>Solve Daily Challenge</span>
                <span>→</span>
              </button>
            </div>

            {/* Simple, Intuitive Level & Chapter Selector */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.85))',
              border: '1.5px solid #334155',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
            }}>
              {/* Level Filter Pills */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🎯 Filter by Level:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'All', label: 'All Levels (1-12)', bg: '#3b82f6', color: '#ffffff' },
                    { id: 'Beginner', label: '🌱 Beginner (1-4)', bg: '#10b981', color: '#ffffff' },
                    { id: 'Intermediate', label: '🚀 Intermediate (5-9)', bg: '#3b82f6', color: '#ffffff' },
                    { id: 'Advanced', label: '⚡ Advanced (10-12)', bg: '#8b5cf6', color: '#ffffff' }
                  ].map(lvl => {
                    const isActive = selectedLevelFilter === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        onClick={() => handleLevelFilterChange(lvl.id)}
                        style={{
                          flex: '1 1 auto',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: isActive ? `2px solid ${lvl.bg}` : '1.5px solid #334155',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: isActive ? lvl.bg : '#1e293b',
                          color: isActive ? lvl.color : '#cbd5e1',
                          boxShadow: isActive ? `0 2px 10px ${lvl.bg}55` : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simple Chapter Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📖 Select Chapter:
                </label>
                <select
                  value={selectedChapter?.id || ''}
                  onChange={(e) => {
                    const ch = chapters.find(c => c.id === parseInt(e.target.value));
                    if (ch) handleSelectChapter(ch);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1.5px solid #475569',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  {filteredChapters.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title} • {ch.level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Chapter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginRight: '4px' }}>Quick Jump:</span>
                {filteredChapters.map(ch => {
                  const isCur = selectedChapter?.id === ch.id;
                  const isDone = completedChapterIds.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChapter(ch)}
                      title={`${ch.title} (${ch.level})${isDone ? ' - Completed' : ''}`}
                      style={{
                        minWidth: '34px',
                        height: '32px',
                        padding: '0 6px',
                        borderRadius: '6px',
                        border: isCur ? '2px solid #38bdf8' : isDone ? '1px solid #10b981' : '1px solid #334155',
                        background: isCur ? '#0284c7' : isDone ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                        color: isCur ? '#ffffff' : isDone ? '#34d399' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.15s'
                      }}
                    >
                      {isDone && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                      <span>{ch.chapter_number}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedChapter ? (
              <div style={{ background: 'var(--bg-dark)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: selectedChapter.level === 'Beginner' ? '#10b98122' : selectedChapter.level === 'Intermediate' ? '#3b82f622' : '#8b5cf622', color: selectedChapter.level === 'Beginner' ? '#34d399' : selectedChapter.level === 'Intermediate' ? '#60a5fa' : '#a78bfa', fontWeight: 700, border: '1px solid currentColor' }}>
                      {selectedChapter.level} Level
                    </span>
                    {completedChapterIds.includes(selectedChapter.id) && (
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 700, border: '1px solid #10b981' }}>
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chapter {selectedChapter.chapter_number} of 12</span>
                    {nextChapter && (
                      <button
                        onClick={handleNextChapter}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          border: '1px solid #3b82f6',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
                
                <h2 style={{ color: 'var(--accent-secondary)', marginTop: '12px', fontSize: '1.3rem' }}>{selectedChapter.title}</h2>
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.9rem' }}>{selectedChapter.description}</p>

                <div style={{ marginTop: '15px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem' }}>📖 Lesson Guide & Instructions</h4>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{selectedChapter.content}</p>
                </div>

                {selectedChapter.test_cases && selectedChapter.test_cases.length > 0 && (
                  <div style={{ marginTop: '15px', background: 'rgba(0,0,0,0.35)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '6px' }}>🧪 Required Input/Output Test Cases:</div>
                    {selectedChapter.test_cases.map((tc, idx) => (
                      <div key={idx} style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: '4px', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        Input Call: <span style={{ color: '#fde68a' }}>{tc.call}</span> → Expected Output: <span style={{ color: '#a7f3d0' }}>{tc.expected}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chapter Completion Celebration Banner with Next Chapter Button */}
                {chapterCompleted && (
                  <div style={{
                    marginTop: '20px',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'fadeIn 0.3s ease-in'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '2rem' }}>🎉</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#6ee7b7' }}>
                            Chapter {selectedChapter.chapter_number} Completed!
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>
                            All test cases passed successfully! +10 XP awarded.
                          </div>
                        </div>
                      </div>

                      {nextChapter ? (
                        <button
                          onClick={handleNextChapter}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 22px',
                            fontSize: '0.96rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <span>Next Chapter: Chapter {nextChapter.chapter_number} →</span>
                        </button>
                      ) : (
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fcd34d' }}>
                          🏆 You completed all 12 chapters! Python Master!
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mobile Quick Jump to Editor Button (hidden on laptop/desktop) */}
                <div className="mobile-only-jump-btn" style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      const editorElem = document.getElementById('code-editor-panel');
                      if (editorElem) {
                        editorElem.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.35)'
                    }}
                  >
                    <span>💻</span>
                    <span>Start Coding in Editor Below ↓</span>
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Select a chapter above to view the lesson content.</p>
            )}
          </div>
        )}

        {activeTab === 'visualizer' && (
          <InteractiveVisualizer code={code} setCode={setCode} />
        )}

        {activeTab === 'quiz' && (
          <AdaptiveQuiz onQuizCompleted={() => setActiveTab('lessons')} />
        )}
        
        {(activeTab === 'ai' || activeTab === 'analysis') && (
          <AITutor 
            activeTab={activeTab} 
            currentError={currentError} 
          />
        )}
        {activeTab === 'explain' && (
          <CodeExplainer code={code} />
        )}
      </div>

      {/* Right Panel */}
      <div id="code-editor-panel" className="panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CodeEditor 
          code={code} 
          setCode={setCode} 
          testCases={testCases} 
          onRunSuccess={handleRunSuccess} 
          onRunError={handleRunError}
          onNextChapter={nextChapter ? handleNextChapter : null}
          nextChapterNumber={nextChapter?.chapter_number}
          chapterPassed={chapterCompleted}
        />
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{
        background: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
        color: active ? 'var(--accent-secondary)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border)'}`,
        padding: '7px 14px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.2s'
      }}
    >
      {children}
    </button>
  );
}
