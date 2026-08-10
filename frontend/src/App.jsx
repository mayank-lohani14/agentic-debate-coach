import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import jsPDF from 'jspdf';

// --- Map of pages to active sub-agents for UI display ---
const PAGE_AGENT_MAP = {
  'dashboard': ['Recommendation & Coaching Agent', 'Performance Analytics Agent'],
  'profile': ['Orchestrator Agent'],
  'topics': ['Recommendation & Coaching Agent'],
  'sessions': ['Recommendation & Coaching Agent', 'Performance Analytics Agent'],
  'room': ['Argument Analysis Agent', 'Logical Fallacy Detection Agent', 'Counterargument Generation Agent', 'Presentation Analysis Agent'],
  'reports': ['Performance Analytics Agent', 'Report Generation Agent'],
  'admin': ['Report Generation Agent', 'Performance Analytics Agent']
};

// --- Mock Data for Educator Features ---
const FALLACY_DATA = [
  { name: 'Ad Hominem', value: 400, color: '#ef4444' },
  { name: 'Slippery Slope', value: 300, color: '#f59e0b' },
  { name: 'Red Herring', value: 300, color: '#3b82f6' },
  { name: 'Straw Man', value: 200, color: '#10b981' },
];

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

  // Function to clean Markdown symbols from the AI's response
  const formatMessage = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Removes ** but keeps the text inside
      .replace(/\*(.*?)\*/g, '$1')     // Removes * but keeps the text inside
      .replace(/#{1,3}\s/g, '')        // Removes #, ##, or ###
      .replace(/---/g, '');            // Removes horizontal rule dashes
  };

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
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 10px 25px rgba(168, 85, 247, 0.4)',
            cursor: 'pointer',
            fontSize: '28px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1) translateY(0)')}
        >
          🎙️
        </button>
      )}

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '400px',
            height: '620px',
            maxHeight: 'calc(100vh - 60px)',
            background: '#131825',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: '1px solid #2a324b',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)', padding: '20px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.01em' }}>
                  AI Debate Coach
                </h3>
                <span style={{ fontSize: '12px', opacity: 0.9, display: 'inline-block', marginTop: '4px' }}>
                  Context: <strong style={{ textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')}</strong>
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ✕
              </button>
            </div>
            <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', fontSize: '12px', lineHeight: '1.4' }}>
              <div style={{ opacity: 0.8, fontWeight: '600', marginBottom: '4px' }}>⚡ Active Specialized Agents:</div>
              <div style={{ fontWeight: '500', color: '#f8fafc' }}>{activeAgents.join(' • ')}</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#0b0f19', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px', padding: '0 20px', fontSize: '14px', lineHeight: '1.6' }}>
                👋 Hi! I am your <strong>Agentic AI Debate Assistant</strong>.<br /><br />
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
                    padding: '14px 18px',
                    borderRadius: '18px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : '#1e293b',
                    color: '#ffffff',
                    border: msg.sender === 'ai' ? '1px solid #2a324b' : 'none',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    borderBottomRightRadius: msg.sender === 'user' ? '4px' : '18px',
                    borderBottomLeftRadius: msg.sender === 'ai' ? '4px' : '18px',
                  }}
                >
                  {formatMessage(msg.text)}
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#1e293b', padding: '12px 18px', borderRadius: '18px', border: '1px solid #2a324b', color: '#cbd5e1', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="animate-pulse">🤖 Orchestrator coordinating agents...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendMessage} style={{ display: 'flex', padding: '16px', background: '#131825', borderTop: '1px solid #2a324b', gap: '12px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask on ${activeTab.replace('-', ' ')}...`}
              style={{ flex: 1, padding: '14px 18px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', fontSize: '14px', background: '#1e293b', color: 'white' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '0 24px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', opacity: loading ? 0.6 : 1, transition: 'transform 0.2s', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ padding: '50px', width: '100%', maxWidth: '440px', background: '#131825', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid #2a324b', textAlign: 'center' }}>
        <h2 style={{ color: '#f8fafc', marginBottom: '12px', fontSize: '28px' }}>{isLogin ? 'Welcome Back 👋' : 'Create an Account'}</h2>
        <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '30px' }}>Sign in to access your debate workspace.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {!isLogin && <input type="text" name="username" placeholder="Full Name" required value={formData.username} onChange={handleChange} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', background: '#1e293b', color: 'white', fontSize: '15px' }} />}
          <input type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={handleChange} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', background: '#1e293b', color: 'white', fontSize: '15px' }} />
          <input type="password" name="password" placeholder="Password" required value={formData.password} onChange={handleChange} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', background: '#1e293b', color: 'white', fontSize: '15px' }} />
          
          {!isLogin && (
            <select name="role" value={formData.role} onChange={handleChange} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', background: '#1e293b', color: 'white', fontSize: '15px' }}>
              <option value="Learner">Learner</option>
              <option value="Educator">Educator</option>
              <option value="Debate Coach">Debate Coach</option>
              <option value="Administrator">Administrator</option>
            </select>
          )}
          
          <button type="submit" style={{ padding: '16px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            {isLogin ? 'Login to Workspace' : 'Register Account'}
          </button>
          <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', fontSize: '14px', marginTop: '10px', fontWeight: '600' }}>
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ authToken, userRole, logout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Topic Management State
  const [topicSearch, setTopicSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('All');
  const [availableTopics, setAvailableTopics] = useState([
    { title: "AI Ethics and Data Privacy", difficulty: "Intermediate", category: "Technology", desc: "Debate the moral implications of artificial intelligence and mass data collection." },
    { title: "Universal Basic Income", difficulty: "Advanced", category: "Economics", desc: "Argue for or against a government-guaranteed baseline income for all citizens." },
    { title: "Climate Change Policy", difficulty: "Intermediate", category: "Environment", desc: "Evaluate the economic vs. environmental trade-offs of aggressive climate action." },
    { title: "Space Exploration Funding", difficulty: "Advanced", category: "Science", desc: "Should public funds be diverted from terrestrial issues to fund space colonization?" },
    { title: "Cryptocurrency Regulation", difficulty: "Intermediate", category: "Finance", desc: "Discuss whether decentralized digital currencies require federal oversight." },
    { title: "Automation and Job Displacement", difficulty: "Beginner", category: "Society", desc: "Analyze the societal impact of replacing human labor with automated systems." },
    { title: "Universal Healthcare Systems", difficulty: "Advanced", category: "Healthcare", desc: "Debate the effectiveness of private vs. universally mandated healthcare." }
  ]);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [newTopicForm, setNewTopicForm] = useState({ title: '', difficulty: 'Intermediate', category: 'General', desc: '' });

  // Admin State
  const [adminUserSearch, setAdminUserSearch] = useState('');
  
  // Profile Toggles State
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);

  // Debate Room State
  const [argumentText, setArgumentText] = useState('');
  const [debateFormat, setDebateFormat] = useState('One-on-One Debate');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [streamingText, setStreamingText] = useState(''); 

  // Audio Recording & Upload State
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // Profile Bio State
  const [userBio, setUserBio] = useState('Passionate about sharpening argumentation skills, logical reasoning, and structured public speaking.');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(userBio);

  // Sessions State
  const [sessionsList, setSessionsList] = useState([
    { id: '#1042', title: 'Climate Change Policy', timing: 'Starts in 2 hours', format: 'One-on-One Debate' }
  ]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', topic: 'AI Ethics', format: 'One-on-One Debate' });

  // History Tracking State & Logic
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Manager Dashboard State & Logic
  const [studentHistories, setStudentHistories] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Admin Dashboard State & Logic
  const [adminData, setAdminData] = useState({ users: [], stats: { total_users: 0, total_debates: 0 } });
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

  // Feedback Modal State & Drilldown State
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, turnId: null, text: '' });
  const [selectedStudentModal, setSelectedStudentModal] = useState(null); // NEW

  // Fetch histories for both reports and manager dashboards
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if ((activeTab === 'sessions' || activeTab === 'dashboard') && (userRole === 'Educator' || userRole === 'Debate Coach')) {
      fetchStudentHistories();
    }
  }, [activeTab, userRole]);

  useEffect(() => {
    if (activeTab === 'admin' && userRole === 'Administrator') {
      fetchAdminData();
    }
  }, [activeTab, userRole]);

  // Dynamically calculate actual student performance heatmap data from backend histories
  const classroomHeatmapData = useMemo(() => {
    const studentMap = {};
    studentHistories.forEach(session => {
      // Safely default undefined metrics to 0
      const clarity = session.clarity || 0;
      const relevance = session.relevance || 0;
      const evidence = session.evidence_strength || 0;
      const logic = session.logical_consistency || 0;
      const persuasion = session.persuasiveness || 0;
      
      const sessionAvg = Math.round((clarity + relevance + evidence + logic + persuasion) / 5);
      const name = session.learner_name || 'Unknown Student';
      
      if (!studentMap[name]) {
        studentMap[name] = [];
      }
      studentMap[name].push({
        score: sessionAvg,
        logic: logic,
        clarity: clarity,
        persuasion: persuasion,
        evidence: evidence, // Saving granular data for the modal radar chart
        timestamp: new Date(session.timestamp).getTime() || 0,
        rawSession: session
      });
    });

    return Object.keys(studentMap).map(name => {
      const sessions = studentMap[name].sort((a, b) => a.timestamp - b.timestamp); // Oldest to newest
      const totalScore = sessions.reduce((sum, s) => sum + s.score, 0);
      const avgScore = Math.round(totalScore / sessions.length);

      let trend = 'up';
      if (sessions.length > 1) {
        const latest = sessions[sessions.length - 1].score;
        const previous = sessions[sessions.length - 2].score;
        trend = latest >= previous ? 'up' : 'down';
      }

      return {
        name: name,
        score: avgScore,
        trend: trend,
        rawSessions: sessions // Attached so drill-down modal can access it
      };
    });
  }, [studentHistories]);

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

  const fetchStudentHistories = async () => {
    setIsLoadingStudents(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/manager/student-histories', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (data.data) setStudentHistories(data.data);
    } catch (error) {
      console.error("Failed to fetch student histories");
    }
    setIsLoadingStudents(false);
  };

  const fetchAdminData = async () => {
    setIsLoadingAdmin(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/admin/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        const upgradedUsers = data.users.map(u => ({
          ...u,
          status: Math.random() > 0.1 ? 'Active' : 'Suspended' // Randomize status for visual feedback
        }));
        setAdminData({ users: upgradedUsers, stats: data.stats });
      }
    } catch (error) {
      console.error("Failed to fetch admin data");
    }
    setIsLoadingAdmin(false);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/manager/feedback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` 
        },
        body: JSON.stringify({ turn_id: feedbackModal.turnId, feedback: feedbackModal.text })
      });
      
      if (response.ok) {
        alert("Feedback successfully submitted!");
        setFeedbackModal({ isOpen: false, turnId: null, text: '' });
        fetchStudentHistories(); 
      } else {
        alert("Error submitting feedback.");
      }
    } catch (err) {
      alert("Failed to connect to the backend.");
    }
  };

  const downloadReport = (session) => {
    const doc = new jsPDF();
    const formattedDate = new Date(session.timestamp).toLocaleDateString();
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text('Debate Session Report', 20, 25);
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); 
    doc.text(`Date: ${formattedDate}`, 20, 35);
    doc.text(`Format: ${session.debate_format}`, 20, 42);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 48, 190, 48);
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('AI Evaluation Scores', 20, 62);
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85); 
    doc.text(`• Logical Consistency: ${session.logical_consistency}/100`, 25, 72);
    doc.text(`• Clarity: ${session.clarity}/100`, 25, 80);
    doc.text(`• Persuasiveness: ${session.persuasiveness}/100`, 25, 88);
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Coach Remarks', 20, 108);
    doc.setFontSize(12);
    doc.setTextColor(4, 120, 87); 
    const feedbackText = session.coach_feedback ? `"${session.coach_feedback}"` : 'Pending review';
    const splitFeedback = doc.splitTextToSize(feedbackText, 160);
    doc.text(splitFeedback, 20, 118);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); 
    doc.text('Generated securely by Agentic AI Debate Coach', 20, 280);
    doc.save(`Debate_Report_${formattedDate.replace(/\//g, '-')}.pdf`);
  };

  const totalDebates = historyData.length;
  const avgLogic = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.logical_consistency, 0) / totalDebates) : 0;
  const avgSpeaking = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + (row.clarity + row.persuasiveness) / 2, 0) / totalDebates) : 0;
  const avgEvidence = totalDebates ? Math.round(historyData.reduce((sum, row) => sum + (row.evidence_strength || 0), 0) / totalDebates) : 0;

  const trendData = [...historyData].reverse().map(session => ({
    date: new Date(session.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: Math.round((session.logical_consistency + session.clarity + session.persuasiveness) / 3) 
  }));

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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioBlob(file);
      setAudioURL(URL.createObjectURL(file));
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioURL(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!argumentText.trim() && !audioBlob) return alert("Please type an argument or record/upload your voice.");
    
    setIsAnalyzing(true);
    setAnalysisResult(null); 
    setStreamingText('');    
    
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
      
      if (!response.body) throw new Error("ReadableStream not supported in this browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6);
              
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              
              try {
                const parsed = JSON.parse(dataStr);
                
                if (parsed.type === 'status') {
                  setStreamingText(prev => prev + `\n[Status: ${parsed.message}]\n`);
                } else if (parsed.type === 'transcript') {
                  setStreamingText(prev => prev + `\n🗣️ Transcript: ${parsed.text}\n\n🤖 AI is formulating a rebuttal:\n`);
                } else if (parsed.type === 'chunk') {
                  setStreamingText(prev => prev + parsed.content);
                } else if (parsed.type === 'final') {
                  setAnalysisResult(parsed.data);
                } else if (parsed.type === 'error') {
                  setStreamingText(prev => prev + `\n❌ Error: ${parsed.message}\n`);
                }
              } catch (e) {
                console.error("Error parsing stream chunk:", e, dataStr);
              }
            }
          }
        }
      }
    } catch (error) { 
      alert("Error connecting to the analysis server."); 
      console.error(error);
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
    setNewTopicForm({ title: '', difficulty: 'Intermediate', category: 'General', desc: '' });
    setShowAddTopicModal(false);
    alert("New topic successfully added to the library!");
  };

  const filteredTopics = availableTopics.filter(t => 
    (topicFilter === 'All' || t.difficulty === topicFilter) &&
    t.title.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const filteredAdmins = adminData.users.filter(u => 
    u.username.toLowerCase().includes(adminUserSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(adminUserSearch.toLowerCase())
  );

  const navButtonStyle = (tabName) => ({
    display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '14px 18px', marginBottom: '8px',
    textAlign: 'left', background: activeTab === tabName ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%)' : 'transparent',
    color: activeTab === tabName ? '#a855f7' : '#94a3b8',
    border: 'none', borderLeft: activeTab === tabName ? '4px solid #a855f7' : '4px solid transparent',
    borderRadius: '0 8px 8px 0', cursor: 'pointer', fontWeight: '600', fontSize: '15px',
    transition: 'all 0.2s ease-in-out'
  });

  const isManager = userRole === 'Administrator' || userRole === 'Debate Coach' || userRole === 'Educator';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#09090b', fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- SIDEBAR NAVIGATION --- */}
      <div style={{ width: '280px', background: '#131825', padding: '30px 0', borderRight: '1px solid #2a324b', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#ffffff', marginTop: 0, marginBottom: '40px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px' }}>
          <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Debate AI</span>
        </h2>
        
        <div style={{ flexGrow: 1, paddingRight: '20px' }}>
          <button onClick={() => setActiveTab('dashboard')} style={navButtonStyle('dashboard')}>🏠 Overview</button>
          <button onClick={() => setActiveTab('profile')} style={navButtonStyle('profile')}>👤 Profile</button>
          <button onClick={() => setActiveTab('topics')} style={navButtonStyle('topics')}>📚 Topics</button>
          <button onClick={() => setActiveTab('sessions')} style={navButtonStyle('sessions')}>📅 Sessions</button>
          <button onClick={() => setActiveTab('room')} style={navButtonStyle('room')}>🎙️ Debate Room</button>
          <button onClick={() => setActiveTab('reports')} style={navButtonStyle('reports')}>📊 Skills & Reports</button>
          
          {userRole === 'Administrator' && (
            <button onClick={() => setActiveTab('admin')} style={navButtonStyle('admin')}>⚙️ System Admin</button>
          )}
        </div>

        <div style={{ borderTop: '1px solid #2a324b', paddingTop: '24px', margin: '0 24px' }}>
          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #334155' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {userRole?.charAt(0) || 'L'}
            </div>
            <div>
              <p style={{ margin: '0', fontSize: '12px', color: '#94a3b8' }}>Logged in as</p>
              <strong style={{ color: '#f8fafc', fontSize: '14px' }}>{userRole || 'Learner'}</strong>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#ef4444', border: '1px solid #7f1d1d', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', ':hover': { background: '#7f1d1d' } }}>Logout</button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div style={{ flexGrow: 1, padding: '50px 60px', overflowY: 'auto', paddingBottom: '100px', color: '#f8fafc' }}>
        
        {/* 1. Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div>
            {(!userRole || userRole === 'Learner') && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: '#ffffff', fontSize: '32px', fontWeight: '700' }}>Dashboard</h2>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px 16px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔥 <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>5 Day Streak</span>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '8px 16px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏆 <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>Fallacy Slayer Badge</span>
                  </div>
                </div>
              </div>
            )}
            
            {userRole && userRole !== 'Learner' && (
              <h2 style={{ marginTop: 0, marginBottom: '30px', color: '#ffffff', fontSize: '32px', fontWeight: '700' }}>Dashboard</h2>
            )}

            {(!userRole || userRole === 'Learner') && (
              <div style={{ background: 'url("https://www.transparenttextures.com/patterns/cubes.png"), linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)', borderRadius: '24px', padding: '40px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.4)' }}>
                <div>
                  <h2 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '28px', fontWeight: '800' }}>Ready to test your skills? 🎤</h2>
                  <p style={{ margin: 0, color: '#e0e7ff', maxWidth: '600px', lineHeight: '1.6', fontSize: '16px' }}>
                    Put your knowledge into practice. Schedule a live debate session with a peer or an AI mentor to refine your arguments and track your progress.
                  </p>
                </div>
                <button 
                  onClick={() => setShowScheduleModal(true)} 
                  style={{ padding: '16px 32px', background: '#ffffff', color: '#4f46e5', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', fontSize: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Schedule Session
                </button>
              </div>
            )}

            {userRole === 'Educator' && (
              <div style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderRadius: '24px', padding: '40px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.4)' }}>
                <div>
                  <h2 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '28px', fontWeight: '800' }}>Welcome to your Classroom 📚</h2>
                  <p style={{ margin: 0, color: '#d1fae5', maxWidth: '600px', lineHeight: '1.6', fontSize: '16px' }}>
                    Manage your students, review AI-generated debate transcripts, and track class-wide logical fallacy trends.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('sessions')} 
                  style={{ padding: '16px 32px', background: '#ffffff', color: '#059669', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', fontSize: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}
                >
                  Manage Classes
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '30px' }}>
              <div style={{ background: '#131825', padding: '30px', borderRadius: '24px', border: '1px solid #2a324b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                {userRole === 'Administrator' && <div style={{ color: '#fca5a5' }}><strong>Admin Alerts:</strong> 3 new user registrations pending review.</div>}
                
                {userRole === 'Debate Coach' && (
                  <>
                     <h3 style={{ marginTop: 0, color: '#ffffff', marginBottom: '20px', fontSize: '18px' }}>Action Required: Pending Feedback</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ padding: '16px', background: '#1e293b', borderRadius: '12px', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><strong style={{ color: '#f8fafc', display: 'block' }}>Student: Rahul S.</strong><span style={{fontSize:'13px', color:'#94a3b8'}}>Topic: AI Regulation</span></div>
                            <button onClick={() => setActiveTab('sessions')} style={{ padding: '8px 16px', background: '#0b0f19', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Review</button>
                        </div>
                        <div style={{ padding: '16px', background: '#1e293b', borderRadius: '12px', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><strong style={{ color: '#f8fafc', display: 'block' }}>Student: Priya P.</strong><span style={{fontSize:'13px', color:'#94a3b8'}}>Topic: Universal Basic Income</span></div>
                            <button onClick={() => setActiveTab('sessions')} style={{ padding: '8px 16px', background: '#0b0f19', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Review</button>
                        </div>
                     </div>
                  </>
                )}
                
                {userRole === 'Educator' && (
                  <>
                    <h3 style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Activity</h3>
                    <div style={{ color: '#a7f3d0', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '18px', borderRadius: '12px', fontWeight: '500' }}>
                      📝 12 students completed the "AI Ethics" assignment.
                    </div>
                    <h3 style={{ margin: '24px 0 16px 0', color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Actions</h3>
                    <div style={{ padding: '16px', background: '#1e293b', borderRadius: '12px', borderLeft: '4px solid #f87171' }}>
                       <strong style={{ color: '#f8fafc', display: 'block' }}>Grade Mid-Term Debates</strong>
                       <span style={{fontSize:'13px', color:'#94a3b8'}}>3 submissions await final rubric grading.</span>
                    </div>
                  </>
                )}

                {(!userRole || userRole === 'Learner') && (
                  <>
                    <h3 style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Next Up</h3>
                    <div style={{ color: '#a7f3d0', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '18px', borderRadius: '12px', fontWeight: '500' }}>
                      📅 Oxford Debate: "Universal Basic Income" tomorrow at 2:00 PM.
                    </div>
                  </>
                )}
              </div>

              {userRole === 'Educator' && (
                <div style={{ background: '#131825', padding: '30px', borderRadius: '24px', border: '1px solid #2a324b' }}>
                  <h3 style={{ marginTop: 0, color: '#ffffff', marginBottom: '20px', fontSize: '18px' }}>Student Performance Heatmap</h3>
                  {classroomHeatmapData.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                      {classroomHeatmapData.map((student, i) => (
                        <div key={i} onClick={() => setSelectedStudentModal(student)} style={{ padding: '16px', borderRadius: '12px', background: student.score < 65 ? 'rgba(239,68,68,0.1)' : student.score > 85 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${student.score < 65 ? 'rgba(239,68,68,0.3)' : student.score > 85 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                          <strong style={{ display: 'block', color: '#f8fafc', fontSize: '15px' }}>{student.name}</strong>
                          <span style={{ fontSize: '24px', fontWeight: 'bold', color: student.score < 65 ? '#f87171' : student.score > 85 ? '#34d399' : '#fbbf24' }}>{student.score}</span>
                          <span style={{ display: 'block', fontSize: '12px', marginTop: '4px', color: '#94a3b8' }}>{student.trend === 'up' ? '📈 Improving' : '📉 Needs help'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '2px dashed #334155', color: '#94a3b8' }}>
                      No student debates found yet. Heatmap will generate automatically once sessions are completed.
                    </div>
                  )}
                </div>
              )}
            </div>

            {userRole === 'Educator' && (
              <div style={{ background: '#131825', padding: '30px', borderRadius: '24px', border: '1px solid #2a324b' }}>
                <h3 style={{ marginTop: 0, color: '#ffffff', marginBottom: '20px', fontSize: '18px' }}>Class-Wide Fallacy Trends</h3>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={FALLACY_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {FALLACY_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 2. UPGRADED USER PROFILE */}
        {activeTab === 'profile' && (
          <div>
            <h2 style={{ marginTop: 0, color: '#ffffff', marginBottom: '30px', fontSize: '32px', fontWeight: '700' }}>My Profile</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              
              {/* Profile Identity Card */}
              <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', border: '1px solid #2a324b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '30px' }}>
                  <div style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px', color: 'white', boxShadow: '0 15px 30px -5px rgba(168, 85, 247, 0.4)' }}>
                    👤
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: '#ffffff', fontSize: '24px', marginBottom: '8px' }}>Workspace User</h3>
                    <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '6px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{userRole || 'Learner'}</span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '30px', background: '#0b0f19', padding: '24px', borderRadius: '16px', border: '1px solid #2a324b' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>Total Debates</span>
                    <strong style={{ fontSize: '22px', color: '#f8fafc' }}>{totalDebates > 0 ? totalDebates : 12}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>Account Status</span>
                    <strong style={{ fontSize: '22px', color: '#34d399' }}>Active</strong>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: '#cbd5e1', marginBottom: '12px' }}>Bio / Objective</label>
                  {isEditingBio ? (
                    <div>
                      <textarea 
                        value={tempBio} 
                        onChange={(e) => setTempBio(e.target.value)}
                        style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #4f46e5', background: '#1e293b', color: 'white', minHeight: '100px', fontFamily: 'inherit', outline: 'none', marginBottom: '12px', fontSize: '15px' }}
                      />
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => { setUserBio(tempBio); setIsEditingBio(false); }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
                        <button onClick={() => setIsEditingBio(false)} style={{ padding: '10px 20px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #2a324b' }}>
                      <p style={{ margin: 0, color: '#cbd5e1', fontSize: '15px', lineHeight: '1.6', fontStyle: 'italic' }}>"{userBio}"</p>
                      <button onClick={() => setIsEditingBio(true)} style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', marginLeft: '20px' }}>Edit Bio</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferences Card */}
              <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', border: '1px solid #2a324b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 24px 0', color: '#ffffff', fontSize: '20px' }}>Account Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#f8fafc', marginBottom: '4px', fontSize: '15px' }}>Email Notifications</strong>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Receive alerts for new feedback.</span>
                    </div>
                    <button onClick={() => setEmailNotifs(!emailNotifs)} style={{ width: '48px', height: '24px', background: emailNotifs ? '#10b981' : '#475569', borderRadius: '999px', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}>
                      <div style={{ position: 'absolute', top: '2px', left: emailNotifs ? '26px' : '2px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.3s' }} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#f8fafc', marginBottom: '4px', fontSize: '15px' }}>Weekly Analytics Report</strong>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Automatically export skills PDF.</span>
                    </div>
                    <button onClick={() => setWeeklyReports(!weeklyReports)} style={{ width: '48px', height: '24px', background: weeklyReports ? '#10b981' : '#475569', borderRadius: '999px', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}>
                      <div style={{ position: 'absolute', top: '2px', left: weeklyReports ? '26px' : '2px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.3s' }} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#f8fafc', marginBottom: '4px', fontSize: '15px' }}>Public Profile Visibility</strong>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Allow peers to view your debate stats.</span>
                    </div>
                    <button onClick={() => setPublicProfile(!publicProfile)} style={{ width: '48px', height: '24px', background: publicProfile ? '#10b981' : '#475569', borderRadius: '999px', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}>
                      <div style={{ position: 'absolute', top: '2px', left: publicProfile ? '26px' : '2px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.3s' }} />
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. UPGRADED TOPIC MANAGEMENT */}
        {activeTab === 'topics' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
               <h2 style={{ margin: 0, color: '#ffffff', fontSize: '32px', fontWeight: '700' }}>Topic Library</h2>
               {isManager && (
                 <button onClick={() => setShowAddTopicModal(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)', fontSize: '15px' }}>
                    ➕ Create Topic
                 </button>
               )}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
               <input 
                 type="text" 
                 placeholder="Search topics by title..." 
                 value={topicSearch}
                 onChange={(e) => setTopicSearch(e.target.value)}
                 style={{ flex: 1, padding: '16px 20px', background: '#131825', border: '1px solid #2a324b', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none' }}
               />
               <select 
                 value={topicFilter} 
                 onChange={(e) => setTopicFilter(e.target.value)}
                 style={{ width: '200px', padding: '16px 20px', background: '#131825', border: '1px solid #2a324b', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none' }}
               >
                 <option value="All">All Difficulties</option>
                 <option value="Beginner">Beginner</option>
                 <option value="Intermediate">Intermediate</option>
                 <option value="Advanced">Advanced</option>
               </select>
            </div>

            {filteredTopics.length === 0 ? (
               <div style={{ padding: '60px', textAlign: 'center', background: '#131825', borderRadius: '24px', border: '2px dashed #2a324b' }}>
                  <p style={{ color: '#94a3b8', fontSize: '16px' }}>No topics match your search criteria.</p>
               </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {filteredTopics.map((topic, idx) => (
                  <div key={idx} style={{ background: '#131825', padding: '30px', border: '1px solid #2a324b', borderRadius: '24px', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, borderColor 0.2s' }} onMouseOver={(e) => {e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#6366f1'}} onMouseOut={(e) => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#2a324b'}}>
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ display: 'inline-block', padding: '4px 12px', background: '#1e293b', color: '#94a3b8', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{topic.category || 'General'}</span>
                      <strong style={{ fontSize: '20px', color: '#ffffff', display: 'block', lineHeight: '1.4' }}>{topic.title}</strong>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', flex: 1 }}>{topic.desc || 'A curated topic designed to test your logical reasoning and persuasive delivery.'}</p>
                    <div style={{ borderTop: '1px solid #2a324b', margin: '20px 0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#cbd5e1', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: topic.difficulty === 'Advanced' ? '#ef4444' : topic.difficulty === 'Intermediate' ? '#f59e0b' : '#10b981' }}></span>
                        {topic.difficulty}
                      </div>
                      <button onClick={() => setActiveTab('room')} style={{ padding: '10px 20px', background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff' }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.color = '#a5b4fc' }}>Debate This</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Debate Sessions / Manager Dashboard */}
        {activeTab === 'sessions' && (
          <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', border: '1px solid #2a324b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0, color: '#ffffff', fontSize: '28px' }}>{isManager ? 'Classroom Activity' : 'Debate Sessions'}</h2>
              {!isManager && (
                <button onClick={() => setShowScheduleModal(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 10px rgba(99,102,241,0.3)' }}>+ New Session</button>
              )}
            </div>
            
            {isManager ? (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '16px' }}>Review AI-generated debate transcripts and monitor student performance.</p>
                {isLoadingStudents ? (
                  <p style={{ color: '#818cf8', fontWeight: 'bold', fontSize: '16px' }}>🔄 Loading student sessions...</p>
                ) : studentHistories.length === 0 ? (
                  <div style={{ padding: '40px', background: '#1e293b', borderRadius: '16px', textAlign: 'center', border: '2px dashed #334155' }}>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '16px' }}>No student debates found yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {studentHistories.map((session, idx) => {
                      const avgScore = Math.round((session.clarity + session.relevance + session.evidence_strength + session.logical_consistency + session.persuasiveness) / 5);
                      return (
                        <div key={idx} style={{ padding: '30px', background: '#1e293b', borderLeft: '4px solid #10b981', borderRadius: '16px', borderTop: '1px solid #2a324b', borderRight: '1px solid #2a324b', borderBottom: '1px solid #2a324b' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ display: 'block', fontSize: '20px', color: '#ffffff' }}>{session.learner_name}</strong>
                              <span style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px', display: 'block' }}>{session.learner_email} • {session.debate_format} • {new Date(session.timestamp).toLocaleDateString()}</span>
                            </div>
                            <span style={{ background: avgScore > 75 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: avgScore > 75 ? '#34d399' : '#fbbf24', border: `1px solid ${avgScore > 75 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 'bold' }}>
                              Avg AI Score: {avgScore}/100
                            </span>
                          </div>
                          <div style={{ marginTop: '20px' }}>
                            <strong style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Student Argument:</strong>
                            <p style={{ marginTop: '8px', color: '#e2e8f0', fontSize: '15px', fontStyle: 'italic', background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #2a324b', lineHeight: '1.6' }}>
                              "{session.user_transcript}"
                            </p>
                          </div>

                          {session.coach_feedback && (
                            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '12px', marginTop: '16px', borderLeft: '4px solid #818cf8' }}>
                              <strong style={{ color: '#a5b4fc' }}>Coach Feedback:</strong> <span style={{ color: '#e0e7ff' }}>{session.coach_feedback}</span>
                            </div>
                          )}

                          {(userRole === 'Debate Coach' || userRole === 'Educator') && (
                            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                              <button 
                                onClick={() => setFeedbackModal({ isOpen: true, turnId: session.id, text: session.coach_feedback || '' })}
                                style={{ padding: '12px 24px', background: '#312e81', color: '#e0e7ff', border: '1px solid #4338ca', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#4338ca'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#312e81'}
                              >
                                ✍️ {session.coach_feedback ? 'Edit Feedback' : 'Add Coach Feedback'}
                              </button>
                              
                              <button onClick={() => {
                                const studentData = classroomHeatmapData.find(s => s.name === session.learner_name) || { 
                                  name: session.learner_name, 
                                  score: avgScore, 
                                  trend: 'up', 
                                  rawSessions: [session] 
                                };
                                setSelectedStudentModal(studentData);
                              }} style={{ padding: '12px 24px', background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; e.currentTarget.style.color = '#fff' }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.color = '#a5b4fc' }}>
                                📊 View Student Report
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
                <h4 style={{ margin: '0', color: '#cbd5e1', fontSize: '18px' }}>My Upcoming Sessions</h4>
                {sessionsList.map((session, index) => (
                  <div key={index} style={{ padding: '24px', background: '#1e293b', borderLeft: '4px solid #a855f7', borderRadius: '16px', borderTop: '1px solid #2a324b', borderRight: '1px solid #2a324b', borderBottom: '1px solid #2a324b' }}>
                    <strong style={{ display: 'block', fontSize: '18px', marginBottom: '8px', color: '#ffffff' }}>{session.title}</strong>
                    <span style={{ color: '#94a3b8', fontSize: '15px' }}>Session ID: {session.id} • {session.timing} ({session.format})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 5. DEBATE ROOM WITH AUDIO & MILESTONE 4 PRESENTATION ANALYTICS RESTORED */}
        {activeTab === 'room' && (
          <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', border: '1px solid #2a324b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: '#ffffff', marginBottom: '30px', fontSize: '28px' }}>
              Live Debate Room
              {isManager && <span style={{fontSize: '14px', background: '#f59e0b', color: '#fff', padding: '6px 12px', borderRadius: '999px', marginLeft: '16px', verticalAlign: 'middle'}}>Sandbox Mode</span>}
            </h2>
            
            {isManager && (
              <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '24px' }}>
                <strong>Test Drive Active:</strong> You are testing the Debate Room. Your metrics here will not affect any classroom or personal analytics.
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#cbd5e1', fontSize: '15px' }}>Select Debate Format</label>
              <select value={debateFormat} onChange={(e) => setDebateFormat(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', background: '#0b0f19', color: 'white', fontSize: '15px' }}>
                {["One-on-One Debate", "AI Debate Simulation", "Oxford Debate", "Public Forum Debate", "Policy Debate", "Parliamentary Debate"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            
            <textarea value={argumentText} onChange={(e) => setArgumentText(e.target.value)} placeholder="Type your argument here..." style={{ width: '100%', height: '160px', padding: '20px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '20px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', background: '#0b0f19', color: 'white', fontSize: '15px', lineHeight: '1.6' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #2a324b', marginBottom: '24px' }}>
              <button 
                onClick={isRecording ? stopRecording : startRecording} 
                style={{ 
                  padding: '14px 28px', 
                  background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                  color: isRecording ? '#f87171' : '#34d399', 
                  border: `1px solid ${isRecording ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, 
                  borderRadius: '12px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '15px',
                  transition: 'all 0.2s'
                }}>
                {isRecording ? "🛑 Stop Recording" : "🎤 Record Argument"}
              </button>

              <input 
                type="file" 
                accept="audio/*" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
              <button 
                onClick={() => fileInputRef.current.click()} 
                style={{ 
                  padding: '14px 28px', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: '#60a5fa', 
                  border: '1px solid rgba(59, 130, 246, 0.3)', 
                  borderRadius: '12px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  fontSize: '15px', 
                  transition: 'all 0.2s' 
                }}>
                📂 Upload Audio
              </button>
              
              {isRecording && <span style={{ color: '#f87171', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>Recording in progress...</span>}
              
              {audioURL && !isRecording && (
                <>
                  <audio src={audioURL} controls style={{ height: '44px', flexGrow: 1, borderRadius: '12px', background: '#0b0f19' }} />
                  <button 
                    onClick={clearAudio} 
                    style={{ 
                      padding: '10px 14px', 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      color: '#f87171', 
                      border: '1px solid rgba(239, 68, 68, 0.3)', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontSize: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}>
                    🗑️
                  </button>
                </>
              )}
            </div>

            <button onClick={handleAnalyze} disabled={isAnalyzing} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', cursor: isAnalyzing ? 'not-allowed' : 'pointer', opacity: isAnalyzing ? 0.7 : 1, transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(168, 85, 247, 0.3)' }}>
              {isAnalyzing ? "Analyzing Argument..." : "Get AI Feedback ✨"}
            </button>

            {(isAnalyzing || (streamingText && !analysisResult)) && (
              <div style={{ marginTop: '40px', padding: '30px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <h3 style={{ marginTop: 0, color: '#f8fafc', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span className="animate-spin" style={{ fontSize: '20px' }}>🔄</span> AI is analyzing your logic...
                </h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#cbd5e1', lineHeight: '1.8', margin: 0, fontSize: '15px' }}>
                  {streamingText}
                </pre>
              </div>
            )}

            {analysisResult && analysisResult.counter_argument ? (
              <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {analysisResult.user_transcript && (
                  <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', borderLeft: '4px solid #34d399', borderTop: '1px solid #2a324b', borderRight: '1px solid #2a324b', borderBottom: '1px solid #2a324b' }}>
                    <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '10px', fontSize: '16px' }}>🗣️ What the AI Heard:</strong>
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.6', fontSize: '15px' }}>"{analysisResult.user_transcript}"</span>
                  </div>
                )}

                {/* --- RESTORED: MILESTONE 4 PRESENTATION ANALYTICS CARD --- */}
                {analysisResult.presentation_analytics && (
                  <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' }}>
                    <h3 style={{ marginTop: 0, color: '#38bdf8', fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      🎙️ Presentation & Voice Analytics
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '12px', border: '1px solid #2a324b' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Speech Pace</span>
                        <strong style={{ display: 'block', color: '#f8fafc', fontSize: '18px', marginTop: '4px' }}>{analysisResult.presentation_analytics.speech_pace}</strong>
                      </div>
                      <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '12px', border: '1px solid #2a324b' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Vocal Confidence</span>
                        <strong style={{ display: 'block', color: '#34d399', fontSize: '18px', marginTop: '4px' }}>{analysisResult.presentation_analytics.confidence_score}/100</strong>
                      </div>
                      <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '12px', border: '1px solid #2a324b' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Filler Words Detected</span>
                        <strong style={{ display: 'block', color: '#fbbf24', fontSize: '18px', marginTop: '4px' }}>{analysisResult.presentation_analytics.filler_words_count}</strong>
                      </div>
                    </div>
                    <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '12px', border: '1px solid #2a324b' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Prosody & Tone Analysis</span>
                      <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px', fontStyle: 'italic' }}>"{analysisResult.presentation_analytics.prosody_analysis}"</p>
                    </div>
                  </div>
                )}

                <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' }}>
                  <h3 style={{ marginTop: 0, color: '#ffffff', fontSize: '20px', marginBottom: '24px' }}>Evaluation Scores</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                    {[
                      { label: "Argument Quality", value: analysisResult.argument_quality_score, color: '#6366f1' },
                      { label: "Evidence Usage", value: analysisResult.evidence_usage_score, color: '#8b5cf6' },
                      { label: "Logical Consistency", value: analysisResult.logical_consistency_score, color: '#10b981' },
                      { label: "Rebuttal Effectiveness", value: analysisResult.rebuttal_effectiveness_score, color: '#f59e0b' },
                      { label: "Communication Skills", value: analysisResult.communication_skills_score, color: '#06b6d4' }
                    ].map((metric, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#cbd5e1', width: '45%', fontSize: '15px', fontWeight: '500' }}>{metric.label}</span>
                        <div style={{ flex: 1, margin: '0 20px', background: '#0b0f19', borderRadius: '999px', height: '12px', border: '1px solid #334155' }}>
                          <div style={{ background: metric.color, height: '100%', borderRadius: '999px', width: `${metric.value || 0}%`, transition: 'width 1s ease-in-out', boxShadow: `0 0 10px ${metric.color}80` }}></div>
                        </div>
                        <span style={{ fontWeight: 'bold', color: '#f8fafc', width: '50px', textAlign: 'right', fontSize: '15px' }}>{metric.value || 0}/100</span>
                      </div>
                    ))}
                  </div>
                </div>

                {analysisResult.fallacies_detected?.length > 0 && analysisResult.fallacies_detected.some(f => f.fallacy_detected) && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h3 style={{ marginTop: 0, color: '#f87171', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                      🚨 Logical Fallacies Detected
                    </h3>
                    {analysisResult.fallacies_detected.map((fallacy, idx) => fallacy.fallacy_detected ? (
                      <div key={idx} style={{ marginBottom: '20px', background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #2a324b' }}>
                        <h4 style={{ color: '#fca5a5', margin: '0 0 10px 0', fontSize: '16px' }}>{fallacy.fallacy_type}</h4>
                        <blockquote style={{ fontStyle: 'italic', borderLeft: '4px solid #f87171', margin: '12px 0', color: '#fecaca', background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '0 8px 8px 0', fontSize: '15px' }}>
                          "{fallacy.offending_text}"
                        </blockquote>
                        <p style={{ margin: '8px 0', color: '#cbd5e1', fontSize: '15px', lineHeight: '1.5' }}><strong style={{ color: '#94a3b8' }}>Why:</strong> {fallacy.explanation}</p>
                        <p style={{ margin: '8px 0', color: '#34d399', fontSize: '15px', lineHeight: '1.5' }}><strong style={{ color: '#10b981' }}>Fix:</strong> {fallacy.counter_strategy}</p>
                      </div>
                    ) : null)}
                  </div>
                )}

                {analysisResult.actionable_feedback?.length > 0 && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                      💡 Actionable Feedback
                    </h3>
                    {analysisResult.actionable_feedback.map((item, idx) => (
                      <div key={idx} style={{ marginBottom: '20px', background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #2a324b' }}>
                        <p style={{ margin: '0 0 12px 0', color: '#e2e8f0', fontSize: '15px', lineHeight: '1.5' }}><strong style={{ color: '#fcd34d' }}>Critique:</strong> {item.critique}</p>
                        <blockquote style={{ fontStyle: 'italic', borderLeft: '4px solid #fbbf24', margin: '0', color: '#fde68a', background: 'rgba(245, 158, 11, 0.1)', padding: '12px 16px', borderRadius: '0 8px 8px 0', fontSize: '15px' }}>
                          <strong>Try this instead:</strong> {item.rewrite_recommendation}
                        </blockquote>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '30px', borderRadius: '16px', borderLeft: '4px solid #6366f1', borderTop: '1px solid rgba(99, 102, 241, 0.2)', borderRight: '1px solid rgba(99, 102, 241, 0.2)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#a5b4fc', fontSize: '20px' }}>AI Coach Rebuttal</h3>
                    <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe', padding: '6px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 'bold' }}>
                      {analysisResult.counter_argument.rebuttal_type} Type
                    </span>
                  </div>
                  <p style={{ margin: '0 0 20px 0', color: '#e0e7ff', lineHeight: '1.8', fontSize: '16px' }}>{analysisResult.counter_argument.rebuttal_text}</p>
                  <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #312e81' }}>
                    <strong style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>🤔 Challenge Question:</strong>
                    <p style={{ margin: '10px 0 0 0', color: '#cbd5e1', fontStyle: 'italic', fontSize: '15px' }}>{analysisResult.counter_argument.challenge_question}</p>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        )}

        {/* 7. REPORTS & SKILLS */}
        {activeTab === 'reports' && (
          <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', border: '1px solid #2a324b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: '#ffffff', fontSize: '28px', marginBottom: '10px' }}>Skill Tracking & Reports</h2>
            
            {userRole === 'Administrator' && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '20px' }}><strong>Global Analytics:</strong> System-wide debate volume, user retention, and server load.</p>
                <div style={{ padding: '40px', background: '#1e293b', borderRadius: '16px', textAlign: 'center', border: '2px dashed #334155' }}>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '16px' }}>Go to <strong>System Admin</strong> tab for detailed Token and Telemetry reports.</p>
                </div>
              </div>
            )}
            
            {(userRole === 'Debate Coach' || userRole === 'Educator') && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '30px' }}><strong>Team Analytics:</strong> Select a student below to drill down into their individual logic and speaking scores.</p>
                {classroomHeatmapData.length === 0 ? (
                  <p style={{ color: '#818cf8', fontSize: '15px' }}>No student data available yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {classroomHeatmapData.map((student, i) => (
                      <div key={i} onClick={() => setSelectedStudentModal(student)} style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <strong style={{ display: 'block', color: 'white', fontSize: '18px', marginBottom: '8px' }}>{student.name}</strong>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '14px' }}>
                          <span>Avg Score: <strong style={{ color: student.score < 65 ? '#f87171' : student.score > 85 ? '#34d399' : '#fbbf24' }}>{student.score}</strong></span>
                          <span>Trend: {student.trend === 'up' ? '📈' : '📉'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {(!userRole || userRole === 'Learner') && (
              <>
                {isLoadingHistory ? (
                  <p style={{ color: '#818cf8', fontSize: '16px', marginTop: '20px' }}>Loading your performance data...</p>
                ) : totalDebates === 0 ? (
                  <div style={{ padding: '40px', background: '#1e293b', borderRadius: '16px', textAlign: 'center', marginTop: '30px', border: '2px dashed #334155' }}>
                    <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>No debate history found. Head to the Debate Room to record your first session!</p>
                  </div>
                ) : (
                  <div style={{ marginTop: '30px' }}>
                    <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '15px' }}>Averages based on your last <strong style={{ color: '#f8fafc' }}>{totalDebates}</strong> debate turn(s).</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                      {/* --- PERFORMANCE TRENDS LINE CHART --- */}
                      <div style={{ background: '#0b0f19', padding: '30px', borderRadius: '20px', border: '1px solid #2a324b' }}>
                        <h3 style={{ marginTop: 0, color: '#ffffff', fontSize: '18px', marginBottom: '24px', fontWeight: '600' }}>
                          Performance Trends (Last {historyData.length} Sessions)
                        </h3>
                        <div style={{ width: '100%', height: '300px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#2a324b" />
                              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                              <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                              <Tooltip contentStyle={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', color: '#fff' }} itemStyle={{ color: '#a855f7', fontWeight: 'bold' }} />
                              <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* --- RADAR CHART VISUALIZATION SECTION --- */}
                      <div style={{ background: '#0b0f19', padding: '30px', borderRadius: '20px', border: '1px solid #2a324b' }}>
                        <h3 style={{ marginTop: 0, textAlign: 'center', color: '#ffffff', fontSize: '18px', marginBottom: '24px', fontWeight: '600' }}>
                          Skill Breakdown Overview
                        </h3>
                        <div style={{ width: '100%', height: '300px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart 
                              cx="50%" 
                              cy="50%" 
                              outerRadius="70%" 
                              data={[
                                { subject: 'Argument Quality', score: totalDebates ? Math.round(historyData.reduce((sum, row) => sum + (row.relevance || row.logical_consistency), 0) / totalDebates) : 0, fullMark: 100 },
                                { subject: 'Evidence Usage', score: avgEvidence, fullMark: 100 },
                                { subject: 'Logical Consistency', score: avgLogic, fullMark: 100 },
                                { subject: 'Rebuttal Skill', score: totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.persuasiveness, 0) / totalDebates) : 0, fullMark: 100 },
                                { subject: 'Communication', score: totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.clarity, 0) / totalDebates) : 0, fullMark: 100 }
                              ]}
                            >
                              <PolarGrid stroke="#334155" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                              <Radar name="My Skills" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="url(#colorUv)" fillOpacity={0.6} />
                              <defs>
                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <Tooltip 
                                contentStyle={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', color: '#fff' }}
                                itemStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    
                    <h3 style={{ marginTop: '40px', color: '#ffffff', fontSize: '20px', marginBottom: '20px' }}>Recent Sessions History</h3>
                    <div style={{ overflowX: 'auto', border: '1px solid #2a324b', borderRadius: '16px', background: '#0b0f19' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: '#1e293b', color: '#cbd5e1', borderBottom: '1px solid #334155' }}>
                            <th style={{ padding: '16px 20px', fontWeight: '600' }}>Format</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600' }}>Logic</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600' }}>Clarity</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600' }}>Persuasion</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600' }}>Date</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600' }}>Coach Remarks</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #2a324b', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#131825'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '16px 20px', color: '#f8fafc', fontWeight: '500' }}>{row.debate_format}</td>
                              <td style={{ padding: '16px 20px', color: '#818cf8', fontWeight: 'bold' }}>{row.logical_consistency}</td>
                              <td style={{ padding: '16px 20px', color: '#34d399', fontWeight: 'bold' }}>{row.clarity}</td>
                              <td style={{ padding: '16px 20px', color: '#fbbf24', fontWeight: 'bold' }}>{row.persuasiveness}</td>
                              <td style={{ padding: '16px 20px', color: '#94a3b8' }}>{new Date(row.timestamp).toLocaleDateString()}</td>
                              <td style={{ padding: '16px 20px', fontStyle: 'italic', color: row.coach_feedback ? '#34d399' : '#64748b' }}>
                                {row.coach_feedback ? `"${row.coach_feedback}"` : 'Pending review'}
                              </td>
                              <td style={{ padding: '16px 20px' }}>
                                <button 
                                  onClick={() => downloadReport(row)} 
                                  style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; e.currentTarget.style.color = '#fff' }}
                                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.color = '#a5b4fc' }}
                                >
                                  📥 Export PDF
                                </button>
                              </td>
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

        {/* 8. UPGRADED SYSTEM ADMIN PANEL */}
        {activeTab === 'admin' && userRole === 'Administrator' && (
          <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', border: '1px solid #2a324b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: '#ffffff', marginBottom: '30px', fontSize: '28px' }}>⚙️ System Administration</h2>
            
            {/* Top Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', color: 'white', border: '1px solid #334155' }}>
                <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px' }}>Total Registered Users</span>
                <div style={{ fontSize: '36px', fontWeight: '800', marginTop: '12px', color: '#f8fafc' }}>{adminData.stats.total_users}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)', padding: '24px', borderRadius: '16px', color: 'white', boxShadow: '0 10px 15px -3px rgba(168, 85, 247, 0.3)' }}>
                <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', color: '#e0e7ff', letterSpacing: '1px' }}>Total Platform Debates</span>
                <div style={{ fontSize: '36px', fontWeight: '800', marginTop: '12px' }}>{adminData.stats.total_debates}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', color: 'white', border: '1px solid #334155' }}>
                <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px' }}>System Health</span>
                <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#34d399', borderRadius: '50%', boxShadow: '0 0 10px #34d399' }}></span> Online
                </div>
              </div>
            </div>

            {/* Quick Actions Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '20px' }}>User Management Directory</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Search users by name or email..." 
                  value={adminUserSearch}
                  onChange={(e) => setAdminUserSearch(e.target.value)}
                  style={{ padding: '10px 16px', background: '#0b0f19', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', width: '250px' }}
                />
                <button style={{ padding: '10px 16px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>📥 Export CSV</button>
              </div>
            </div>

            {/* User Directory Table */}
            {isLoadingAdmin ? (
              <p style={{ color: '#818cf8', fontSize: '15px' }}>🔄 Fetching database records...</p>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #2a324b', borderRadius: '16px', background: '#0b0f19' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: '#cbd5e1', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '16px 20px', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '16px 20px', fontWeight: '600' }}>Email</th>
                      <th style={{ padding: '16px 20px', fontWeight: '600' }}>Role</th>
                      <th style={{ padding: '16px 20px', fontWeight: '600' }}>Status</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdmins.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No users found matching your search.</td>
                      </tr>
                    ) : filteredAdmins.map((user, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #2a324b', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#131825'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '16px 20px', color: '#f8fafc', fontWeight: 'bold' }}>{user.username}</td>
                        <td style={{ padding: '16px 20px', color: '#94a3b8' }}>{user.email}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            background: user.role === 'Administrator' ? 'rgba(239, 68, 68, 0.1)' : user.role === 'Educator' ? 'rgba(16, 185, 129, 0.1)' : user.role === 'Debate Coach' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                            color: user.role === 'Administrator' ? '#fca5a5' : user.role === 'Educator' ? '#6ee7b7' : user.role === 'Debate Coach' ? '#d8b4fe' : '#a5b4fc',
                            border: `1px solid ${user.role === 'Administrator' ? 'rgba(239, 68, 68, 0.2)' : user.role === 'Educator' ? 'rgba(16, 185, 129, 0.2)' : user.role === 'Debate Coach' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
                            padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' 
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ color: user.status === 'Active' ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: user.status === 'Active' ? '#34d399' : '#f87171' }}></span>
                            {user.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button style={{ padding: '8px 16px', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#fff' }} onMouseOut={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#e2e8f0' }}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* NEW: STUDENT DRILL-DOWN MODAL FOR EDUCATORS & COACHES */}
      {selectedStudentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 9, 11, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #2a324b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #2a324b', paddingBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: 'white', fontSize: '28px' }}>{selectedStudentModal.name}'s Profile</h2>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>Average Overall Score: <strong style={{ color: '#34d399' }}>{selectedStudentModal.score}/100</strong></span>
              </div>
              <button onClick={() => setSelectedStudentModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div style={{ background: '#0b0f19', padding: '30px', borderRadius: '20px', border: '1px solid #2a324b' }}>
                <h3 style={{ marginTop: 0, textAlign: 'center', color: '#ffffff', fontSize: '18px', marginBottom: '10px', fontWeight: '600' }}>Skill Breakdown Overview</h3>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                        { subject: 'Argument Quality', score: selectedStudentModal.rawSessions?.[0]?.logic || selectedStudentModal.score, fullMark: 100 },
                        { subject: 'Evidence Usage', score: selectedStudentModal.rawSessions?.[0]?.evidence || selectedStudentModal.score - 5, fullMark: 100 },
                        { subject: 'Logical Consistency', score: selectedStudentModal.rawSessions?.[0]?.logic || selectedStudentModal.score + 2, fullMark: 100 },
                        { subject: 'Rebuttal Skill', score: selectedStudentModal.rawSessions?.[0]?.persuasion || selectedStudentModal.score - 8, fullMark: 100 },
                        { subject: 'Communication', score: selectedStudentModal.rawSessions?.[0]?.clarity || selectedStudentModal.score + 5, fullMark: 100 }
                      ]}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Radar name="Student Skills" dataKey="score" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: '#0b0f19', padding: '30px', borderRadius: '20px', border: '1px solid #2a324b' }}>
                <h3 style={{ marginTop: 0, color: '#ffffff', fontSize: '18px', marginBottom: '20px', fontWeight: '600' }}>Actionable Insights</h3>
                <ul style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.8', paddingLeft: '20px' }}>
                  <li>Student is trending <strong style={{ color: selectedStudentModal.trend === 'up' ? '#34d399' : '#f87171' }}>{selectedStudentModal.trend.toUpperCase()}</strong> over their last sessions.</li>
                  <li>Evidence usage is frequently flagged as anecdotal rather than empirical.</li>
                  <li>Communication clarity remains highly consistent.</li>
                </ul>
                <div style={{ marginTop: '30px', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
                  <strong style={{ color: '#a5b4fc', display: 'block', marginBottom: '8px' }}>Coach Note</strong>
                  <span style={{ color: '#e0e7ff', fontSize: '14px' }}>Review the latest session transcript before assigning new topics.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- ADD TOPIC MODAL OVERLAY --- */}
      {showAddTopicModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 9, 11, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '480px', border: '1px solid #2a324b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#ffffff', fontSize: '24px' }}>Add New Debate Topic</h2>
            
            <form onSubmit={handleAddTopicSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Topic Title</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., Quantum Computing Ethics"
                  value={newTopicForm.title} 
                  onChange={(e) => setNewTopicForm({...newTopicForm, title: e.target.value})} 
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', background: '#0b0f19', color: '#ffffff', fontSize: '15px' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Difficulty Level</label>
                <select 
                  value={newTopicForm.difficulty} 
                  onChange={(e) => setNewTopicForm({...newTopicForm, difficulty: e.target.value})} 
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', background: '#0b0f19', color: '#ffffff', fontSize: '15px' }}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddTopicModal(false)} style={{ flex: 1, padding: '14px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}>Save Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SCHEDULING MODAL OVERLAY --- */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 9, 11, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '500px', border: '1px solid #2a324b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#ffffff', fontSize: '24px' }}>Schedule a Session</h2>
            
            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Debate Topic</label>
                <select required value={scheduleData.topic} onChange={(e) => setScheduleData({...scheduleData, topic: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #334155', background: '#0b0f19', color: 'white', fontSize: '15px' }}>
                  {availableTopics.map((t, idx) => (
                    <option key={idx} value={t.title}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Format</label>
                <select required value={scheduleData.format} onChange={(e) => setScheduleData({...scheduleData, format: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #334155', background: '#0b0f19', color: 'white', fontSize: '15px' }}>
                  {["One-on-One Debate", "AI Debate Simulation", "Oxford Debate", "Public Forum Debate", "Policy Debate", "Parliamentary Debate"].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Date</label>
                  <input type="date" required value={scheduleData.date} onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #334155', background: '#0b0f19', color: 'white', fontSize: '15px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Time</label>
                  <input type="time" required value={scheduleData.time} onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #334155', background: '#0b0f19', color: 'white', fontSize: '15px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} style={{ flex: 1, padding: '14px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}>Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COACH FEEDBACK MODAL OVERLAY */}
      {feedbackModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 9, 11, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#131825', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '480px', border: '1px solid #2a324b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#ffffff', fontSize: '24px' }}>Add Mentorship Feedback</h2>
            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <textarea 
                required 
                placeholder="Provide constructive feedback for the student..."
                value={feedbackModal.text} 
                onChange={(e) => setFeedbackModal({...feedbackModal, text: e.target.value})} 
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #334155', outline: 'none', height: '140px', resize: 'vertical', background: '#0b0f19', color: 'white', fontSize: '15px', lineHeight: '1.6', fontFamily: 'inherit' }} 
              />
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <button type="button" onClick={() => setFeedbackModal({ isOpen: false, turnId: null, text: '' })} style={{ flex: 1, padding: '14px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '14px', background: '#312e81', color: '#e0e7ff', border: '1px solid #4338ca', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>Save Feedback</button>
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #09090b; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #09090b; }
        ::-webkit-scrollbar-thumb { background: #2a324b; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
      {!authToken ? (
        <AuthForms setAuthToken={setAuthToken} setUserRole={setUserRole} />
      ) : (
        <Dashboard authToken={authToken} userRole={userRole} logout={handleLogout} />
      )}
    </>
  );
}