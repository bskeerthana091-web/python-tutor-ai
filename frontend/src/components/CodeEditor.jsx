import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

export default function CodeEditor({ 
  code, 
  setCode, 
  testCases = [], 
  onRunSuccess, 
  onRunError,
  onNextChapter,
  nextChapterNumber,
  chapterPassed
}) {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [syntaxError, setSyntaxError] = useState(null);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }

  // Debounced Syntax Checker
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!code.trim() || code.startsWith('#')) {
        setSyntaxError(null);
        return;
      }
      try {
        const response = await axios.post(`${API_BASE_URL}/check-syntax`, { code });
        if (response.data.valid) {
          setSyntaxError(null);
        } else {
          setSyntaxError(response.data.error);
        }
      } catch (err) {
        console.error("Syntax check failed", err);
      }
    }, 450); // 450ms debounce time

    return () => clearTimeout(delayDebounceFn);
  }, [code]);

  // Set Monaco Model Markers
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (syntaxError) {
        monacoRef.current.editor.setModelMarkers(model, "python-syntax", [
          {
            startLineNumber: syntaxError.line,
            startColumn: syntaxError.offset || 1,
            endLineNumber: syntaxError.line,
            endColumn: (syntaxError.offset || 1) + 4,
            message: syntaxError.message,
            severity: monacoRef.current.MarkerSeverity.Error
          }
        ]);
      } else {
        monacoRef.current.editor.setModelMarkers(model, "python-syntax", []);
      }
    }
  }, [syntaxError]);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('Running code and testing inputs...');
    
    try {
      const studentId = parseInt(localStorage.getItem('studentId') || '1', 10);
      const response = await axios.post(`${API_BASE_URL}/execute`, {
        student_id: studentId,
        code: code,
        time_spent: 10,
        test_cases: testCases
      });
      
      const resData = response.data;
      if (resData.passed) {
        let text = resData.stdout || 'Code executed successfully.';
        if (resData.plagiarism_flagged) {
          text += '\n\n[Warning: Code flagged for plagiarism]';
        }
        setOutput(text);
        if (onRunSuccess) onRunSuccess();
      } else {
        const errorText = resData.stderr || resData.stdout || 'Execution failed.';
        setOutput(`Error:\n${errorText}`);
        if (onRunError) onRunError(errorText, code);
      }
    } catch (err) {
      setOutput('Error:\nFailed to connect to execution server.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="glass-panel code-editor-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '460px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem' }}>📄</span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>main.py</h3>
        </div>
        <button 
          onClick={handleRun}
          disabled={isRunning}
          className="btn-primary" 
          style={{ padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}
        >
          {isRunning ? 'Running...' : '▶ Run Code'}
        </button>
      </div>

      {syntaxError && (
        <div style={{ 
          padding: '10px 20px', 
          background: 'rgba(239, 68, 68, 0.12)', 
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)', 
          color: '#fca5a5', 
          fontSize: '0.85rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>⚠️</span>
          <span><strong>Line {syntaxError.line}:</strong> {syntaxError.message}</span>
        </div>
      )}
      
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={setCode}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 20 },
            fontFamily: "'Fira Code', 'Courier New', monospace"
          }}
        />
      </div>

      <div style={{ height: '30%', borderTop: '1px solid var(--border)', background: 'var(--bg-dark)', padding: '15px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Output</div>
          {chapterPassed && onNextChapter && (
            <button
              onClick={onNextChapter}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span>Next Chapter ({nextChapterNumber}) →</span>
            </button>
          )}
        </div>
        <pre style={{ 
          fontFamily: 'monospace', 
          color: output.includes('Error:') ? 'var(--error)' : 'var(--success)',
          margin: 0,
          whiteSpace: 'pre-wrap'
        }}>
          {output}
        </pre>
      </div>
    </div>
  );
}
