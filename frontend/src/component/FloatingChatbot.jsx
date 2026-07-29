import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Map of pages to active sub-agents for UI display
const PAGE_AGENT_MAP = {
  'dashboard': ['Recommendation & Coaching Agent', 'Performance Analytics Agent'],
  'room': ['Argument Analysis Agent', 'Logical Fallacy Detection Agent', 'Counterargument Agent'],
  'topics': ['Recommendation & Coaching Agent'],
  'argument-analyzer': ['Argument Analysis Agent', 'Logical Fallacy Detection Agent'],
  'presentation': ['Presentation Analysis Agent', 'Report Generation Agent'],
  'reports': ['Performance Analytics Agent', 'Report Generation Agent'],
  'educator': ['Performance Analytics Agent', 'Report Generation Agent'],
  'coach': ['Recommendation & Coaching Agent', 'Performance Analytics Agent'],
  'admin': ['Report Generation Agent'],
  'help': ['Orchestrator Agent']
};

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
            fontFamily: 'Inter, system-ui, sans-serif'
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

export default FloatingChatbot;