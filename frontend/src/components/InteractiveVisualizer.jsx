import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

const PRESETS = [
  {
    id: 'print_vars',
    name: '1. Hello & Variables',
    icon: '🚀',
    code: `name = "Python AI"\nage = 3\nprint("Welcome to " + name)\nprint("System Version:", age)\n`
  },
  {
    id: 'loop_math',
    name: '2. For Loop Sum',
    icon: '🔄',
    code: `total = 0\nfor i in range(1, 6):\n    total += i\nprint("Final Sum 1 to 5 is:", total)\n`
  },
  {
    id: 'if_else',
    name: '3. If-Else Decision',
    icon: '🔀',
    code: `score = 85\nif score >= 80:\n    status = "Distinction"\nelse:\n    status = "Pass"\nprint("Student Status:", status)\n`
  },
  {
    id: 'functions',
    name: '4. Functions & Return',
    icon: '⚙️',
    code: `def multiply(a, b):\n    product = a * b\n    return product\n\nresult = multiply(6, 7)\nprint("6 * 7 =", result)\n`
  },
  {
    id: 'lists',
    name: '5. List Operations',
    icon: '📦',
    code: `fruits = ["apple", "banana"]\nfruits.append("mango")\ncount = len(fruits)\nprint("Fruit list:", fruits)\nprint("Total fruits:", count)\n`
  }
];

function isCodeExecutable(str) {
  if (!str) return false;
  const nonComments = str
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  return nonComments.length > 0;
}

