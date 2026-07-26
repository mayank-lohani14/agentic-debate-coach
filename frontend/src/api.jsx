// frontend/src/api.js
const API_BASE = "http://127.0.0.1:8000";

export const sendDebateTurn = async (audioPath, duration, format, sessionId) => {
  const response = await fetch(`${API_BASE}/api/v1/debate/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_path: audioPath,
      duration: duration,
      debate_format: format,
      session_id: sessionId
    }),
  });
  
  if (!response.ok) throw new Error("Failed to connect to Debate Engine");
  return await response.json();
};