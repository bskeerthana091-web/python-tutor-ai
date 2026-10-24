import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

export default function CodeAnalysis({ code, currentError, onJumpToEditor }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/analyze`, {
        code: code || '',
        error: currentError || null
      });
      setAnalysis(res.data);
    } catch (err) {
      console.error('Failed to run code analysis', err);
      setErrorMsg('Could not connect to analysis engine. Ensure server is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [code, currentError]);

  const getScoreGrade = (score) => {
    if (score >= 90) return { grade: 'A+', color: '#10b981', label: 'Exceptional' };
    if (score >= 80) return { grade: 'A', color: '#34d399', label: 'Very Good' };
    if (score >= 70) return { grade: 'B', color: '#38bdf8', label: 'Good' };
    if (score >= 60) return { grade: 'C', color: '#f59e0b', label: 'Fair' };
    return { grade: 'Needs Work', color: '#ef4444', label: 'Action Required' };
  };

  const metrics = analysis?.metrics;
  const gradeInfo = metrics ? getScoreGrade(metrics.quality_score) : null;
  const symbols = analysis?.symbols;

  return (
    <div className="glass-panel" style={{ height: '100%', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span>
            <span>Code Quality & AST Analysis</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Static code inspection, cyclomatic complexity, PEP 8 metrics & real-time diagnosis
          </p>
        </div>

        <button
          onClick={fetchAnalysis}
          disabled={loading}
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <span>{loading ? '⏳' : '🔄'}</span>
          <span>{loading ? 'Analyzing...' : 'Re-Analyze'}</span>
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Active Runtime / Syntax Error Diagnostic Banner */}
      {(currentError || analysis?.syntax_error) && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.25))',
          border: '1.5px solid #ef4444',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>🚨</span>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fecaca' }}>
                {analysis?.syntax_error ? 'Syntax Error Detected' : 'Runtime Execution Error'}
              </span>
            </div>
            {(analysis?.syntax_error?.line || currentError?.match(/line (\d+)/i)?.[1]) && (
              <span style={{
                background: '#ef4444',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.78rem'
              }}>
                Line {analysis?.syntax_error?.line || currentError.match(/line (\d+)/i)[1]}
              </span>
            )}
          </div>

          <div style={{ background: '#090d16', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#fca5a5', fontFamily: 'monospace', fontSize: '0.84rem', lineHeight: '1.5' }}>
              {analysis?.syntax_error ? `${analysis.syntax_error.message} at line ${analysis.syntax_error.line}` : currentError}
            </pre>
          </div>

          {onJumpToEditor && (
            <button
              onClick={onJumpToEditor}
              style={{
                alignSelf: 'flex-start',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)'
              }}
            >
              <span>💻</span>
              <span>Jump to Editor Line</span>
            </button>
          )}
        </div>
      )}

      {/* Metrics Row (4 Cards) */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {/* Quality Score */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #334155', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quality Score
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: gradeInfo.color, margin: '4px 0' }}>
              {metrics.quality_score}
              <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>/100</span>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: `${gradeInfo.color}25`, color: gradeInfo.color }}>
              {gradeInfo.grade} • {gradeInfo.label}
            </span>
          </div>

          {/* Complexity */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #334155', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Complexity
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: metrics.complexity_color, margin: '4px 0' }}>
              CC: {metrics.cyclomatic_complexity}
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: `${metrics.complexity_color}25`, color: metrics.complexity_color }}>
              {metrics.complexity_label.split(' ')[0]}
            </span>
          </div>

          {/* Lines Distribution */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #334155', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Lines of Code
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#e2e8f0', margin: '4px 0' }}>
              {metrics.total_lines}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              {metrics.code_lines} code • {metrics.comment_lines} comments
            </div>
          </div>

          {/* Sandbox Security */}
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #334155', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Security Check
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: analysis.security_safe ? '#10b981' : '#ef4444', margin: '4px 0' }}>
              {analysis.security_safe ? 'Safe 🛡️' : 'Alert ⚠️'}
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: analysis.security_safe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: analysis.security_safe ? '#10b981' : '#ef4444' }}>
              {analysis.security_safe ? 'Sandbox Verified' : 'Banned Library'}
            </span>
          </div>
        </div>
      )}

      {/* AST Structure Breakdown */}
      {symbols && (
        <div style={{ background: 'linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.85))', border: '1.5px solid #334155', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧬</span>
            <span>AST Code Structure & Symbols</span>
          </div>

          {/* Functions list */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              Functions ({symbols.functions.length}):
            </div>
            {symbols.functions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {symbols.functions.map(fn => (
                  <span key={fn.name} style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', color: '#93c5fd', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    def {fn.name}({fn.args.join(', ')}): [Line {fn.line}]
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>No functions defined yet</span>
            )}
          </div>

          {/* Variables list */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              Variables Detected ({symbols.variables.length}):
            </div>
            {symbols.variables.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {symbols.variables.map(v => (
                  <span key={v} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                    {v}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>No variable assignments detected</span>
            )}
          </div>

          {/* Loops & Conditions */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: '#cbd5e1' }}>
            <div>🔄 Loops (for/while): <strong>{metrics?.num_loops || 0}</strong></div>
            <div>🔀 Branches (if/else): <strong>{metrics?.num_conditionals || 0}</strong></div>
          </div>
        </div>
      )}

      {/* AI Recommendations & Best Practices */}
      {analysis?.recommendations && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡</span>
            <span>Code Recommendations & Best Practices</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysis.recommendations.map((rec, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <span style={{ color: '#38bdf8' }}>•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
