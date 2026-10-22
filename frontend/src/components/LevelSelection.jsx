import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LevelSelection() {
  const navigate = useNavigate();

  const handleSelect = (level) => {
    // In real app, save to context or backend
    console.log("Selected level:", level);
    navigate('/learn');
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Choose Your Path</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Select your current Python experience level</p>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <LevelCard 
          title="Beginner" 
          desc="I am completely new to Python or programming in general."
          icon="🌱"
          color="#10b981"
          onClick={() => handleSelect('Beginner')}
        />
        <LevelCard 
          title="Intermediate" 
          desc="I know basic syntax, loops, and functions. Ready for OOP."
          icon="🚀"
          color="#3b82f6"
          onClick={() => handleSelect('Intermediate')}
        />
        <LevelCard 
          title="Advanced" 
          desc="I know OOP and want to master algorithms and complex concepts."
          icon="⚡"
          color="#8b5cf6"
          onClick={() => handleSelect('Advanced')}
        />
      </div>
    </div>
  );
}

function LevelCard({ title, desc, icon, color, onClick }) {
  return (
    <div 
      className="glass-panel" 
      onClick={onClick}
      style={{ 
        padding: '30px', 
        width: '300px', 
        cursor: 'pointer', 
        transition: 'all 0.3s ease',
        borderTop: `4px solid ${color}`
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-10px)';
        e.currentTarget.style.boxShadow = `0 10px 30px ${color}33`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '20px' }}>{icon}</div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{desc}</p>
    </div>
  );
}
