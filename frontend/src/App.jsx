import React, { useState, useRef, useEffect } from 'react';

// --- AuthForms Component ---
const AuthForms = ({ setAuthToken, setUserRole }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ 
    username: '', email: '', password: '', role: 'Learner', experienceLevel: 'Beginner' 
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    let fetchOptions = {
      method: 'POST',
    };

    if (isLogin) {
      // FastAPI OAuth2 requires Form Data (URLSearchParams) and a 'username' field
      const loginData = new URLSearchParams();
      loginData.append('username', formData.email); // FastAPI expects the key to be 'username'
      loginData.append('password', formData.password);
      
      fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      fetchOptions.body = loginData;
    } else {
      // Registration usually accepts standard JSON
      fetchOptions.headers = { 'Content-Type': 'application/json' };
      fetchOptions.body = JSON.stringify(formData);
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, fetchOptions);
      const data = await response.json();
      
      if (response.ok) {
        if (isLogin) {
          setAuthToken(data.access_token);
          setUserRole(data.role); 
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('userRole', data.role);
        } else { 
          alert("Registration successful!"); 
          setIsLogin(true); 
        }
      } else { 
        alert("Error: " + data.detail); 
      }
    } catch (err) { 
      alert("Failed to connect to the backend."); 
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: 'auto', marginTop: '10vh', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>{isLogin ? 'Welcome Back 👋' : 'Create an Account'}</h2>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Sign in to access your debate workspace.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {!isLogin && <input type="text" name="username" placeholder="Full Name" required value={formData.username} onChange={handleChange} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />}
        <input type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={handleChange} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
        <input type="password" name="password" placeholder="Password" required value={formData.password} onChange={handleChange} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
        
        {!isLogin && (
          <>
            <select name="role" value={formData.role} onChange={handleChange} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
              <option value="Learner">Learner</option>
              <option value="Educator">Educator</option>
              <option value="Debate Coach">Debate Coach</option>
              <option value="Administrator">Administrator</option>
            </select>
            <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </>
        )}
        
        <button type="submit" style={{ padding: '14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s', marginTop: '10px' }}>
          {isLogin ? 'Login' : 'Register'}
        </button>
        <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '14px', marginTop: '10px' }}>
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </button>
      </form>
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ authToken, userRole, logout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Debate Room State
  const [argumentText, setArgumentText] = useState('');
  const [debateFormat, setDebateFormat] = useState('One-on-One Debate');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Scheduling Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', topic: 'AI Ethics', format: 'One-on-One Debate' });

  // --- NEW: History Tracking State & Logic ---
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Automatically fetch history when the user clicks the 'Reports' tab
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/debate/history', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      setHistoryData(data.history || []);
    } catch (error) {
      console.error("Failed to fetch history");
    }
    setIsLoadingHistory(false);
  };

  // Calculate real averages for the dashboard
  const totalDebates = historyData.length;
  const avgLogic = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.logical_consistency, 0) / totalDebates) : 0;
  const avgSpeaking = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + (row.clarity + row.persuasiveness) / 2, 0) / totalDebates) : 0;
  const avgEvidence = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.evidence_strength, 0) / totalDebates) : 0;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAnalyze = async () => {
    if (!argumentText.trim() && !audioBlob) return alert("Please type an argument or record your voice.");
    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append("text_argument", argumentText);
      formData.append("debate_format", debateFormat);
      formData.append("session_id", "s1");
      formData.append("duration", "30.0");
      if (audioBlob) formData.append("audio_file", audioBlob, "user_argument.webm");

      const response = await fetch('http://127.0.0.1:8000/api/v1/debate/turn', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      
      const data = await response.json();
      console.log("RECEIVED FROM BACKEND:", data);
      setAnalysisResult(data);
    } catch (error) { 
      alert("Error connecting to the analysis server."); 
    }
    setIsAnalyzing(false);
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    alert(`Session scheduled for ${scheduleData.date} at ${scheduleData.time} on the topic of ${scheduleData.topic}!`);
    setShowScheduleModal(false);
    setActiveTab('sessions'); // Redirect to sessions tab to show the new booking
  };

  const navButtonStyle = (tabName) => ({
    display: 'block', width: '100%', padding: '12px 15px', marginBottom: '8px',
    textAlign: 'left', background: activeTab === tabName ? '#e0e7ff' : 'transparent',
    color: activeTab === tabName ? '#4f46e5' : '#64748b',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
    transition: 'all 0.2s'
  });

  const isManager = userRole === 'Administrator' || userRole === 'Debate Coach' || userRole === 'Educator';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* --- SIDEBAR NAVIGATION --- */}
      <div style={{ width: '260px', background: 'white', padding: '24px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#4f46e5', marginTop: 0, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🎙️ Debate AI
        </h2>
        
        <div style={{ flexGrow: 1 }}>
          <button onClick={() => setActiveTab('dashboard')} style={navButtonStyle('dashboard')}>🏠 Overview</button>
          <button onClick={() => setActiveTab('profile')} style={navButtonStyle('profile')}>👤 Profile</button>
          <button onClick={() => setActiveTab('topics')} style={navButtonStyle('topics')}>📚 Topics</button>
          <button onClick={() => setActiveTab('sessions')} style={navButtonStyle('sessions')}>📅 Sessions</button>
          <button onClick={() => setActiveTab('room')} style={navButtonStyle('room')}>🎙️ Debate Room</button>
          <button onClick={() => setActiveTab('reports')} style={navButtonStyle('reports')}>📊 Skills & Reports</button>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'center' }}>
          <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
            <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>Logged in as</p>
            <strong style={{ color: '#0f172a' }}>{userRole || 'Learner'}</strong>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '10px', background: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>Logout</button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div style={{ flexGrow: 1, padding: '40px', overflowY: 'auto' }}>
        
        {/* 1. Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Dashboard</h2>

            {/* LEARNER BANNER */}
            {(!userRole || userRole === 'Learner') && (
              <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)', borderRadius: '16px', padding: '30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', boxShadow: '0 10px 20px rgba(79, 70, 229, 0.2)' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '24px' }}>Ready to test your skills? 🎤</h2>
                  <p style={{ margin: 0, color: '#e0e7ff', maxWidth: '500px', lineHeight: '1.5' }}>
                    Put your knowledge into practice. Schedule a live debate session with a peer or an AI mentor to refine your arguments and track your progress.
                  </p>
                </div>
                <button 
                  onClick={() => setShowScheduleModal(true)} 
                  style={{ padding: '14px 28px', background: 'white', color: '#4f46e5', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                >
                  Schedule Session
                </button>
              </div>
            )}

            {/* EDUCATOR BANNER */}
            {userRole === 'Educator' && (
              <div style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderRadius: '16px', padding: '30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '24px' }}>Welcome to your Classroom 📚</h2>
                  <p style={{ margin: 0, color: '#d1fae5', maxWidth: '500px', lineHeight: '1.5' }}>
                    Manage your students, review AI-generated debate transcripts, and track class-wide logical fallacy trends.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('sessions')} 
                  style={{ padding: '14px 28px', background: 'white', color: '#059669', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                >
                  Manage Classes
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                {userRole === 'Administrator' && <div style={{ color: '#991b1b' }}><strong>Admin Alerts:</strong> 3 new user registrations pending review.</div>}
                
                {userRole === 'Debate Coach' && <div style={{ color: '#3730a3' }}><strong>Coach Alerts:</strong> 5 new debate sessions need your feedback.</div>}
                
                {/* NEW: EDUCATOR ALERTS */}
                {userRole === 'Educator' && (
                  <>
                    <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '14px', textTransform: 'uppercase' }}>Recent Activity</h3>
                    <div style={{ color: '#065f46', background: '#d1fae5', padding: '15px', borderRadius: '8px', fontWeight: '500' }}>
                      📝 12 students completed the "AI Ethics" assignment.
                    </div>
                  </>
                )}

                {(!userRole || userRole === 'Learner') && (
                  <>
                    <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '14px', textTransform: 'uppercase' }}>Next Up</h3>
                    <div style={{ color: '#166534', background: '#dcfce7', padding: '15px', borderRadius: '8px', fontWeight: '500' }}>
                      📅 Oxford Debate: "Universal Basic Income" tomorrow at 2:00 PM.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 2. User Profile */}
        {activeTab === 'profile' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a' }}>My Profile</h2>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '100px', height: '100px', background: '#cbd5e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>
              <div>
                <p style={{ margin: '5px 0' }}><strong>Role:</strong> {userRole}</p>
                <p style={{ margin: '5px 0' }}><strong>Total Debates:</strong> 12</p>
                <button style={{ padding: '8px 16px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer' }}>Edit Bio</button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Topic Management */}
        {activeTab === 'topics' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a' }}>Topic Library</h2>
            {isManager ? (
              <div style={{ border: '2px dashed #cbd5e1', padding: '30px', borderRadius: '12px', textAlign: 'center', background: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>➕ Create New Topic</h4>
                <p style={{ color: '#64748b', marginBottom: '20px' }}>Add new subjects to the database for learners to debate.</p>
                <button style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Add Topic</button>
              </div>
            ) : (
              <div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '15px' }}>
                  <li style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '16px' }}>AI Ethics and Data Privacy</strong>
                      <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Difficulty: Intermediate</div>
                    </div>
                    <button style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>View Brief</button>
                  </li>
                  <li style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '16px' }}>Universal Basic Income</strong>
                      <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Difficulty: Advanced</div>
                    </div>
                    <button style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>View Brief</button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 4. Debate Sessions */}
        {activeTab === 'sessions' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a' }}>Debate Sessions</h2>
            {isManager ? (
              <div>
                <p style={{ color: '#64748b' }}>Monitor live rooms and assign topics to specific learners.</p>
                <button style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Create Session</button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0 }}>My Upcoming Sessions</h4>
                  <button onClick={() => setShowScheduleModal(true)} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ New Session</button>
                </div>
                <div style={{ padding: '20px', background: '#f8fafc', borderLeft: '4px solid #4f46e5', borderRadius: '8px' }}>
                  <strong style={{ display: 'block', fontSize: '16px', marginBottom: '5px' }}>Climate Change Policy</strong>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Session ID: #1042 • Starts in 2 hours</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 5. DEBATE ROOM WITH AUDIO */}
        {activeTab === 'room' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a' }}>Live Debate Room</h2>
            {isManager ? (
              <div style={{ padding: '30px', background: '#f1f5f9', color: '#64748b', borderRadius: '12px', textAlign: 'center' }}>
                You are in Manager Mode. To simulate a debate, please log in as a Learner.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Select Debate Format</label>
                  <select value={debateFormat} onChange={(e) => setDebateFormat(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc' }}>
                    {["One-on-One Debate", "AI Debate Simulation", "Oxford Debate", "Public Forum Debate", "Policy Debate", "Parliamentary Debate"].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                
                {/* Text Argument */}
                <textarea value={argumentText} onChange={(e) => setArgumentText(e.target.value)} placeholder="Type your argument here..." style={{ width: '100%', height: '140px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
                
                {/* Audio Recording Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <button 
                    onClick={isRecording ? stopRecording : startRecording} 
                    style={{ 
                      padding: '12px 24px', 
                      background: isRecording ? '#ef4444' : '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.2s'
                    }}>
                    {isRecording ? "🛑 Stop Recording" : "🎤 Record Argument"}
                  </button>
                  
                  {isRecording && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Recording in progress...</span>}
                  
                  {audioURL && !isRecording && (
                    <audio src={audioURL} controls style={{ height: '40px', flexGrow: 1 }} />
                  )}
                </div>

                <button onClick={handleAnalyze} disabled={isAnalyzing} style={{ width: '100%', padding: '16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: isAnalyzing ? 'not-allowed' : 'pointer', opacity: isAnalyzing ? 0.7 : 1, transition: 'background 0.2s' }}>
                  {isAnalyzing ? "Analyzing Argument..." : "Get AI Feedback ✨"}
                </button>

                {/* ✨ THIS IS THE ONLY PART THAT WAS CHANGED - YOUR NEW RICH UI FOR JSON */}
                {analysisResult && analysisResult.scores ? (
                  <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 1. Core Analysis */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px' }}>Argument Breakdown</h3>
                      
                      {/* ✨ NEW: DISPLAY THE TRANSCRIPT */}
                      {analysisResult.user_transcript && (
                        <div style={{ marginBottom: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                          <strong style={{ color: '#334155', display: 'block', marginBottom: '5px' }}>🗣️ What the AI Heard:</strong>
                          <span style={{ color: '#475569', fontStyle: 'italic', lineHeight: '1.5' }}>"{analysisResult.user_transcript}"</span>
                        </div>
                      )}

                      <p style={{ color: '#334155', margin: '10px 0' }}><strong>Core Claim:</strong> {analysisResult.core_claim}</p>
                      <div style={{ marginTop: '10px' }}>
                        <strong style={{ color: '#334155' }}>Evidence Provided:</strong>
                        <ul style={{ color: '#475569', paddingLeft: '20px', marginTop: '5px' }}>
                          {analysisResult.supporting_evidence?.map((ev, idx) => (
                            <li key={idx} style={{ marginBottom: '5px' }}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 2. Evaluation Scores */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px', marginBottom: '20px' }}>Evaluation Scores</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {Object.entries(analysisResult.scores).map(([metric, score]) => (
                          <div key={metric} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ textTransform: 'capitalize', color: '#475569', width: '35%', fontSize: '14px', fontWeight: '500' }}>
                              {metric.replace('_', ' ')}
                            </span>
                            <div style={{ flex: 1, margin: '0 15px', background: '#e2e8f0', borderRadius: '999px', height: '10px' }}>
                              <div style={{ background: '#4f46e5', height: '10px', borderRadius: '999px', width: `${score}%`, transition: 'width 1s ease-in-out' }}></div>
                            </div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b', width: '50px', textAlign: 'right' }}>{score}/100</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Logical Fallacies (Only appears if a fallacy is detected) */}
                    {analysisResult.fallacies_detected?.length > 0 && (
                      <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <h3 style={{ marginTop: 0, color: '#b91c1c', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          🚨 Logical Fallacies Detected
                        </h3>
                        {analysisResult.fallacies_detected.map((fallacy, idx) => (
                          <div key={idx} style={{ marginBottom: '15px' }}>
                            <h4 style={{ color: '#b91c1c', margin: '0 0 5px 0' }}>{fallacy.fallacy_name}</h4>
                            <blockquote style={{ fontStyle: 'italic', borderLeft: '4px solid #f87171', paddingLeft: '15px', margin: '10px 0', color: '#7f1d1d', background: '#fee2e2', padding: '10px 15px', borderRadius: '0 8px 8px 0' }}>
                              "{fallacy.quote}"
                            </blockquote>
                            <p style={{ margin: '5px 0', color: '#1e293b', fontSize: '14px' }}><strong>Why:</strong> {fallacy.explanation}</p>
                            <p style={{ margin: '5px 0', color: '#047857', fontSize: '14px' }}><strong>Fix:</strong> {fallacy.correction_suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 4. AI Rebuttal */}
                    <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', borderTop: '1px solid #bfdbfe', borderRight: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe' }}>
                      <h3 style={{ marginTop: 0, color: '#1e3a8a', fontSize: '18px', marginBottom: '10px' }}>AI Coach Rebuttal</h3>
                      <p style={{ margin: 0, color: '#1e40af', lineHeight: '1.6' }}>{analysisResult.ai_rebuttal}</p>
                    </div>

                  </div>
                ) : analysisResult ? (
                  <div style={{ marginTop: '30px', padding: '25px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', color: '#854d0e' }}>
                    Received feedback from backend, but formatting is unexpected. Check your developer console!
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* 6. REPORTS & SKILLS */}
        {activeTab === 'reports' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a' }}>Skill Tracking & Reports</h2>
            
            {userRole === 'Administrator' && <p style={{ color: '#334155' }}><strong>Global Analytics:</strong> System-wide debate volume, user retention, and server load.</p>}
            {userRole === 'Debate Coach' && <p style={{ color: '#334155' }}><strong>Team Analytics:</strong> View logic and speaking scores for all assigned learners.</p>}
            
            {(!userRole || userRole === 'Learner') && (
              <>
                {isLoadingHistory ? (
                  <p style={{ color: '#64748b' }}>Loading your performance data...</p>
                ) : totalDebates === 0 ? (
                  <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', marginTop: '20px', border: '2px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>No debate history found. Head to the Debate Room to record your first session!</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#64748b', marginBottom: '20px' }}>Averages based on your last <strong>{totalDebates}</strong> debate turn(s).</p>
                    
                    {/* Real Averages Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '20px' }}>
                      <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4f46e5' }}>{avgLogic}%</div>
                        <div style={{ color: '#64748b', marginTop: '5px' }}>Average Logic</div>
                      </div>
                      <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{avgSpeaking}%</div>
                        <div style={{ color: '#64748b', marginTop: '5px' }}>Clarity & Persuasion</div>
                      </div>
                      <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{avgEvidence}%</div>
                        <div style={{ color: '#64748b', marginTop: '5px' }}>Evidence Strength</div>
                      </div>
                    </div>
                    
                    {/* Recent Sessions Table */}
                    <h3 style={{ marginTop: '40px', color: '#1e293b', fontSize: '18px' }}>Recent Sessions History</h3>
                    <div style={{ overflowX: 'auto', marginTop: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px' }}>Format</th>
                            <th style={{ padding: '12px 16px' }}>Logic</th>
                            <th style={{ padding: '12px 16px' }}>Clarity</th>
                            <th style={{ padding: '12px 16px' }}>Persuasion</th>
                            <th style={{ padding: '12px 16px' }}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: '500' }}>{row.debate_format}</td>
                              <td style={{ padding: '12px 16px', color: '#4f46e5', fontWeight: 'bold' }}>{row.logical_consistency}</td>
                              <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 'bold' }}>{row.clarity}</td>
                              <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 'bold' }}>{row.persuasiveness}</td>
                              <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(row.timestamp).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* --- SCHEDULING MODAL OVERLAY --- */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Schedule a Session</h2>
            
            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Debate Topic</label>
                <select required value={scheduleData.topic} onChange={(e) => setScheduleData({...scheduleData, topic: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="AI Ethics">AI Ethics</option>
                  <option value="Universal Basic Income">Universal Basic Income</option>
                  <option value="Climate Change Policy">Climate Change Policy</option>
                  <option value="Space Exploration Funding">Space Exploration Funding</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Format</label>
                <select required value={scheduleData.format} onChange={(e) => setScheduleData({...scheduleData, format: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  {["One-on-One Debate", "AI Debate Simulation", "Oxford Debate", "Public Forum Debate", "Policy Debate", "Parliamentary Debate"].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Date</label>
                  <input type="date" required value={scheduleData.date} onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Time</label>
                  <input type="time" required value={scheduleData.time} onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- App Component ---
export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);

  const handleLogout = () => {
    setAuthToken(null);
    setUserRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  };

  return (
    <>
      {!authToken ? (
        <AuthForms setAuthToken={setAuthToken} setUserRole={setUserRole} />
      ) : (
        <Dashboard authToken={authToken} userRole={userRole} logout={handleLogout} />
      )}
    </>
  );
}