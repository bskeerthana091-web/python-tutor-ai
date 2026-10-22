import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

export default function CodeExplainer({ code }) {
  const [explanations, setExplanations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const handleExplain = async () => {
    if (!code || !code.trim()) return;
    setLoading(true); setError(null); setExplanations([]);
    try {
      const res = await axios.post(`${API_BASE_URL}/explain-code`, { code });
      if (res.data.success) setExplanations(res.data.explanations);
      else setError(res.data.error || 'Failed to parse code.');
    } catch { setError('Cannot connect to the code analysis server.'); }
    finally { setLoading(false); }
  };

  const toggleExpand = (line) => setExpanded(prev => ({ ...prev, [line]: !prev[line] }));

  const levelColors = { Beginner: '#10b981', Intermediate: '#3b82f6', Advanced: '#8b5cf6' };
  const conceptIcons = { Variables: '📦', Loops: '🔁', Conditionals: '🔀', Functions: '⚙️', OOP: '🏗️', Modules: '📚' };

  if (loading) return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '30px' }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <div style={{ fontSize: '3rem', marginBottom: '15px', animation: 'pulse 1.5s infinite' }}>🔍</div>
      <h3 style={{ color: 'var(--accent-secondary)' }}>Analyzing your code structure...</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Parsing AST nodes and generating explanations</p>
    </div>
  );

  if (explanations.length === 0 && !error) return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '30px', textAlign: 'center' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🔍</div>
      <h3 style={{ marginBottom: '10px' }}>Code Explainer</h3>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '350px', lineHeight: '1.6', marginBottom: '25px', fontSize: '0.9rem' }}>
        Write Python code in the editor, then click below to get a line-by-line explanation of every construct!
      </p>
      <button onClick={handleExplain} className="btn-primary" style={{ padding: '14px 30px', fontSize: '1rem', fontWeight: 700, borderRadius: '10px' }}>
        Explain My Code 🔍
      </button>
    </div>
  );

  if (error) return (
    <div className="glass-panel" style={{ height: '100%', padding: '25px' }}>
      <h3 style={{ color: 'var(--error)', marginBottom: '12px' }}>⚠️ Analysis Error</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error}</p>
      <button onClick={handleExplain} className="btn-primary">Try Again</button>
    </div>
  );

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>🔍 Line-by-Line Explanation</h3>
        <button onClick={handleExplain} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Re-Analyze</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {explanations.map((item, idx) => {
          const color = levelColors[item.level] || '#3b82f6';
          const icon = conceptIcons[item.concept] || '📝';
          const isExpanded = expanded[item.line] !== false; // default expanded

          return (
            <div key={idx} className="animate-fade-in" style={{ marginBottom: '12px', animationDelay: `${idx * 0.05}s` }}>
              {/* Code Line */}
              <div onClick={() => toggleExpand(item.line)} style={{
                display: 'flex', alignItems: 'stretch', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden',
                border: '1px solid var(--border)', background: 'rgba(0,0,0,0.25)', transition: 'all 0.2s'
              }}>
                {/* Color sidebar */}
                <div style={{ width: '5px', background: color, flexShrink: 0 }} />
                {/* Line number */}
                <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600, display: 'flex', alignItems: 'center', minWidth: '40px', justifyContent: 'center' }}>
                  {item.line}
                </div>
                {/* Code */}
                <div style={{ flex: 1, padding: '10px 15px', fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: '0.9rem', color: '#f8fafc' }}>
                  {item.code}
                </div>
                {/* Expand indicator */}
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {isExpanded ? '▼' : '▶'}
                </div>
              </div>

              {/* Explanation Card */}
              {isExpanded && (
                <div style={{ marginLeft: '5px', padding: '12px 15px', borderLeft: `3px solid ${color}`, background: 'rgba(0,0,0,0.1)', borderRadius: '0 8px 8px 0', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: `${color}18`, color, padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${color}30` }}>
                      {icon} {item.concept}
                    </span>
                    <span style={{ background: `${color}10`, color, padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {item.level}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>{item.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