export default function InteractiveVisualizer({ code, setCode }) {
  const [subTab, setSubTab] = useState('stepper'); // 'stepper' or 'flowchart'
  const [activeCode, setActiveCode] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [steps, setSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [flow, setFlow] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize or synchronize code
  useEffect(() => {
    if (isCodeExecutable(code)) {
      runVisualization(code, 'Code Editor');
    } else {
      // Default to first preset so the visualizer is never empty
      const defaultPreset = PRESETS[0];
      runVisualization(defaultPreset.code, defaultPreset.name);
    }
  }, [code]);

  // Auto-play timer for step execution
  useEffect(() => {
    let timer = null;
    if (isPlaying && steps.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIdx(prev => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  const runVisualization = async (targetCode, sourceName) => {
    if (!targetCode || !targetCode.trim()) return;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setActiveCode(targetCode);
    setSourceTitle(sourceName);
    setCurrentStepIdx(0);

    try {
      // Run both AST flowchart and Step Execution trace concurrently
      const [astRes, traceRes] = await Promise.all([
        axios.post(`${API_BASE_URL}/visualize-ast`, { code: targetCode }),
        axios.post(`${API_BASE_URL}/visualize-trace`, { code: targetCode })
      ]);

      if (astRes.data.success) {
        setFlow(astRes.data.flow || []);
      }

      if (traceRes.data.success && traceRes.data.steps && traceRes.data.steps.length > 0) {
        setSteps(traceRes.data.steps);
      } else if (traceRes.data.error) {
        setError(traceRes.data.error);
        setSteps([]);
      } else {
        setSteps([]);
      }
    } catch (err) {
      setError('Cannot connect to visualizer service. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    runVisualization(preset.code, preset.name);
  };

  const handleSyncWithEditor = () => {
    if (isCodeExecutable(code)) {
      runVisualization(code, 'Code Editor');
    } else {
      setError('Editor only has comments or empty lines. Type some Python code in the editor or pick an interactive preset above!');
    }
  };

  const handleCopyPresetToEditor = () => {
    if (setCode && activeCode) {
      setCode(activeCode);
    }
  };

  const currentStep = steps[currentStepIdx] || null;
  const codeLines = (activeCode || '').split('\n');

  const getNodeColor = (type) => {
    switch (type) {
      case 'Assignment': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'Output': return 'linear-gradient(135deg, #0ea5e9, #0284c7)';
      case 'Call': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'Loop': return 'linear-gradient(135deg, #3b82f6, #2563eb)';
      case 'Decision': return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
      case 'Function': return 'linear-gradient(135deg, #ec4899, #db2777)';
      case 'Return': return 'linear-gradient(135deg, #14b8a6, #0d9488)';
      case 'Module': return 'linear-gradient(135deg, #a855f7, #9333ea)';
      default: return 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))';
    }
  };

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
      {/* Header Bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(15, 23, 42, 0.65)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>📊</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Python Code Visualizer</h3>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600 }}>
                {sourceTitle || 'Active Script'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Step-by-step execution debugger, live memory variables table, and logic flowchart
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleSyncWithEditor}
              title="Visualize code currently written in your Code Editor"
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🔄</span> Sync Editor
            </button>
            {setCode && (
              <button
                onClick={handleCopyPresetToEditor}
                title="Paste this code into your Code Editor"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>📥</span> Copy to Editor
              </button>
            )}
          </div>
        </div>

        {/* Preset Selector Buttons */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px', fontWeight: 600 }}>
            Presets:
          </span>
          {PRESETS.map((p) => {
            const isSelected = sourceTitle === p.name;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: isSelected ? 'rgba(2, 132, 199, 0.3)' : 'rgba(30, 41, 59, 0.7)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s'
                }}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtab Toggle (Stepper vs Flowchart) */}
      <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid var(--border)', padding: '6px 20px', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSubTab('stepper')}
          style={{
            background: subTab === 'stepper' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            color: subTab === 'stepper' ? '#38bdf8' : 'var(--text-secondary)',
            border: `1px solid ${subTab === 'stepper' ? '#38bdf8' : 'transparent'}`,
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            flex: '1 1 140px'
          }}
        >
          <span>▶️</span> Step-by-Step Stepper ({steps.length} steps)
        </button>
        <button
          onClick={() => setSubTab('flowchart')}
          style={{
            background: subTab === 'flowchart' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
            color: subTab === 'flowchart' ? '#c084fc' : 'var(--text-secondary)',
            border: `1px solid ${subTab === 'flowchart' ? '#c084fc' : 'transparent'}`,
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            flex: '1 1 140px'
          }}
        >
          <span>📊</span> Logic Flowchart ({flow.length} blocks)
        </button>
      </div>

      {/* Main Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
            <span style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⚙️</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analyzing Python execution trace...</span>
          </div>
        )}

        {error && !loading && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '16px', color: '#fca5a5', marginBottom: '15px' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>⚠️ Visualizer Notice</div>
            <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{error}</div>
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
              💡 Tip: Click one of the numbered presets above to inspect working code, or fix syntax errors in your script.
            </div>
          </div>
        )}

        {/* STEPPER VIEW */}
        {subTab === 'stepper' && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Playback Controls Bar */}
            <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '10px', padding: '12px 16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                {/* Step Navigation Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setCurrentStepIdx(0)}
                    disabled={currentStepIdx === 0 || steps.length === 0}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border)',
                      color: currentStepIdx === 0 ? '#475569' : '#ffffff',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: currentStepIdx === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                  >
                    ⏮ First
                  </button>
                  <button
                    onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentStepIdx === 0 || steps.length === 0}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border)',
                      color: currentStepIdx === 0 ? '#475569' : '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: currentStepIdx === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    ◀ Prev
                  </button>
                  <button
                    onClick={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
                    disabled={currentStepIdx >= steps.length - 1 || steps.length === 0}
                    style={{
                      background: 'rgba(56, 189, 248, 0.25)',
                      border: '1px solid #38bdf8',
                      color: currentStepIdx >= steps.length - 1 ? '#475569' : '#38bdf8',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      cursor: currentStepIdx >= steps.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  >
                    Next ▶
                  </button>
                  <button
                    onClick={() => setCurrentStepIdx(steps.length - 1)}
                    disabled={currentStepIdx >= steps.length - 1 || steps.length === 0}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border)',
                      color: currentStepIdx >= steps.length - 1 ? '#475569' : '#ffffff',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: currentStepIdx >= steps.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                  >
                    Last ⏭
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={steps.length <= 1}
                    style={{
                      background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${isPlaying ? '#ef4444' : '#10b981'}`,
                      color: isPlaying ? '#f87171' : '#34d399',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{isPlaying ? '⏸ Pause' : '▶️ Auto Play'}</span>
                  </button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 700 }}>
                    Step {steps.length > 0 ? currentStepIdx + 1 : 0} of {steps.length}
                  </span>
                  {currentStep && (
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600 }}>
                      Line {currentStep.line}
                    </span>
                  )}
                </div>
              </div>

              {/* Scrubber Slider */}
              {steps.length > 1 && (
                <input
                  type="range"
                  min={0}
                  max={steps.length - 1}
                  value={currentStepIdx}
                  onChange={(e) => setCurrentStepIdx(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
              )}
            </div>

            {/* Code Trace View with Highlighted Active Line */}
            <div style={{ background: '#0b1120', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#1e293b', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Execution Trace</span>
                {currentStep && (
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                    ▶ Executing Line {currentStep.line}
                  </span>
                )}
              </div>
              <div style={{ padding: '12px 0', fontFamily: "'Fira Code', Consolas, monospace", fontSize: '0.85rem', lineHeight: '1.6', overflowX: 'auto' }}>
                {codeLines.map((lineText, idx) => {
                  const lineNo = idx + 1;
                  const isCurrent = currentStep && currentStep.line === lineNo;
                  return (
                    <div
                      key={lineNo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '3px 14px',
                        background: isCurrent ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                        borderLeft: isCurrent ? '4px solid #38bdf8' : '4px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ width: '32px', color: isCurrent ? '#38bdf8' : '#475569', textAlign: 'right', marginRight: '12px', userSelect: 'none', fontWeight: isCurrent ? 700 : 400, flexShrink: 0 }}>
                        {lineNo}
                      </span>
                      <span style={{ color: isCurrent ? '#f8fafc' : '#cbd5e1', fontWeight: isCurrent ? 600 : 400, whiteSpace: 'pre', overflowX: 'auto', flex: 1 }}>
                        {lineText || ' '}
                      </span>
                      {isCurrent && (
                        <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700, paddingLeft: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          ← Next to run
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Split row: Variables / Memory Table & Live Terminal Output */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Variables Inspector */}
              <div style={{ background: '#0b1120', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px 14px', background: '#1e293b', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📦</span> Memory & Variables
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {currentStep && Object.keys(currentStep.variables || {}).length} variables
                  </span>
                </div>
                <div style={{ padding: '12px', flex: 1, minHeight: '140px', overflowY: 'auto' }}>
                  {currentStep && Object.keys(currentStep.variables || {}).length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Variable</th>
                          <th style={{ padding: '6px 8px' }}>Value</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(currentStep.variables).map(([vName, vVal]) => {
                          const isChanged = currentStep.changed_vars && currentStep.changed_vars.includes(vName);
                          return (
                            <tr key={vName} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isChanged ? 'rgba(16, 185, 129, 0.12)' : 'transparent' }}>
                              <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700 }}>
                                {vName}
                              </td>
                              <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#f1f5f9' }}>
                                {vVal}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                {isChanged && (
                                  <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', fontWeight: 700 }}>
                                    ⚡ Updated
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '30px 10px' }}>
                      <span>Variables in scope will be displayed here as each line executes.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Terminal Console Output */}
              <div style={{ background: '#0b1120', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px 14px', background: '#1e293b', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💻</span> Terminal Output (stdout)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Live</span>
                </div>
                <div style={{ padding: '12px', flex: 1, minHeight: '140px', background: '#030712', fontFamily: "'Fira Code', Consolas, monospace", fontSize: '0.82rem', color: '#34d399', whiteSpace: 'pre-wrap', overflowY: 'auto' }}>
                  {currentStep && currentStep.stdout ? (
                    currentStep.stdout
                  ) : (
                    <span style={{ color: '#475569' }}>&gt; No printed output at this step.</span>
                  )}
                  {currentStep && currentStep.event === 'line' && (
                    <span style={{ display: 'inline-block', width: '8px', height: '14px', background: '#38bdf8', marginLeft: '4px', verticalAlign: 'middle', animation: 'blink 1s infinite' }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FLOWCHART VIEW */}
        {subTab === 'flowchart' && !loading && (
          <div>
            {flow.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📊</div>
                <h4>No Flowchart Blocks Found</h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '350px', margin: '8px auto' }}>
                  Choose one of the presets above or write statements like assignments, loops, prints, or functions in your code editor.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '10px 0' }}>
                {flow.map((node, index) => (
                  <React.Fragment key={index}>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '420px',
                        background: 'rgba(21, 30, 50, 0.7)',
                        borderLeft: '5px solid',
                        borderImage: `${getNodeColor(node.type)} 1`,
                        borderRadius: '8px',
                        padding: '14px 18px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
                        animation: 'fadeIn 0.25s ease-out forwards',
                        animationDelay: `${index * 0.04}s`,
                        opacity: 0,
                        transform: 'translateY(10px)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', color: '#e2e8f0' }}>
                          {node.type}
                        </span>
                        {node.line && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                            Line {node.line}
                          </span>
                        )}
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                        {node.label}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {node.details}
                      </p>
                    </div>
                    {index < flow.length - 1 && (
                      <div style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        ↓
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
