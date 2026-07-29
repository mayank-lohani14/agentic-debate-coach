import React, { useState } from 'react';

export default function Sessions() {
  const [sessions, setSessions] = useState([
    { id: '#1042', title: 'Climate Change Policy', timing: 'Starts in 2 hours' }
  ]);

  const handleNewSession = () => {
    const randomId = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const newSessionItem = {
      id: randomId,
      title: 'New Debate Practice Room',
      timing: 'Just created • Ready to join'
    };
    setSessions([newSessionItem, ...sessions]);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Debate Sessions</h2>
        <button 
          onClick={handleNewSession}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + New Session
        </button>
      </div>

      <h3 className="text-lg font-semibold text-gray-700 mb-4">My Upcoming Sessions</h3>

      <div className="space-y-3">
        {sessions.map((session, index) => (
          <div key={index} className="bg-white border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm">
            <h4 className="font-bold text-gray-900">{session.title}</h4>
            <p className="text-sm text-gray-500">Session ID: {session.id} • {session.timing}</p>
          </div>
        ))}
      </div>
    </div>
  );
}