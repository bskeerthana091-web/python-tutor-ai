import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Line as LineChart, Radar as RadarChart, Bar as BarChart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [profile, setProfile] = useState(null);

  const studentId = user?.id || localStorage.getItem('studentId') || '1';
  const userEmail = user?.email || localStorage.getItem('userEmail') || '';
  const userName = user?.name || localStorage.getItem('userName') || 'Student';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        let sid = studentId;
        if (userEmail) {
          const sRes = await axios.get(`${API_BASE_URL}/student/${encodeURIComponent(userEmail)}?name=${encodeURIComponent(userName)}`);
          if (sRes.data) {
            setProfile(sRes.data);
            if (sRes.data.id) {
              sid = sRes.data.id;
              localStorage.setItem('studentId', String(sid));
            }
          }
        }
        const mRes = await axios.get(`${API_BASE_URL}/learning-metrics/${sid}`);
        setMetrics(mRes.data);
      } catch {
        setMetrics(null);
      }
    };
    fetchAnalytics();
  }, [studentId, userEmail, userName]);

  const lineData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'XP Gained',
      data: [120, 190, 300, 500, 200, 300, 450],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      tension: 0.4
    }]
  };

  const radarTopics = ['Variables', 'Loops', 'Functions', 'OOP', 'Data Structures', 'Algorithms'];
  const radarScores = radarTopics.map(t => (metrics?.topic_scores && metrics.topic_scores[t] !== undefined) ? metrics.topic_scores[t] : 60);

  const radarData = {
    labels: radarTopics,
    datasets: [{
      label: 'Skill Mastery (%)',
      data: radarScores,
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderColor: '#10b981',
      pointBackgroundColor: '#10b981',
      pointBorderColor: '#fff',
    }]
  };

  const options = {
    responsive: true,
    plugins: { legend: { labels: { color: '#e2e8f0' } } },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  const radarOptions = {
    responsive: true,
    scales: {
      r: {
        angleLines: { color: 'rgba(255,255,255,0.1)' },
        grid: { color: 'rgba(255,255,255,0.1)' },
        pointLabels: { color: '#e2e8f0' },
        ticks: { display: false }
      }
    },
    plugins: { legend: { labels: { color: '#e2e8f0' } } }
  };

  // Learning Journey Chart Data
  const weeklyLabels = metrics?.weekly_averages ? Object.keys(metrics.weekly_averages) : ['W1', 'W2', 'W3', 'W4'];
  const weeklyScores = metrics?.weekly_averages ? Object.values(metrics.weekly_averages) : [45, 58, 72, 85];

  const journeyData = {
    labels: weeklyLabels,
    datasets: [{
      label: 'Average Quiz Score',
      data: weeklyScores,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      tension: 0.4,
      fill: true,
      pointRadius: 5,
      pointBackgroundColor: '#10b981',
    }]
  };

  // Time-to-Solve Chart Data
  const timeData = metrics?.time_trends || [
    { quiz: 1, time: 90 }, { quiz: 2, time: 75 }, { quiz: 3, time: 60 },
    { quiz: 4, time: 45 }, { quiz: 5, time: 30 }, { quiz: 6, time: 25 }
  ];

  const timeSolveData = {
    labels: timeData.map(d => `Q${d.quiz}`),
    datasets: [{
      label: 'Time to Solve (seconds)',
      data: timeData.map(d => d.time),
      backgroundColor: timeData.map(d => d.time > 60 ? 'rgba(239,68,68,0.7)' : d.time > 30 ? 'rgba(245,158,11,0.7)' : 'rgba(16,185,129,0.7)'),
      borderRadius: 6,
    }]
  };

  // Learning Pathway
  const pathway = [
    { name: 'Beginner', emoji: '🌱' },
    { name: 'Variables', emoji: '📦' },
    { name: 'Loops', emoji: '🔁' },
    { name: 'Functions', emoji: '⚙️' },
    { name: 'OOP', emoji: '🏗️' },
    { name: 'Data Structures', emoji: '📊' },
    { name: 'Algorithms', emoji: '🧠' },
    { name: 'Internship Ready', emoji: '🎓' }
  ];
  const pathPos = metrics?.pathway_position || 3;

  return (
    <div className="app-container" style={{ padding: '30px', overflowY: 'auto' }}>
      <h1 style={{ marginBottom: '30px', fontSize: '2rem' }}>📊 Learning Analytics</h1>
      
      {/* Existing Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '20px' }}>
          <h3>Progress Over Time</h3>
          <div style={{ marginTop: '20px', height: '300px' }}>
            <LineChart data={lineData} options={options} />
          </div>
        </div>

        <div className="glass-panel animate-fade-in" style={{ padding: '20px', animationDelay: '0.1s' }}>
          <h3>Topic Mastery (Strong/Weak Areas)</h3>
          <div style={{ marginTop: '20px', height: '300px', display: 'flex', justifyContent: 'center' }}>
            <RadarChart data={radarData} options={radarOptions} />
          </div>
        </div>
      </div>

      {/* NEW: Learning Journey + Time-to-Solve */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '20px', animationDelay: '0.2s' }}>
          <h3 style={{ marginBottom: '5px' }}>📈 Learning Journey</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 15px' }}>Average quiz scores over time — proof the AI is helping!</p>
          <div style={{ height: '280px' }}>
            <LineChart data={journeyData} options={options} />
          </div>
        </div>

        <div className="glass-panel animate-fade-in" style={{ padding: '20px', animationDelay: '0.3s' }}>
          <h3 style={{ marginBottom: '5px' }}>⏱️ Time-to-Solve Trend</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 15px' }}>Decreasing solve times = you're getting faster!</p>
          <div style={{ height: '280px' }}>
            <BarChart data={timeSolveData} options={{
              ...options,
              plugins: { ...options.plugins, legend: { display: false } }
            }} />
          </div>
        </div>
      </div>

      {/* NEW: Learning Pathway Progress */}
      <div className="glass-panel animate-fade-in" style={{ padding: '30px', animationDelay: '0.4s' }}>
        <h3 style={{ marginBottom: '25px' }}>🛤️ Your Learning Pathway</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
          {/* Connection Line */}
          <div style={{ position: 'absolute', top: '25px', left: '40px', right: '40px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', zIndex: 0 }}>
            <div style={{ width: `${(pathPos / (pathway.length - 1)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: '2px', transition: 'width 1s ease-out' }} />
          </div>

          {pathway.map((stage, i) => {
            const isCompleted = i < pathPos;
            const isCurrent = i === pathPos;
            const isLocked = i > pathPos;

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, position: 'relative' }}>
                <span style={{ fontSize: '1.5rem' }}>{stage.emoji}</span>
                <div style={{
                  width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCompleted ? 'linear-gradient(135deg, #10b981, #059669)' : isCurrent ? 'linear-gradient(135deg, #3b82f6, #60a5fa)' : 'rgba(255,255,255,0.04)',
                  border: isCompleted ? '3px solid #10b981' : isCurrent ? '3px solid #60a5fa' : '2px solid var(--border)',
                  boxShadow: isCurrent ? '0 0 20px rgba(59,130,246,0.5)' : 'none',
                  animation: isCurrent ? 'glowPulse 2s infinite' : 'none',
                  color: isLocked ? 'var(--text-secondary)' : 'white', fontSize: '1rem', fontWeight: 700
                }}>
                  {isCompleted ? '✓' : isCurrent ? '●' : '🔒'}
                </div>
                <span style={{ fontSize: '0.72rem', color: isCompleted ? 'var(--success)' : isCurrent ? 'var(--accent-secondary)' : 'var(--text-secondary)', fontWeight: isCurrent ? 700 : 500, textAlign: 'center', maxWidth: '70px' }}>
                  {stage.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Evaluation Metric */}
        <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(59,130,246,0.05)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.1)', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>{metrics?.total_quizzes || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Quizzes Done</div>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{pathPos}/{pathway.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pathway Progress</div>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--warning)' }}>{metrics?.mastered_topics?.length || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Topics Mastered</div>
          </div>
        </div>
      </div>
    </div>
  );
}
