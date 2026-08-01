import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import jsPDF from 'jspdf';

// --- Map of pages to active sub-agents for UI display ---
const PAGE_AGENT_MAP = {
  'dashboard': ['Recommendation & Coaching Agent', 'Performance Analytics Agent'],
  'profile': ['Orchestrator Agent'],
  'topics': ['Recommendation & Coaching Agent'],
  'sessions': ['Recommendation & Coaching Agent', 'Performance Analytics Agent'],
  'room': ['Argument Analysis Agent', 'Logical Fallacy Detection Agent', 'Counterargument Generation Agent'],
  'reports': ['Performance Analytics Agent', 'Report Generation Agent'],
  'admin': ['Report Generation Agent', 'Performance Analytics Agent']
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
            {/* The experience level dropdown has been hidden per your previous instruction */}
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
  const [streamingText, setStreamingText] = useState(''); 

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

  // Manager Dashboard State & Logic
  const [studentHistories, setStudentHistories] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Admin Dashboard State & Logic
  const [adminData, setAdminData] = useState({ users: [], stats: { total_users: 0, total_debates: 0 } });
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

  // NEW: Feedback Modal State
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, turnId: null, text: '' });

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'sessions' && (userRole === 'Educator' || userRole === 'Debate Coach')) {
      fetchStudentHistories();
    }
  }, [activeTab, userRole]);

  useEffect(() => {
    if (activeTab === 'admin' && userRole === 'Administrator') {
      fetchAdminData();
    }
  }, [activeTab, userRole]);

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
        setAdminData({ users: data.users, stats: data.stats });
      }
    } catch (error) {
      console.error("Failed to fetch admin data");
    }
    setIsLoadingAdmin(false);
  };

  // Submit Feedback Function
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
        fetchStudentHistories(); // Refresh the list
      } else {
        alert("Error submitting feedback.");
      }
    } catch (err) {
      alert("Failed to connect to the backend.");
    }
  };

  // ----------------------------------------------------
  // UPDATED: Generation to PDF format using jsPDF
  // ----------------------------------------------------
  const downloadReport = (session) => {
    const doc = new jsPDF();
    const formattedDate = new Date(session.timestamp).toLocaleDateString();

    // Add Title
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Debate Session Report', 20, 25);

    // Add Meta Data
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Date: ${formattedDate}`, 20, 35);
    doc.text(`Format: ${session.debate_format}`, 20, 42);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 48, 190, 48);

    // Add Scores Section
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('AI Evaluation Scores', 20, 62);

    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(`• Logical Consistency: ${session.logical_consistency}/100`, 25, 72);
    doc.text(`• Clarity: ${session.clarity}/100`, 25, 80);
    doc.text(`• Persuasiveness: ${session.persuasiveness}/100`, 25, 88);

    // Add Feedback Section
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Coach Remarks', 20, 108);

    doc.setFontSize(12);
    doc.setTextColor(4, 120, 87); // emerald-700 (green text)
    const feedbackText = session.coach_feedback ? `"${session.coach_feedback}"` : 'Pending review';
    
    // Automatically wrap text so it doesn't run off the PDF page
    const splitFeedback = doc.splitTextToSize(feedbackText, 160);
    doc.text(splitFeedback, 20, 118);

    // Add Footer
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Generated securely by Agentic AI Debate Coach', 20, 280);

    // Save and Trigger Download
    doc.save(`Debate_Report_${formattedDate.replace(/\//g, '-')}.pdf`);
  };

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
          <button onClick={() => setActiveTab('reports')} style={navButtonStyle('reports')}>📊 Skills & Reports</button>
          
          {/* Only show this tab to Administrators */}
          {userRole === 'Administrator' && (
            <button onClick={() => setActiveTab('admin')} style={navButtonStyle('admin')}>⚙️ System Admin</button>
          )}
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

        {/* 4. Debate Sessions / Manager Dashboard */}
        {activeTab === 'sessions' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0, marginBottom: 0, color: '#0f172a' }}>{isManager ? 'Classroom Activity' : 'Debate Sessions'}</h2>
              {!isManager && (
                <button onClick={() => setShowScheduleModal(true)} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ New Session</button>
              )}
            </div>
            
            {isManager ? (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#64748b', marginBottom: '20px' }}>Review AI-generated debate transcripts and monitor student performance.</p>
                {isLoadingStudents ? (
                  <p style={{ color: '#4f46e5', fontWeight: 'bold' }}>🔄 Loading student sessions...</p>
                ) : studentHistories.length === 0 ? (
                  <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', margin: 0 }}>No student debates found yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {studentHistories.map((session, idx) => {
                      const avgScore = Math.round((session.clarity + session.relevance + session.evidence_strength + session.logical_consistency + session.persuasiveness) / 5);
                      return (
                        <div key={idx} style={{ padding: '24px', background: '#f8fafc', borderLeft: '4px solid #10b981', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ display: 'block', fontSize: '18px', color: '#0f172a' }}>{session.learner_name}</strong>
                              <span style={{ color: '#64748b', fontSize: '13px' }}>{session.learner_email} • {session.debate_format} • {new Date(session.timestamp).toLocaleDateString()}</span>
                            </div>
                            <span style={{ background: avgScore > 75 ? '#dcfce7' : '#fef3c7', color: avgScore > 75 ? '#166534' : '#92400e', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                              Avg AI Score: {avgScore}/100
                            </span>
                          </div>
                          <div style={{ marginTop: '15px' }}>
                            <strong style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase' }}>Student Argument:</strong>
                            <p style={{ marginTop: '5px', color: '#334155', fontSize: '14px', fontStyle: 'italic', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              "{session.user_transcript}"
                            </p>
                          </div>
                          
                          {/* Display Existing Feedback */}
                          {session.coach_feedback && (
                            <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '8px', marginTop: '10px', borderLeft: '4px solid #4f46e5' }}>
                              <strong style={{ color: '#3730a3' }}>Coach Feedback:</strong> <span style={{ color: '#312e81' }}>{session.coach_feedback}</span>
                            </div>
                          )}

                          {/* Wire up the Feedback Button */}
                          {(userRole === 'Debate Coach' || userRole === 'Educator') && (
                            <button 
                              onClick={() => setFeedbackModal({ isOpen: true, turnId: session.id, text: session.coach_feedback || '' })}
                              style={{ marginTop: '15px', padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'background 0.2s' }}>
                              ✍️ {session.coach_feedback ? 'Edit Feedback' : 'Add Coach Feedback'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <h4 style={{ margin: 0, color: '#334155' }}>My Upcoming Sessions</h4>
                {sessionsList.map((session, index) => (
                  <div key={index} style={{ padding: '20px', background: '#f8fafc', borderLeft: '4px solid #4f46e5', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <strong style={{ display: 'block', fontSize: '16px', marginBottom: '5px', color: '#0f172a' }}>{session.title}</strong>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Session ID: {session.id} • {session.timing} ({session.format})</span>
                  </div>
                ))}
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

                {/* --- LIVE STREAMING TEXT DISPLAY --- */}
                {(isAnalyzing || (streamingText && !analysisResult)) && (
                  <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🔄</span> AI is thinking...
                    </h3>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#334155', lineHeight: '1.6', margin: 0, fontSize: '14px' }}>
                      {streamingText}
                    </pre>
                  </div>
                )}

                {/* --- FULL ANALYSIS RESULTS RENDER (Shows when stream is complete) --- */}
                {analysisResult && analysisResult.counter_argument ? (
                  <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 1. What the AI Heard */}
                    {analysisResult.user_transcript && (
                      <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                        <strong style={{ color: '#334155', display: 'block', marginBottom: '5px' }}>🗣️ What the AI Heard:</strong>
                        <span style={{ color: '#475569', fontStyle: 'italic', lineHeight: '1.5' }}>"{analysisResult.user_transcript}"</span>
                      </div>
                    )}

                    {/* 2. Evaluation Scores */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px', marginBottom: '20px' }}>Evaluation Scores</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {[
                          { label: "Argument Quality", value: analysisResult.argument_quality_score },
                          { label: "Evidence Usage", value: analysisResult.evidence_usage_score },
                          { label: "Logical Consistency", value: analysisResult.logical_consistency_score },
                          { label: "Rebuttal Effectiveness", value: analysisResult.rebuttal_effectiveness_score },
                          { label: "Communication Skills", value: analysisResult.communication_skills_score }
                        ].map((metric, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: '#475569', width: '45%', fontSize: '14px', fontWeight: '500' }}>{metric.label}</span>
                            <div style={{ flex: 1, margin: '0 15px', background: '#e2e8f0', borderRadius: '999px', height: '10px' }}>
                              <div style={{ background: '#4f46e5', height: '10px', borderRadius: '999px', width: `${metric.value || 0}%`, transition: 'width 1s ease-in-out' }}></div>
                            </div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b', width: '50px', textAlign: 'right' }}>{metric.value || 0}/100</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Restored Logical Fallacies UI */}
                    {analysisResult.fallacies_detected?.length > 0 && analysisResult.fallacies_detected.some(f => f.fallacy_detected) && (
                      <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <h3 style={{ marginTop: 0, color: '#b91c1c', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          🚨 Logical Fallacies Detected
                        </h3>
                        {analysisResult.fallacies_detected.map((fallacy, idx) => fallacy.fallacy_detected ? (
                          <div key={idx} style={{ marginBottom: '15px' }}>
                            <h4 style={{ color: '#b91c1c', margin: '0 0 5px 0' }}>{fallacy.fallacy_type}</h4>
                            <blockquote style={{ fontStyle: 'italic', borderLeft: '4px solid #f87171', paddingLeft: '15px', margin: '10px 0', color: '#7f1d1d', background: '#fee2e2', padding: '10px 15px', borderRadius: '0 8px 8px 0' }}>
                              "{fallacy.offending_text}"
                            </blockquote>
                            <p style={{ margin: '5px 0', color: '#1e293b', fontSize: '14px' }}><strong>Why:</strong> {fallacy.explanation}</p>
                            <p style={{ margin: '5px 0', color: '#047857', fontSize: '14px' }}><strong>Fix:</strong> {fallacy.counter_strategy}</p>
                          </div>
                        ) : null)}
                      </div>
                    )}

                    {/* 4. Actionable Feedback */}
                    {analysisResult.actionable_feedback?.length > 0 && (
                      <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                        <h3 style={{ marginTop: 0, color: '#b45309', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          💡 Actionable Feedback
                        </h3>
                        {analysisResult.actionable_feedback.map((item, idx) => (
                          <div key={idx} style={{ marginBottom: '15px' }}>
                            <p style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '14px' }}><strong>Critique:</strong> {item.critique}</p>
                            <blockquote style={{ fontStyle: 'italic', borderLeft: '4px solid #f59e0b', paddingLeft: '15px', margin: '0', color: '#92400e', background: '#fef3c7', padding: '10px 15px', borderRadius: '0 8px 8px 0' }}>
                              <strong>Try this instead:</strong> {item.rewrite_recommendation}
                            </blockquote>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 5. AI Rebuttal */}
                    <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', borderTop: '1px solid #bfdbfe', borderRight: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '18px' }}>AI Coach Rebuttal</h3>
                        <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' }}>
                          {analysisResult.counter_argument.rebuttal_type} Type
                        </span>
                      </div>
                      <p style={{ margin: '0 0 15px 0', color: '#1e40af', lineHeight: '1.6' }}>{analysisResult.counter_argument.rebuttal_text}</p>
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <strong style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '5px' }}>🤔 Challenge Question:</strong>
                        <p style={{ margin: '5px 0 0 0', color: '#334155', fontStyle: 'italic' }}>{analysisResult.counter_argument.challenge_question}</p>
                      </div>
                    </div>

                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* 7. REPORTS & SKILLS (With Radar Chart Integration) */}
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
                    
                    {/* --- RADAR CHART VISUALIZATION SECTION --- */}
                    <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '40px' }}>
                      <h3 style={{ marginTop: 0, textAlign: 'center', color: '#1e293b', fontSize: '18px', marginBottom: '20px' }}>
                        Performance Overview
                      </h3>
                      <div style={{ width: '100%', height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart 
                            cx="50%" 
                            cy="50%" 
                            outerRadius="75%" 
                            data={[
                              { subject: 'Argument Quality', score: totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.relevance, 0) / totalDebates) : 0, fullMark: 100 },
                              { subject: 'Evidence Usage', score: avgEvidence, fullMark: 100 },
                              { subject: 'Logical Consistency', score: avgLogic, fullMark: 100 },
                              { subject: 'Rebuttal Skill', score: totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.persuasiveness, 0) / totalDebates) : 0, fullMark: 100 },
                              { subject: 'Communication', score: totalDebates ? Math.round(historyData.reduce((sum, row) => sum + row.clarity, 0) / totalDebates) : 0, fullMark: 100 }
                            ]}
                          >
                            <PolarGrid stroke="#cbd5e1" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <Radar name="My Skills" dataKey="score" stroke="#4f46e5" strokeWidth={2} fill="#4f46e5" fillOpacity={0.5} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                              itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
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
                            <th style={{ padding: '12px 16px' }}>Coach Remarks</th>
                            {/* NEW: Action column header */}
                            <th style={{ padding: '12px 16px' }}>Action</th>
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
                              <td style={{ padding: '12px 16px', fontStyle: 'italic', color: row.coach_feedback ? '#047857' : '#94a3b8' }}>
                                {row.coach_feedback ? `"${row.coach_feedback}"` : 'Pending review'}
                              </td>
                              {/* NEW: Export Button */}
                              <td style={{ padding: '12px 16px' }}>
                                <button 
                                  onClick={() => downloadReport(row)} 
                                  style={{ padding: '6px 12px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'background 0.2s' }}
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

        {/* 8. SYSTEM ADMIN PANEL */}
        {activeTab === 'admin' && userRole === 'Administrator' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '20px' }}>⚙️ System Administration</h2>
            
            {/* Global KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', opacity: 0.8 }}>Total Registered Users</span>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px' }}>{adminData.stats.total_users}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', opacity: 0.8 }}>Total Platform Debates</span>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px' }}>{adminData.stats.total_debates}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', opacity: 0.8 }}>System Health</span>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4ade80', borderRadius: '50%' }}></span> Online
                </div>
              </div>
            </div>

            {/* User Management Table */}
            <h3 style={{ color: '#1e293b', fontSize: '18px', marginBottom: '15px' }}>User Management Directory</h3>
            {isLoadingAdmin ? (
              <p style={{ color: '#64748b' }}>🔄 Fetching database records...</p>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px' }}>Name</th>
                      <th style={{ padding: '12px 16px' }}>Email</th>
                      <th style={{ padding: '12px 16px' }}>Role</th>
                      <th style={{ padding: '12px 16px' }}>Experience</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.users.map((user, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: 'bold' }}>{user.username}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{user.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            background: user.role === 'Administrator' ? '#fee2e2' : user.role === 'Educator' ? '#dcfce7' : user.role === 'Debate Coach' ? '#f3e8ff' : '#e0e7ff', 
                            color: user.role === 'Administrator' ? '#991b1b' : user.role === 'Educator' ? '#166534' : user.role === 'Debate Coach' ? '#6b21a8' : '#3730a3', 
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{user.experiencelevel || user.experienceLevel}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button style={{ padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Manage</button>
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

      {/* NEW: COACH FEEDBACK MODAL OVERLAY */}
      {feedbackModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Add Mentorship Feedback</h2>
            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <textarea 
                required 
                placeholder="Provide constructive feedback for the student..."
                value={feedbackModal.text} 
                onChange={(e) => setFeedbackModal({...feedbackModal, text: e.target.value})} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', height: '120px', resize: 'vertical' }} 
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setFeedbackModal({ isOpen: false, turnId: null, text: '' })} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Feedback</button>
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