import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

/**
 * Extracts question prompt and Python code snippet from question text.
 */
function parseQuizQuestion(text) {
  if (!text) return { prompt: '', snippet: null };

  // Case 1: Formatted with colon e.g. "What is the output of: print(x)"
  const colonIdx = text.indexOf(':');
  if (colonIdx !== -1 && colonIdx < text.length - 2) {
    const prefix = text.slice(0, colonIdx + 1).trim();
    let codePart = text.slice(colonIdx + 1).trim();
    if (codePart.endsWith('?')) codePart = codePart.slice(0, -1).trim();

    // Check if codePart contains typical Python code indicators
    const isCode = codePart.includes('(') || 
                   codePart.includes('=') || 
                   codePart.includes('[') || 
                   codePart.includes('{') || 
                   codePart.startsWith('for ') || 
                   codePart.startsWith('while ') || 
                   codePart.startsWith('def ') ||
                   codePart.startsWith('i =') ||
                   codePart.startsWith('x =');

    if (isCode) {
      // If code contains semicolons, format nicely into separate lines
      const formatted = codePart.includes(';')
        ? codePart.split(';').map(s => s.trim()).join('\n')
        : codePart;
      return { prompt: prefix, snippet: formatted };
    }
  }

  // Case 2: Inline backticks e.g. "What does `zip([1,2])` do?"
  const backtickMatch = text.match(/`([^`]+)`/);
  if (backtickMatch) {
    return { prompt: text, snippet: backtickMatch[1] };
  }

  return { prompt: text, snippet: null };
}

export default function AdaptiveQuiz({ onQuizCompleted }) {
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [xpGained, setXpGained] = useState(0);

  // Interactive Code Runner / Playground inside Quiz
  const [runningCode, setRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState(null);
  const [codeError, setCodeError] = useState(null);
  const [customCode, setCustomCode] = useState('');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, []);

  const getStudentId = () => parseInt(localStorage.getItem('studentId') || '1', 10);
  const getUserEmail = () => localStorage.getItem('userEmail') || '';

  const fetchQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentId = getStudentId();
      const email = getUserEmail();
      const response = await axios.post(`${API_BASE_URL}/get-adaptive-quiz`, { 
        student_id: studentId,
        email: email 
      });
      setQuizData(response.data);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setScore(0);
      setMistakes(0);
      setQuizFinished(false);
      setXpGained(0);
      resetCodeState(response.data.questions?.[0]);
    } catch (err) {
      setError("Failed to load adaptive quiz. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const resetCodeState = (questionObj) => {
    setCodeOutput(null);
    setCodeError(null);
    setIsEditingCode(false);
    setShowPlayground(false);
    if (questionObj) {
      const parsed = parseQuizQuestion(questionObj.question);
      setCustomCode(parsed.snippet || '');
    } else {
      setCustomCode('');
    }
  };

  const handleOptionSelect = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === quizData.questions[currentQuestionIndex].answer;
    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      setMistakes(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setSelectedOption(null);
      setIsAnswered(false);
      resetCodeState(quizData.questions[nextIdx]);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizFinished(true);
    const scorePercentage = (score / quizData.questions.length) * 100;
    const studentId = getStudentId();
    
    try {
      // Save progress to database for this logged-in student
      await axios.post(`${API_BASE_URL}/progress`, {
        student_id: studentId,
        topic: quizData.topic,
        score: scorePercentage,
        time_spent: 30,
        mistakes: mistakes
      });

      // Award XP based on quiz result to this logged-in student
      if (scorePercentage >= 50) {
        const response = await axios.post(`${API_BASE_URL}/gamification?student_id=${studentId}&action=correct_quiz`);
        setXpGained(response.data.xp_gained || 20);
      }
    } catch (err) {
      console.error("Failed to submit progress / award XP", err);
    }
  };

  // Run code in execution sandbox to verify output
  const handleExecuteSnippet = async (codeToRun) => {
    const toExecute = (codeToRun || customCode || '').trim();
    if (!toExecute || runningCode) return;

    setRunningCode(true);
    setCodeOutput(null);
    setCodeError(null);

    try {
      const studentId = getStudentId();
      let payloadCode = toExecute;
      const lines = payloadCode.split('\n');
      const lastLine = lines[lines.length - 1].trim();

      // If the code is a single expression without print, wrap it in print() so output displays
      if (
        !payloadCode.includes('print(') &&
        !lastLine.startsWith('def ') &&
        !lastLine.startsWith('for ') &&
        !lastLine.startsWith('while ') &&
        !lastLine.startsWith('import ') &&
        !lastLine.startsWith('class ') &&
        !lastLine.includes('=')
      ) {
        lines[lines.length - 1] = `print(${lastLine})`;
        payloadCode = lines.join('\n');
      }

      const res = await axios.post(`${API_BASE_URL}/execute`, {
        code: payloadCode,
        student_id: studentId
      });

      if (res.data.stdout) {
        setCodeOutput(res.data.stdout.trim());
      } else if (res.data.stderr) {
        setCodeError(res.data.stderr.trim());
      } else {
        setCodeOutput('(Code executed successfully with no printed output)');
      }
    } catch (err) {
      setCodeError('Error executing code: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRunningCode(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <span>Generating adaptive questions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '20px', color: 'var(--error)', textAlign: 'center' }}>
        <h3>Error Loading Quiz</h3>
        <p style={{ marginTop: '10px' }}>{error}</p>
        <button onClick={fetchQuiz} className="btn-primary" style={{ marginTop: '20px' }}>Try Again</button>
      </div>
    );
  }

  if (quizFinished) {
    return (
      <div className="glass-panel" style={{ padding: '24px 16px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
        <div style={{ fontSize: '3.5rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Quiz Completed!</h2>
        
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px 20px', borderRadius: '10px', width: '100%', maxWidth: '360px', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Topic: <strong>{quizData.topic}</strong></p>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Difficulty: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{quizData.difficulty}</span></p>
          <p style={{ margin: '0 0 8px 0', fontSize: '1.05rem' }}>Score: <strong style={{ color: 'var(--success)' }}>{score} / {quizData.questions.length}</strong> ({Math.round((score / quizData.questions.length) * 100)}%)</p>
          {xpGained > 0 && (
            <p style={{ margin: '0', fontSize: '1rem', color: 'var(--warning)', fontWeight: 'bold' }}>⭐ +{xpGained} XP Awarded!</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px', marginTop: '10px' }}>
          <button onClick={fetchQuiz} className="btn-primary" style={{ flex: 1, padding: '10px' }}>Retake Quiz</button>
          {onQuizCompleted && (
            <button onClick={onQuizCompleted} className="btn-primary" style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)' }}>Close</button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const parsedQ = parseQuizQuestion(currentQuestion?.question);
  const activeSnippet = parsedQ.snippet || customCode;

  return (
    <div className="glass-panel" style={{ padding: '18px 16px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Quiz Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>Adaptive Quiz</h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Topic: <strong>{quizData.topic}</strong> • Level: <strong style={{ color: 'var(--accent-secondary)' }}>{quizData.difficulty}</strong>
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
          Question {currentQuestionIndex + 1} of {quizData.questions.length}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Question Prompt */}
        <h4 style={{ fontSize: '1.02rem', margin: 0, color: '#f1f5f9', lineHeight: '1.5', fontWeight: 600 }}>
          {parsedQ.prompt}
        </h4>

        {/* Code Snippet Box with Interactive Runner */}
        {activeSnippet && (
          <div style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            {/* Snippet Header & Run Controls */}
            <div style={{
              background: '#0f172a',
              padding: '8px 12px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.9rem' }}>🐍</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Python Code Snippet
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setIsEditingCode(!isEditingCode)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {isEditingCode ? 'Lock Snippet' : '✏️ Edit'}
                </button>

                <button
                  onClick={() => handleExecuteSnippet(customCode || activeSnippet)}
                  disabled={runningCode}
                  style={{
                    background: runningCode ? 'rgba(59, 130, 246, 0.2)' : 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '5px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: runningCode ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <span>{runningCode ? '⏳ Running...' : '▶️ Test Code Execution'}</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            {isEditingCode ? (
              <textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '70px',
                  background: 'transparent',
                  color: '#38bdf8',
                  border: 'none',
                  padding: '10px 14px',
                  fontFamily: "'Fira Code', Consolas, monospace",
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            ) : (
              <pre style={{
                margin: 0,
                padding: '10px 14px',
                fontFamily: "'Fira Code', Consolas, monospace",
                fontSize: '0.86rem',
                color: '#38bdf8',
                lineHeight: '1.6',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {customCode || activeSnippet}
              </pre>
            )}

            {/* Real-time Code Execution Output Box */}
            {(codeOutput !== null || codeError !== null) && (
              <div style={{
                background: '#020617',
                borderTop: '1px solid #1e293b',
                padding: '10px 14px',
                fontSize: '0.82rem',
                fontFamily: "'Fira Code', Consolas, monospace"
              }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                  💻 Terminal Output:
                </div>
                {codeOutput && (
                  <pre style={{ margin: 0, color: '#34d399', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {codeOutput}
                  </pre>
                )}
                {codeError && (
                  <pre style={{ margin: 0, color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {codeError}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Optional Playground Toggle if question has no automatic snippet */}
        {!parsedQ.snippet && !activeSnippet && (
          <div>
            {!showPlayground ? (
              <button
                onClick={() => setShowPlayground(true)}
                style={{
                  background: 'transparent',
                  border: '1px dashed #334155',
                  color: '#60a5fa',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                🧪 Open Code Playground to test your idea
              </button>
            ) : (
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px' }}>
                <textarea
                  placeholder="Type Python code to test..."
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    background: 'transparent',
                    color: '#38bdf8',
                    border: 'none',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleExecuteSnippet(customCode)}
                    disabled={runningCode}
                    style={{
                      background: '#10b981',
                      border: 'none',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ▶ Run
                  </button>
                  <button
                    onClick={() => setShowPlayground(false)}
                    style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
                {codeOutput && <pre style={{ marginTop: '8px', color: '#34d399', fontSize: '0.8rem' }}>{codeOutput}</pre>}
                {codeError && <pre style={{ marginTop: '8px', color: '#f87171', fontSize: '0.8rem' }}>{codeError}</pre>}
              </div>
            )}
          </div>
        )}

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQuestion.answer;
            const isCodeOption = option.includes('(') || option.includes('[') || option.includes('{') || option.includes('\'') || option.includes('"');
            
            let btnStyle = {
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'rgba(0,0,0,0.25)',
              color: 'white',
              textAlign: 'left',
              fontSize: '0.9rem',
              cursor: isAnswered ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
              fontFamily: isCodeOption ? "'Fira Code', Consolas, monospace" : 'inherit',
              wordBreak: 'break-word',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            };

            if (isAnswered) {
              if (isCorrect) {
                btnStyle.background = 'rgba(16, 185, 129, 0.2)';
                btnStyle.borderColor = 'var(--success)';
                btnStyle.color = '#a7f3d0';
                btnStyle.fontWeight = 700;
              } else if (isSelected) {
                btnStyle.background = 'rgba(239, 68, 68, 0.2)';
                btnStyle.borderColor = 'var(--error)';
                btnStyle.color = '#fca5a5';
              }
            }

            return (
              <button 
                key={idx}
                onClick={() => handleOptionSelect(option)}
                style={btnStyle}
                disabled={isAnswered}
              >
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isAnswered && isCorrect ? '#10b981' : isAnswered && isSelected ? '#ef4444' : 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span style={{ flex: 1 }}>{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation Alert */}
        {isAnswered && (
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.08)', 
            border: '1px solid rgba(59, 130, 246, 0.25)', 
            padding: '14px', 
            borderRadius: '8px', 
            fontSize: '0.85rem', 
            lineHeight: '1.5',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <strong style={{ color: selectedOption === currentQuestion.answer ? '#34d399' : '#f87171', display: 'block', marginBottom: '4px' }}>
              {selectedOption === currentQuestion.answer ? '✓ Correct Answer!' : '✗ Incorrect Answer'}
            </strong>
            <span style={{ color: 'var(--text-secondary)' }}>{currentQuestion.explanation}</span>
          </div>
        )}
      </div>

      {/* Next Question / Finish Quiz Button */}
      {isAnswered && (
        <button 
          onClick={handleNext} 
          className="btn-primary" 
          style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
        >
          {currentQuestionIndex < quizData.questions.length - 1 ? 'Next Question →' : 'Finish Quiz 🏁'}
        </button>
      )}
    </div>
  );
}
