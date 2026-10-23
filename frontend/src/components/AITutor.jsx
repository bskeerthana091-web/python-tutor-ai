import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext.jsx';
import { API_BASE_URL } from '../config/api.js';

export default function AITutor({ activeTab, currentError }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([
    { sender: 'ai', text: t('aiTutorGreeting') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(-1);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanText = (txt) => {
    if (!txt) return '';
    return txt.replace(/\*\*/g, '').replace(/^\s*\*\s+/gm, '- ').replace(/\*/g, '');
  };

  const handleAsk = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/ask`, { question: userMsg });
      setMessages(prev => [...prev, { sender: 'ai', text: cleanText(response.data.answer) }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, my server is currently offline.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Voice Input — Web Speech API
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { sender: 'ai', text: '⚠️ Voice input is not supported in this browser. Try Chrome or Edge.' }]);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      // Auto-submit after voice recognition
      setTimeout(() => {
        setInput(prev => {
          if (prev.trim()) {
            setMessages(msgs => [...msgs, { sender: 'user', text: prev }]);
            setLoading(true);
            axios.post(`${API_BASE_URL}/ask`, { question: prev })
              .then(res => setMessages(msgs => [...msgs, { sender: 'ai', text: cleanText(res.data.answer) }]))
              .catch(() => setMessages(msgs => [...msgs, { sender: 'ai', text: 'Sorry, my server is currently offline.' }]))
              .finally(() => setLoading(false));
          }
          return '';
        });
      }, 300);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  // Read Aloud — Speech Synthesis
  const readAloud = (text, idx) => {
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(-1);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingIdx(-1);
    utterance.onerror = () => setSpeakingIdx(-1);
    window.speechSynthesis.speak(utterance);
    setSpeakingIdx(idx);
  };

  const parseErrorDetails = (err) => {
    if (!err) return null;
    const lineMatch = err.match(/line (\d+)/i);
    const lineNum = lineMatch ? lineMatch[1] : null;

    let title = 'Execution Error';
    let explanation = 'Python encountered an execution error while running your script.';
    let hint = 'Check the traceback above to see the exact code and error message.';

    if (err.includes('NameError')) {
      const varMatch = err.match(/name '([^']+)' is not defined/);
      const varName = varMatch ? varMatch[1] : 'this item';
      title = `Undefined Name: '${varName}'`;
      explanation = `Python tried to run '${varName}', but it has not been defined yet in your code.`;
      hint = `If '${varName}' is a function you are solving, define it first using: 'def ${varName}(...):' and write the return logic inside it.`;
    } else if (err.includes('SyntaxError')) {
      title = 'Syntax Error';
      explanation = 'Python encountered invalid syntax that it cannot parse.';
      hint = 'Check for missing colons (:) at the end of def/if/for lines, unclosed quotes, or mismatched brackets.';
    } else if (err.includes('IndentationError')) {
      title = 'Indentation Error';
      explanation = 'Python requires consistent indentation inside code blocks.';
      hint = 'Ensure that lines inside your function or loop are indented with 4 spaces.';
    } else if (err.includes('TypeError')) {
      title = 'Type Error';
      explanation = 'An operation was attempted on incompatible types or with wrong arguments.';
      hint = 'Verify variable types and that your function receives the expected number of arguments.';
    } else if (err.includes('ZeroDivisionError')) {
      title = 'Division by Zero';
      explanation = 'A number was divided by zero, which is mathematically invalid.';
      hint = 'Make sure the denominator cannot evaluate to 0.';
    }

    return { lineNum, title, explanation, hint };
  };

  if (activeTab === 'analysis' && currentError) {
    const details = parseErrorDetails(currentError);
    return (
      <div className="glass-panel" style={{ height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'var(--error)', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> Error Analysis
          </h3>
          {details?.lineNum && (
            <span style={{ 
              background: 'rgba(239, 68, 68, 0.2)', 
              color: '#f87171', 
              padding: '3px 10px', 
              borderRadius: '12px', 
              fontWeight: 700, 
              fontSize: '0.8rem',
              border: '1px solid rgba(239, 68, 68, 0.4)'
            }}>
              Line {details.lineNum}
            </span>
          )}
        </div>

        {/* Traceback Box */}
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--error)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#fca5a5', fontFamily: 'monospace', fontSize: '0.86rem', lineHeight: '1.5' }}>
            {currentError}
          </pre>
        </div>

        {/* AI Explanatory Guide */}
        {details && (
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #334155', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.95rem' }}>
              💡 {details.title}
            </div>
            <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
              {details.explanation}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', lineHeight: '1.5' }}>
              <strong>🛠️ How to fix:</strong> {details.hint}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ margin: 0, flex: 1 }}>AI Tutor Chat</h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(59,130,246,0.08)', padding: '3px 8px', borderRadius: '8px' }}>🎤 Voice Enabled</span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            background: msg.sender === 'user' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
            padding: '12px 18px',
            borderRadius: '12px',
            maxWidth: '80%',
            lineHeight: '1.5',
            position: 'relative'
          }}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{cleanText(msg.text)}</div>
            {/* Read Aloud button on AI messages */}
            {msg.sender === 'ai' && (
              <button onClick={() => readAloud(msg.text, idx)} title={speakingIdx === idx ? 'Stop' : 'Read Aloud'}
                style={{
                  position: 'absolute', top: '6px', right: '6px', background: 'transparent', border: 'none',
                  cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px', borderRadius: '4px',
                  color: speakingIdx === idx ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  opacity: 0.7, transition: 'all 0.2s'
                }}>
                {speakingIdx === idx ? '⏹' : '🔊'}
              </button>
            )}
          </div>
        ))}
        {loading && <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)' }}>AI is thinking...</div>}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleAsk} style={{ 
        padding: '10px 12px', 
        borderTop: '1px solid var(--border)', 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Voice Input Button */}
        <button type="button" onClick={isListening ? stopListening : startListening} title={isListening ? 'Stop Listening' : 'Voice Input'}
          style={{
            width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: isListening ? 'var(--error)' : 'rgba(59,130,246,0.15)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem',
            flexShrink: 0, transition: 'all 0.2s',
            animation: isListening ? 'pulse 1s infinite' : 'none',
            boxShadow: isListening ? '0 0 15px rgba(239,68,68,0.5)' : 'none'
          }}>
          🎤
        </button>

        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : t('askPlaceholder')}
          style={{ 
            flex: 1, 
            minWidth: 0, 
            height: '40px',
            padding: '8px 12px', 
            borderRadius: '8px', 
            border: '1px solid var(--border)', 
            background: 'rgba(0,0,0,0.25)', 
            color: 'white', 
            outline: 'none',
            fontSize: '0.9rem',
            boxSizing: 'border-box'
          }}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading || !input.trim()}
          style={{
            flexShrink: 0,
            height: '40px',
            padding: '0 16px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}
        >
          <span>{loading ? '...' : 'Send'}</span>
          {!loading && <span style={{ fontSize: '0.85rem' }}>➤</span>}
        </button>
      </form>

      {/* Pulse animation for mic */}
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
      `}</style>
    </div>
  );
}
