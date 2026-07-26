import React, { useState } from 'react';

export const DebateDashboard = () => {
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [argument, setArgument] = useState("");
  const [debateFormat, setDebateFormat] = useState("One-on-One Debate");

  const handleGetFeedback = async () => {
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append("text_argument", argument);
    formData.append("debate_format", debateFormat);
    formData.append("session_id", "12345");
    formData.append("duration", "2 mins");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/debate/turn", {
        method: "POST",
        body: formData,
      });
      
      const jsonData = await response.json(); 
      console.log("RECEIVED FROM BACKEND:", jsonData);
      setFeedback(jsonData);
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans">
      <h2 className="text-2xl font-bold mb-6">Live Debate Room</h2>
      
      <div className="mb-6">
        <label className="block font-bold text-gray-700 mb-2">Select Debate Format</label>
        <select 
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          value={debateFormat}
          onChange={(e) => setDebateFormat(e.target.value)}
        >
          <option value="One-on-One Debate">One-on-One Debate</option>
          <option value="Parliamentary Debate">Parliamentary Debate</option>
          <option value="Policy Debate">Policy Debate</option>
        </select>
      </div>

      <textarea 
        className="w-full p-4 border border-gray-300 rounded-lg mb-4 h-40 focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="Type your argument here..."
        value={argument}
        onChange={(e) => setArgument(e.target.value)}
      />
      
      <button className="bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg mb-6 flex items-center hover:bg-emerald-600 transition-colors">
        🎤 Record Argument
      </button>

      <button 
        onClick={handleGetFeedback}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors mb-8"
        disabled={isLoading}
      >
        {isLoading ? "Analyzing..." : "Get AI Feedback ✨"}
      </button>

      {/* NEW RENDER LOGIC FOR STRUCTURED JSON */}
      {feedback && feedback.scores ? (
        <div className="space-y-6">
          
          {/* 1. Core Analysis */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold mb-3 text-gray-800">Argument Breakdown</h3>
            <p className="text-gray-700"><strong>Core Claim:</strong> {feedback.core_claim}</p>
            <div className="mt-3">
              <strong className="text-gray-700">Evidence Provided:</strong>
              <ul className="list-disc ml-6 mt-2 text-gray-600 space-y-1">
                {feedback.supporting_evidence?.map((ev, idx) => (
                  <li key={idx}>{ev}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 2. Evaluation Scores */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold mb-5 text-gray-800">Evaluation Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(feedback.scores).map(([metric, score]) => (
                <div key={metric} className="flex items-center justify-between">
                  <span className="capitalize font-medium text-gray-600 w-1/3">
                    {metric.replace('_', ' ')}
                  </span>
                  <div className="flex-1 mx-4 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-indigo-500 h-3 rounded-full transition-all duration-1000" 
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-gray-700 w-12 text-right">{score}/100</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Logical Fallacies */}
          {feedback.fallacies_detected?.length > 0 && (
            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center">
                <span className="mr-2">🚨</span> Logical Fallacies Detected
              </h3>
              {feedback.fallacies_detected.map((fallacy, idx) => (
                <div key={idx} className="mb-5 last:mb-0">
                  <h4 className="font-bold text-red-700 text-lg">{fallacy.fallacy_name}</h4>
                  <blockquote className="italic border-l-4 border-red-400 pl-4 my-3 text-red-900 bg-red-100/50 py-2 rounded-r-md">
                    "{fallacy.quote}"
                  </blockquote>
                  <p className="text-gray-800 mb-1"><strong>Why:</strong> {fallacy.explanation}</p>
                  <p className="text-emerald-700"><strong>Fix:</strong> {fallacy.correction_suggestion}</p>
                </div>
              ))}
            </div>
          )}

          {/* 4. AI Rebuttal */}
          <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-500 border-y border-r border-indigo-100 shadow-sm">
            <h3 className="text-xl font-bold text-indigo-900 mb-3">AI Coach Rebuttal</h3>
            <p className="text-indigo-800 leading-relaxed">{feedback.ai_rebuttal}</p>
          </div>

        </div>
      ) : feedback ? (
        <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg">
          Analyzing data formatting...
        </div>
      ) : null}
    </div>
  );
};