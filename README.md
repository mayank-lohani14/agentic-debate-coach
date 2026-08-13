# 🤖 Agentic AI Debate Coach & Voice Presentation Analytics Platform

An advanced, full-stack, AI-powered debate coaching and presentation analysis platform built with **FastAPI, React, LangGraph, and PostgreSQL**, fully containerized via **Docker**. Designed to evaluate logical reasoning, detect fallacies, provide multi-agent AI insights, and track voice presentation metrics (pace, confidence, filler words).

---

## 🚀 Tech Stack

* **Frontend**: React, Vite, Recharts, jsPDF, Axios
* **Backend**: FastAPI, Python 3.10, Pydantic, Uvicorn
* **AI & Orchestration**: Google GenAI SDK, LangChain, LangGraph (Stateful Memory & Rebuttals)
* **Database**: PostgreSQL (Dockerized container with persistent volumes)
* **DevOps & Containerization**: Docker, Docker Compose, Git & GitHub

---

## ✨ Key Features & Milestones

1. **Interactive Debate Room & SSE Streaming**: Real-time server-sent events (SSE) streaming user arguments and AI responses word-by-word.
2. **Milestone 3 - LangGraph Multi-Agent Engine**: Multi-node state graph (`ai_engine.py`) handling argument analysis, logical fallacy detection, and structured counterargument generation.
3. **Milestone 4 - Voice Presentation Analytics**: Audio file processing via Gemini to extract speech pace (WPM), filler word counts, vocal confidence scores, and prosody feedback.
4. **Professional Dashboard & Reports**: Performance tracking charts, session metrics, and detailed historical data stored securely in PostgreSQL.

---

## 🛠️ Project Structure

Based on mine workspace layout:
```text
Agentic ai debate  coach/
│
├── backend/                  # FastAPI backend server & AI engine
│   ├── __pycache__/
│   ├── ai_engine.py          # LangGraph workflows & Gemini transcriptions
│   ├── auth.py               # Authentication & JWT security logic
│   ├── database.py           # PostgreSQL database connection handler
│   ├── debate_users.db       # Local SQLite fallback/database file
│   ├── engine.py             # Additional AI/debate core processing
│   ├── main.py               # FastAPI application routing setup
│   ├── models.py             # Database ORM models
│   ├── schemas.py            # Pydantic data validation schemas
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile            # Backend container configuration
│
├── frontend/                 # React + Vite user interface
│   ├── src/                  # Components, pages, and UI logic
│   ├── node_modules/         # Node dependencies
│   ├── .dockerignore         # Excludes local node_modules from container
│   ├── .gitignore
│   ├── Dockerfile            # Frontend container configuration
│   ├── index.html            # Main HTML entry point
│   ├── package-lock.json
│   └── package.json          # Node dependencies
│
├── .env                      # Environment variables (API keys & DB config)
├── .gitignore
├── docker-compose.yml        # Multi-container orchestration (DB, API, UI)
├── LICENSE                   # Project license
└── README.md                 # Project documentation
```
⚙️ Setup & Installation Instructions
Prerequisites
Docker Desktop installed and running.

A valid Google Gemini API Key from Google AI Studio.

1. Environment Configuration
Create a .env file in your root workspace directory and add your credentials:

Code snippet
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
DB_HOST=localhost
DB_NAME=debate_db
DB_USER=postgres
DB_PASSWORD=Mayank123
DB_PORT=5432
2. Running with Docker (Recommended)
Build and run all services (PostgreSQL database, FastAPI backend, and React frontend) simultaneously:

PowerShell
docker compose up --build
Once running:

Frontend Application: Access at http://localhost:5173

Backend API Documentation: Access at http://localhost:8000/docs

3. Running Locally (Development Mode)
If you prefer running components manually in separate terminal windows:

Backend Server:

PowerShell
cd backend
uvicorn main:app --reload
Frontend App:

PowerShell
cd frontend
npm install
npm run dev

👤 Author 
Name: Mayank Lohani