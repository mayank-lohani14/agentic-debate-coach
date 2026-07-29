import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// --- Map of pages to active sub-agents for UI display ---
const PAGE_AGENT_MAP = {
  'dashboard': ['Recommendation & Coaching Agent', 'Performance Analytics Agent'],
  'profile': ['Orchestrator Agent'],
  'topics': ['Recommendation & Coaching Agent'],
  'sessions': ['Recommendation & Coaching Agent', 'Performance Analytics Agent'],
  'room': ['Argument Analysis Agent', 'Logical Fallacy Detection Agent', 'Counterargument Generation Agent'],
  'reports': ['Performance Analytics Agent', 'Report Generation Agent']
};

// --- Floating Chatbot Component ---
const FloatingChatbot = ({ authToken, userRole = 'Learner', activeTab = 'dashboard' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const activeAgents = PAGE_AGENT_MAP[activeTab] || ['Orchestrator Agent'];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/v1/chat',
        {
          message: userMessage.text,
          current_page: activeTab,
          user_role: userRole,
          session_id: 'global_session'
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const aiMessage = {
        sender: 'ai',
        text: response.data.response,
        active_agents: response.data.active_agents || activeAgents,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chatbot connection error:', error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Unable to connect to the AI Coach Orchestrator. Please check your network or backend server status.',
          active_agents: ['System Alert'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* --- Floating Action Button --- */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.5)',
            cursor: 'pointer',
            fontSize: '26px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🎙️
        </button>
      )}

      {/* --- Floating Expanded Window --- */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '400px',
            height: '620px',
            maxHeight: 'calc(100vh - 48px)',
            background: '#ffffff',
            borderRadius: '18px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            fontFamily: 'sans-serif'
          }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)', padding: '16px 20px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', letterSpacing: '-0.01em' }}>
                  AI Debate Coach
                </h3>
                <span style={{ fontSize: '12px', opacity: 0.9, display: 'inline-block', marginTop: '2px' }}>
                  Context: <strong style={{ textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')}</strong>
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Active Agents Indicator Bar */}
            <div style={{ marginTop: '12px', padding: '8px 10px', background: 'rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '11px', lineHeight: '1.4' }}>
              <div style={{ opacity: 0.8, fontWeight: '600', marginBottom: '2px' }}>⚡ Active Specialized Agents:</div>
              <div style={{ fontWeight: '500', color: '#f1f5f9' }}>
                {activeAgents.join(' • ')}
              </div>
            </div>
          </div>

          {/* Message Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', marginTop: '30px', padding: '0 20px', fontSize: '13px', lineHeight: '1.6' }}>
                👋 Hi! I am your <strong>Agentic AI Debate Assistant</strong>.<br />
                Currently active on your <strong>{activeTab.replace('-', ' ')}</strong> view with specialized agents ready to help.
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    background: msg.sender === 'user' ? '#4f46e5' : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                    border: msg.sender === 'ai' ? '1px solid #e2e8f0' : 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    borderBottomRightRadius: msg.sender === 'user' ? '2px' : '14px',
                    borderBottomLeftRadius: msg.sender === 'ai' ? '2px' : '14px',
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🤖 Orchestrator coordinating agents...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} style={{ display: 'flex', padding: '12px', background: '#ffffff', borderTop: '1px solid #e2e8f0', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask on ${activeTab.replace('-', ' ')}...`}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13.5px' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '0 18px', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

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
      const loginData = new URLSearchParams();
      loginData.append('username', formData.email); 
      loginData.append('password', formData.password);
      
      fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      fetchOptions.body = loginData;
    } else {
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

  // Profile Bio State
  const [userBio, setUserBio] = useState('Passionate about sharpening argumentation skills, logical reasoning, and structured public speaking.');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(userBio);

  // Dynamic Topics State
  const [availableTopics, setAvailableTopics] = useState([
    { title: "AI Ethics and Data Privacy", difficulty: "Intermediate" },
    { title: "Universal Basic Income", difficulty: "Advanced" },
    { title: "Climate Change Policy", difficulty: "Intermediate" },
    { title: "Space Exploration Funding", difficulty: "Advanced" },
    { title: "Cryptocurrency Regulation", difficulty: "Intermediate" },
    { title: "Automation and Job Displacement", difficulty: "Beginner" },
    { title: "Universal Healthcare Systems", difficulty: "Advanced" }
  ]);

  // Add Topic Modal State
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [newTopicForm, setNewTopicForm] = useState({ title: '', difficulty: 'Intermediate' });

  // Sessions State (Dynamic List)
  const [sessionsList, setSessionsList] = useState([
    { id: '#1042', title: 'Climate Change Policy', timing: 'Starts in 2 hours', format: 'One-on-One Debate' }
  ]);

  // Scheduling Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', topic: 'AI Ethics', format: 'One-on-One Debate' });

  // History Tracking State & Logic
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  const totalDebates = historyData.length;
  const avgLogic = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.logical_consistency, 0) / totalDebates) : 0;
  const avgSpeaking = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + (row.clarity + row.persuasiveness) / 2, 0) / totalDebates) : 0;
  const avgEvidence = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.evidence_strength, 0) / totalDebates) : 0;

  // Pie chart calculation logic based on scores
  const totalScoreSum = (avgLogic + avgSpeaking + avgEvidence) || 1;
  const logicDeg = (avgLogic / totalScoreSum) * 360;
  const speakingDeg = logicDeg + (avgSpeaking / totalScoreSum) * 360;

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
    const newSessionId = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const newSession = {
      id: newSessionId,
      title: scheduleData.topic,
      timing: `Scheduled for ${scheduleData.date} at ${scheduleData.time}`,
      format: scheduleData.format
    };

    setSessionsList([newSession, ...sessionsList]);
    setShowScheduleModal(false);
    setActiveTab('sessions');
  };

  const handleAddTopicSubmit = (e) => {
    e.preventDefault();
    if (!newTopicForm.title.trim()) return;

    setAvailableTopics([newTopicForm, ...availableTopics]);
    setNewTopicForm({ title: '', difficulty: 'Intermediate' });
    setShowAddTopicModal(false);
    alert("New topic successfully added to the library!");
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
          {/* Note: Chatbot navigation link removed as it is now a global floating widget */}
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
      <div style={{ flexGrow: 1, padding: '40px', overflowY: 'auto', paddingBottom: '100px' }}>
        
        {/* 1. Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Dashboard</h2>

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
          <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', maxWidth: '800px' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '30px', fontSize: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>My Profile</h2>
            
            <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: '110px', height: '110px', background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: 'white', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}>
                👤
              </div>
              
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '20px' }}>Workspace User</h3>
                  <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 'bold' }}>{userRole || 'Learner'}</span>
                </div>
                
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>Role-based access active • Integrated with AI Debate Coach</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Total Debates</span>
                    <strong style={{ fontSize: '18px', color: '#1e293b' }}>{totalDebates > 0 ? totalDebates : 12} Sessions</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Account Status</span>
                    <strong style={{ fontSize: '18px', color: '#10b981' }}>Active & Verified</strong>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>Bio / Objective</label>
                  {isEditingBio ? (
                    <div>
                      <textarea 
                        value={tempBio} 
                        onChange={(e) => setTempBio(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit', outline: 'none', marginBottom: '10px' }}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setUserBio(tempBio); setIsEditingBio(false); }} style={{ padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setIsEditingBio(false)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.5', fontStyle: 'italic' }}>"{userBio}"</p>
                      <button onClick={() => setIsEditingBio(true)} style={{ padding: '6px 12px', background: 'white', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', marginLeft: '15px' }}>Edit Bio</button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 3. Topic Management */}
        {activeTab === 'topics' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '20px' }}>Topic Library</h2>
            
            {isManager && (
              <div style={{ border: '2px dashed #cbd5e1', padding: '30px', borderRadius: '12px', textAlign: 'center', background: '#f8fafc', marginBottom: '30px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#0f172a' }}>➕ Create New Topic</h4>
                <p style={{ color: '#64748b', marginBottom: '20px' }}>Add new subjects to the database for learners to debate.</p>
                <button 
                  onClick={() => setShowAddTopicModal(true)} 
                  style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                  Add Topic
                </button>
              </div>
            )}

            <div>
              <h3 style={{ fontSize: '16px', color: '#334155', marginBottom: '15px' }}>Available Topics ({availableTopics.length})</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '15px' }}>
                {availableTopics.map((topic, idx) => (
                  <li key={idx} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div>
                      <strong style={{ fontSize: '16px', color: '#0f172a' }}>{topic.title}</strong>
                      <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Difficulty: {topic.difficulty}</div>
                    </div>
                    <button style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}>View Brief</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 4. Debate Sessions */}
        {activeTab === 'sessions' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0, color: '#0f172a' }}>Debate Sessions</h2>
              <button onClick={() => setShowScheduleModal(true)} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ New Session</button>
            </div>
            
            {isManager ? (
              <div>
                <p style={{ color: '#64748b' }}>Monitor live rooms and assign topics to specific learners.</p>
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <h4 style={{ margin: 0, color: '#334155' }}>My Upcoming Sessions</h4>
              {sessionsList.map((session, index) => (
                <div key={index} style={{ padding: '20px', background: '#f8fafc', borderLeft: '4px solid #4f46e5', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <strong style={{ display: 'block', fontSize: '16px', marginBottom: '5px', color: '#0f172a' }}>{session.title}</strong>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Session ID: {session.id} • {session.timing} ({session.format})</span>
                </div>
              ))}
            </div>
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
                
                <textarea value={argumentText} onChange={(e) => setArgumentText(e.target.value)} placeholder="Type your argument here..." style={{ width: '100%', height: '140px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
                
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

                {analysisResult && analysisResult.scores ? (
                  <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px' }}>Argument Breakdown</h3>
                      
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

        {/* 7. REPORTS & SKILLS (With Pie Chart Integration) */}
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
                    <p style={{ color: '#64748b', marginBottom: '25px' }}>Averages based on your last <strong>{totalDebates}</strong> debate turn(s).</p>
                    
                    {/* --- PIE CHART VISUALIZATION SECTION --- */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '40px', flexWrap: 'wrap' }}>
                      
                      {/* Conic Gradient Pie Chart Element */}
                      <div style={{ 
                        width: '180px', 
                        height: '180px', 
                        borderRadius: '50%', 
                        background: `conic-gradient(
                          #4f46e5 0deg ${logicDeg}deg, 
                          #10b981 ${logicDeg}deg ${speakingDeg}deg, 
                          #f59e0b ${speakingDeg}deg 360deg
                        )`,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        position: 'relative'
                      }}>
                        {/* Inner Hole for Donut/Pie look */}
                        <div style={{
                          position: 'absolute',
                          top: '35px',
                          left: '35px',
                          width: '110px',
                          height: '110px',
                          background: 'white',
                          borderRadius: '50%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>OVERALL</span>
                          <span style={{ fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>{Math.round((avgLogic + avgSpeaking + avgEvidence) / 3)}%</span>
                        </div>
                      </div>

                      {/* Legend / Metrics Breakdown */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '16px', height: '16px', background: '#4f46e5', borderRadius: '4px', display: 'inline-block' }}></span>
                          <span style={{ color: '#334155', fontWeight: '500' }}>Average Logic: <strong>{avgLogic}%</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '4px', display: 'inline-block' }}></span>
                          <span style={{ color: '#334155', fontWeight: '500' }}>Clarity & Persuasion: <strong>{avgSpeaking}%</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '16px', height: '16px', background: '#f59e0b', borderRadius: '4px', display: 'inline-block' }}></span>
                          <span style={{ color: '#334155', fontWeight: '500' }}>Evidence Strength: <strong>{avgEvidence}%</strong></span>
                        </div>
                      </div>
                    </div>
                    
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

      {/* --- ADD TOPIC MODAL OVERLAY --- */}
      {showAddTopicModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Add New Debate Topic</h2>
            
            <form onSubmit={handleAddTopicSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Topic Title</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., Quantum Computing Ethics"
                  value={newTopicForm.title} 
                  onChange={(e) => setNewTopicForm({...newTopicForm, title: e.target.value})} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Difficulty Level</label>
                <select 
                  value={newTopicForm.difficulty} 
                  onChange={(e) => setNewTopicForm({...newTopicForm, difficulty: e.target.value})} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={() => setShowAddTopicModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SCHEDULING MODAL OVERLAY --- */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Schedule a Session</h2>
            
            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Debate Topic</label>
                <select required value={scheduleData.topic} onChange={(e) => setScheduleData({...scheduleData, topic: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  {availableTopics.map((t, idx) => (
                    <option key={idx} value={t.title}>{t.title}</option>
                  ))}
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

      {/* --- FLOATING CHATBOT WIDGET --- */}
      <FloatingChatbot authToken={authToken} userRole={userRole} activeTab={activeTab} />
      
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