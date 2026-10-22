import React, { useState, useEffect } from 'react';

export default function TeacherDashboard() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showPlagDiff, setShowPlagDiff] = useState(false);

  const students = [
    { 
      id: 1, 
      name: "Alex Coder", 
      score: 85, 
      status: "Good", 
      plagFlags: 0, 
      lastActive: "10 mins ago", 
      emotion: "Neutral",
      activityLog: [
        "10 mins ago: Submitted Lesson 3: Lists & Loops (Grade: 85%)",
        "25 mins ago: Opened practice workspace",
        "1 hour ago: Completed Lesson 2 quiz"
      ]
    },
    { 
      id: 2, 
      name: "Sam Smith", 
      score: 45, 
      status: "Needs Help", 
      plagFlags: 0, 
      lastActive: "2 hours ago", 
      emotion: "Confused",
      activityLog: [
        "2 hours ago: Spent 15 mins on Lesson 3 without progress",
        "3 hours ago: Opened compiler but ran into syntax errors",
        "Yesterday: Completed Lesson 1 (Grade: 60%)"
      ]
    },
    { 
      id: 3, 
      name: "Jordan Lee", 
      score: 92, 
      status: "Excellent", 
      plagFlags: 1, 
      lastActive: "5 mins ago", 
      emotion: "Happy",
      activityLog: [
        "5 mins ago: Completed OOP Lesson (Grade: 92%)",
        "12 mins ago: Plagiarism alert: 80% code similarity with Alex Coder",
        "30 mins ago: Solved advanced recursion challenge"
      ]
    },
    { 
      id: 4, 
      name: "Taylor Swift", 
      score: 30, 
      status: "At Risk", 
      plagFlags: 0, 
      lastActive: "1 day ago", 
      emotion: "Frustrated",
      activityLog: [
        "1 day ago: Emotion alert: High frustration detected",
        "2 days ago: Failed Quiz 2: Functions (Grade: 30%)",
        "3 days ago: Started Functions course"
      ]
    }
  ];

  const triggerToast = (msg) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    triggerToast(`Message sent successfully to ${selectedStudent.name}!`);
    setIsMessaging(false);
    setMessageText('');
  };

  return (
    <div className="app-container" style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem' }}>Teacher Dashboard</h1>
        <button className="btn-primary" style={{ background: 'var(--success)' }} onClick={() => triggerToast("Class report generated!")}>Generate Class Report</button>
      </div>

      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <MetricCard title="Total Students" value="24" icon="👥" />
        <MetricCard title="Class Average" value="76%" icon="📈" />
        <MetricCard title="Active Today" value="18" icon="🔥" />
        <MetricCard title="Plagiarism Alerts" value="2" icon="⚠️" color="var(--error)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Student List */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Student Performance</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Score</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Alerts</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.name}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                        <div style={{ width: `${s.score}%`, height: '100%', background: s.score > 70 ? 'var(--success)' : s.score > 40 ? 'var(--warning)' : 'var(--error)', borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontSize: '0.9rem' }}>{s.score}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: s.score > 70 ? 'var(--success)' : s.score > 40 ? 'var(--warning)' : 'var(--error)' }}>{s.status}</td>
                  <td style={{ padding: '12px' }}>
                    {s.plagFlags > 0 ? <span style={{ background: 'var(--error)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{s.plagFlags}</span> : '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => setSelectedStudent(s)} style={{ background: 'transparent', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Summary */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginBottom: '15px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🤖</span> AI Insights
          </h2>
          <div style={{ flex: 1, background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '15px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '10px' }}><strong style={{ color: 'var(--text-primary)' }}>Class Trend:</strong> 75% of students are struggling with the concept of "Object-Oriented Programming (Classes & Objects)".</p>
            <p style={{ marginBottom: '10px' }}><strong style={{ color: 'var(--error)' }}>Intervention Needed:</strong> Taylor Swift has failed the last 3 quizzes and seems frustrated based on emotion tracking.</p>
            <p><strong style={{ color: 'var(--success)' }}>Positive Note:</strong> Overall code submission rate has increased by 20% this week.</p>
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '30px', width: showPlagDiff ? '800px' : '480px', maxWidth: '95%', position: 'relative', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)', transition: 'width 0.3s' }}>
            <button 
              onClick={() => {
                setSelectedStudent(null);
                setIsMessaging(false);
                setShowActivity(false);
                setShowPlagDiff(false);
              }} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
            <h2 style={{ marginBottom: '5px', fontSize: '1.6rem', color: 'var(--text-primary)' }}>{selectedStudent.name}</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', marginBottom: '20px' }}>Current Score: <strong style={{ color: 'var(--accent-secondary)' }}>{selectedStudent.score}%</strong></p>
            
            {/* Conditional Views */}
            {isMessaging ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Compose Message to {selectedStudent.name}:</label>
                <textarea 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', resize: 'none' }}
                  placeholder="Type your message here..."
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleSendMessage} className="btn-primary" style={{ flex: 1, fontSize: '0.9rem', padding: '10px' }}>Send Message</button>
                  <button onClick={() => setIsMessaging(false)} className="btn-primary" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', fontSize: '0.9rem', padding: '10px' }}>Cancel</button>
                </div>
              </div>
            ) : showActivity ? (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--accent-secondary)' }}>Recent Activity Log</h3>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {selectedStudent.activityLog.map((log, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                      {log}
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowActivity(false)} className="btn-primary" style={{ width: '100%', marginTop: '15px', background: 'transparent', border: '1px solid var(--border)', fontSize: '0.9rem', padding: '10px' }}>Back to Stats</button>
              </div>
            ) : showPlagDiff ? (
              <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s ease-out' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '5px', color: 'var(--error)' }}>⚠️ Plagiarism AST Heatmap</h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Comparing structural logic similarity (Similarity Index: <strong style={{ color: 'var(--error)' }}>92%</strong>)</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  {/* Left Side: Jordan Lee */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-secondary)' }}>Jordan Lee (Flagged Submission)</div>
                    <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', lineHeight: '1.6', color: '#f8fafc' }}>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>def find_evens(numbers):</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>    evens_list = []</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>    for num in numbers:</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>        if num % 2 == 0:</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>            evens_list.append(num)</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>    return evens_list</div>
                    </pre>
                  </div>

                  {/* Right Side: Alex Coder */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-secondary)' }}>Alex Coder (Original Submission)</div>
                    <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', lineHeight: '1.6', color: '#f8fafc' }}>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>def find_evens(nums):</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>    result = []</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>    for x in nums:</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>        if x % 2 == 0:</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>            result.append(x)</div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0 4px' }}>    return result</div>
                    </pre>
                  </div>
                </div>
                
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.82rem', color: '#fca5a5', marginBottom: '15px' }}>
                  <strong>AST Verdict:</strong> The codes share an identical Abstract Syntax Tree structure. The student renamed local parameters and list bindings but copied the control flow and modulo decision logic identically.
                </div>
                <button onClick={() => setShowPlagDiff(false)} className="btn-primary" style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', fontSize: '0.9rem', padding: '10px' }}>Back to Stats</button>
              </div>
            ) : (
              <>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}><strong>Status:</strong> <span style={{ color: selectedStudent.score > 70 ? 'var(--success)' : selectedStudent.score > 40 ? 'var(--warning)' : 'var(--error)' }}>{selectedStudent.status}</span></p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}><strong>Plagiarism Flags:</strong> <span style={{ color: selectedStudent.plagFlags > 0 ? 'var(--error)' : 'var(--text-primary)' }}>{selectedStudent.plagFlags}</span></p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}><strong>Last Active:</strong> {selectedStudent.lastActive}</p>
                  <p style={{ margin: '0', fontSize: '0.95rem' }}><strong>Recent Emotion:</strong> <span style={{ color: selectedStudent.emotion === 'Confused' ? 'var(--warning)' : selectedStudent.emotion === 'Frustrated' ? 'var(--error)' : selectedStudent.emotion === 'Happy' ? 'var(--success)' : 'var(--text-primary)' }}>{selectedStudent.emotion}</span></p>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button onClick={() => setIsMessaging(true)} className="btn-primary" style={{ flex: 1, fontSize: '0.9rem', padding: '10px' }}>Message Student</button>
                  <button onClick={() => setShowActivity(true)} className="btn-primary" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', fontSize: '0.9rem', padding: '10px' }}>View Activity</button>
                  {selectedStudent.plagFlags > 0 && (
                    <button onClick={() => setShowPlagDiff(true)} className="btn-primary" style={{ width: '100%', background: 'var(--error)', fontSize: '0.9rem', padding: '10px', marginTop: '5px' }}>View Plagiarism Heatmap</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: 'rgba(16, 185, 129, 0.95)', color: 'white', padding: '15px 25px', borderRadius: '8px', zIndex: 2000, boxShadow: '0 4px 15px rgba(0,0,0,0.3)', animation: 'slideInRight 0.3s ease-out', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>✓</span>
          <span style={{ fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, color = "var(--accent-primary)" }) {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>{title}</h3>
        <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: color }}>{value}</p>
      </div>
    </div>
  );
}
