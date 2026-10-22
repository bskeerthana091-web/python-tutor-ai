import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

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
    } catch (err) {
      setError("Failed to load adaptive quiz. Make sure the backend server is running.");
    } finally {
      setLoading(false);
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
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
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
        time_spent: 30, // Spent time in seconds
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
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
        <div style={{ fontSize: '4rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Quiz Completed!</h2>
        
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '360px', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Topic: <strong>{quizData.topic}</strong></p>
          <p style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Difficulty: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{quizData.difficulty}</span></p>
          <p style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Score: <strong style={{ color: 'var(--success)' }}>{score} / {quizData.questions.length}</strong> ({Math.round((score / quizData.questions.length) * 100)}%)</p>
          {xpGained > 0 && (
            <p style={{ margin: '0', fontSize: '1.1rem', color: 'var(--warning)', fontWeight: 'bold' }}>⭐ +{xpGained} XP Awarded!</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px', marginTop: '10px' }}>
          <button onClick={fetchQuiz} className="btn-primary" style={{ flex: 1 }}>Retake Quiz</button>
          {onQuizCompleted && (
            <button onClick={onQuizCompleted} className="btn-primary" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }}>Close</button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];

  return (
    <div className="glass-panel" style={{ padding: '25px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Adaptive Quiz</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Topic: <strong>{quizData.topic}</strong> • Level: <strong style={{ color: 'var(--accent-secondary)' }}>{quizData.difficulty}</strong>
          </span>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px' }}>
          Question {currentQuestionIndex + 1} of {quizData.questions.length}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h4 style={{ fontSize: '1.1rem', margin: 0, color: 'white', lineHeight: '1.5' }}>
          {currentQuestion.question}
        </h4>

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQuestion.answer;
            
            let btnStyle = {
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'rgba(0,0,0,0.2)',
              color: 'white',
              textAlign: 'left',
              fontSize: '0.95rem',
              cursor: isAnswered ? 'default' : 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            };

            if (isAnswered) {
              if (isCorrect) {
                btnStyle.background = 'rgba(16, 185, 129, 0.2)';
                btnStyle.borderColor = 'var(--success)';
                btnStyle.color = '#a7f3d0';
              } else if (isSelected) {
                btnStyle.background = 'rgba(239, 68, 68, 0.2)';
                btnStyle.borderColor = 'var(--error)';
                btnStyle.color = '#fca5a5';
              }
            } else {
              btnStyle[':hover'] = {
                borderColor: 'var(--accent-secondary)',
                background: 'rgba(59, 130, 246, 0.05)'
              };
            }

            return (
              <button 
                key={idx}
                onClick={() => handleOptionSelect(option)}
                style={btnStyle}
                disabled={isAnswered}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Explanation Alert */}
        {isAnswered && (
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.06)', 
            border: '1px solid rgba(59, 130, 246, 0.2)', 
            padding: '15px', 
            borderRadius: '8px', 
            fontSize: '0.85rem', 
            lineHeight: '1.5',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <strong style={{ color: 'var(--accent-secondary)', display: 'block', marginBottom: '4px' }}>
              {selectedOption === currentQuestion.answer ? '✓ Correct!' : '✗ Incorrect'}
            </strong>
            <span style={{ color: 'var(--text-secondary)' }}>{currentQuestion.explanation}</span>
          </div>
        )}
      </div>

      {isAnswered && (
        <button 
          onClick={handleNext} 
          className="btn-primary" 
          style={{ width: '100%', padding: '12px' }}
        >
          {currentQuestionIndex < quizData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
        </button>
      )}
    </div>
  );
}
