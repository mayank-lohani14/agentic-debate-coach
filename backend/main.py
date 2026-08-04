# Author: Mayank Lohani
# Roll No: 2400320100677
# Section: CSE-21
# Description: Main FastAPI Application for Agentic Debate Coach with Audio-to-Text and Chat Support

from fastapi import FastAPI, Form, UploadFile, File, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
import uvicorn
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, List

# JWT IMPORTS
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer

from ai_engine import router as debate_router

# 1. Initialize FastAPI FIRST
app = FastAPI()

# 2. Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. THEN include the router (this links to our LangGraph endpoint in ai_engine.py)
app.include_router(debate_router)

# 4. Configure Gemini Client
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# Initialize the official google-genai client
client = genai.Client(api_key=api_key)

# ---------------------------------------------------------
# JWT SECURITY CONFIGURATION
# ---------------------------------------------------------
SECRET_KEY = "your-super-secret-production-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ---------------------------------------------------------
# POSTGRESQL DATABASE CONFIGURATION
# ---------------------------------------------------------
DB_HOST = "localhost"
DB_NAME = "debate_db"
DB_USER = "postgres"
DB_PASSWORD = "Mayank123"
DB_PORT = 5432

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # PostgreSQL Users Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                email VARCHAR(255) PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(100) NOT NULL,
                experienceLevel VARCHAR(100) NOT NULL
            );
        ''')
        
        # PostgreSQL Debate History Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS debate_turns (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                session_id VARCHAR(255) NOT NULL,
                debate_format VARCHAR(255) NOT NULL,
                user_transcript TEXT,
                clarity INTEGER,
                relevance INTEGER,
                evidence_strength INTEGER,
                logical_consistency INTEGER,
                persuasiveness INTEGER,
                ai_rebuttal TEXT,
                coach_feedback TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        
        # Safely add the column if the table already existed before this update
        try:
            cursor.execute('ALTER TABLE debate_turns ADD COLUMN coach_feedback TEXT;')
        except psycopg2.errors.DuplicateColumn:
            pass # Column already exists
            
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ PostgreSQL Database Initialized Successfully")
    except Exception as e:
        print(f"❌ PostgreSQL Connection Error: {e}")

init_db()

# 4. Define Pydantic Schemas
class UserRegistration(BaseModel):
    username: str
    email: str
    password: str
    role: str
    experienceLevel: str

class ChatMessage(BaseModel):
    message: str
    current_page: str = Field(default="dashboard", description="The current active tab/page in the frontend")
    user_role: str = Field(default="Learner", description="Role of the user")
    session_id: Optional[str] = "default_session"

# NEW: Schema for Coach Feedback
class CoachFeedback(BaseModel):
    turn_id: int
    feedback: str

# ---------------------------------------------------------
# 5. AUTHENTICATION ENDPOINTS (POSTGRESQL)
# ---------------------------------------------------------
@app.post("/api/auth/register")
async def register_user(user: UserRegistration):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    hashed_pw = get_password_hash(user.password)
    
    try:
        cursor.execute(
            "INSERT INTO users (email, username, password, role, experienceLevel) VALUES (%s, %s, %s, %s, %s)",
            (user.email, user.username, hashed_pw, user.role, user.experienceLevel)
        )
        conn.commit()
    except psycopg2.IntegrityError:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    cursor.close()
    conn.close()
    return {"message": "Registration successful"}

@app.post("/api/auth/login")
async def login_user(username: str = Form(...), password: str = Form(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT password, role FROM users WHERE email = %s", (username,))
    user_row = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if not user_row or not verify_password(password, user_row[0]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": username, "role": user_row[1]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user_row[1] 
    }

# ---------------------------------------------------------
# 6. FETCH HISTORY ENDPOINT (POSTGRESQL)
# ---------------------------------------------------------
@app.get("/api/v1/debate/history")
async def get_debate_history(authorization: Optional[str] = Header(None)):
    user_email = "anonymous"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub", "anonymous")
        except jwt.PyJWTError:
            user_email = "anonymous"
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            SELECT debate_format, clarity, relevance, evidence_strength, logical_consistency, persuasiveness, coach_feedback, timestamp
            FROM debate_turns
            WHERE email = %s
            ORDER BY timestamp DESC
        ''', (user_email,))
        
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        history = [dict(row) for row in rows]
        
        for item in history:
            if item.get("timestamp"):
                item["timestamp"] = item["timestamp"].isoformat()

        return {"history": history}

    except Exception as e:
        print(f"❌ History Fetch Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not fetch history")

# ---------------------------------------------------------
# 6.5 MANAGER DASHBOARD ENDPOINT (POSTGRESQL)
# ---------------------------------------------------------
@app.get("/api/v1/manager/student-histories")
async def get_student_histories(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_role = payload.get("role")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if user_role not in ["Educator", "Debate Coach", "Administrator"]:
        raise HTTPException(status_code=403, detail="Access denied. Managers only.")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            SELECT 
                dt.id, dt.session_id, dt.debate_format, dt.user_transcript, 
                dt.clarity, dt.relevance, dt.evidence_strength, 
                dt.logical_consistency, dt.persuasiveness, dt.ai_rebuttal, dt.coach_feedback, dt.timestamp,
                u.username AS learner_name, u.email AS learner_email
            FROM debate_turns dt
            JOIN users u ON dt.email = u.email
            WHERE u.role = 'Learner'
            ORDER BY dt.timestamp DESC;
        ''')
        
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        history = [dict(row) for row in rows]
        for item in history:
            if item.get("timestamp"):
                item["timestamp"] = item["timestamp"].isoformat()

        return {"data": history}
    except Exception as e:
        print(f"❌ Manager Fetch Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not fetch student histories")

# NEW: Submit Coach Feedback Endpoint
@app.post("/api/v1/manager/feedback")
async def submit_coach_feedback(data: CoachFeedback, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_role = payload.get("role")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if user_role not in ["Educator", "Debate Coach", "Administrator"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE debate_turns SET coach_feedback = %s WHERE id = %s",
            (data.feedback, data.turn_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "message": "Feedback saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save feedback")


# ---------------------------------------------------------
# 6.6 ADMIN DASHBOARD ENDPOINT (POSTGRESQL)
# ---------------------------------------------------------
@app.get("/api/v1/admin/dashboard-stats")
async def get_admin_stats(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_role = payload.get("role")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if user_role != "Administrator":
        raise HTTPException(status_code=403, detail="Access denied. Administrators only.")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Fetch all registered users
        cursor.execute("SELECT username, email, role, experienceLevel FROM users ORDER BY role, username;")
        users_list = [dict(row) for row in cursor.fetchall()]
        
        # 2. Calculate system-wide KPIs
        cursor.execute("SELECT COUNT(*) as total_users FROM users;")
        total_users = cursor.fetchone()["total_users"]
        
        cursor.execute("SELECT COUNT(*) as total_debates FROM debate_turns;")
        total_debates = cursor.fetchone()["total_debates"]
        
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "users": users_list,
            "stats": {
                "total_users": total_users,
                "total_debates": total_debates
            }
        }
    except Exception as e:
        print(f"❌ Admin Fetch Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not fetch admin data")


# ---------------------------------------------------------
# 7. AI COACH CHATBOT ENDPOINT (AGENTIC ORCHESTRATOR)
# ---------------------------------------------------------
AGENT_DEFINITIONS = {
    "Argument Analysis Agent": "Deconstruct argument structure, claims, evidence, and logical validity.",
    "Logical Fallacy Detection Agent": "Identify cognitive biases, formal/informal logical fallacies, and provide fixes.",
    "Counterargument Generation Agent": "Formulate strong rebuttals, opposing perspectives, and cross-examination points.",
    "Presentation Analysis Agent": "Evaluate speaking pace, vocal confidence, clarity, rhetoric, and filler words.",
    "Recommendation & Coaching Agent": "Provide personalized learning plans, topic recommendations, and practice advice.",
    "Performance Analytics Agent": "Analyze score histories, track metric trends (Logic, Clarity, Evidence), and explain reports.",
    "Report Generation Agent": "Summarize session analytics, generate progress summaries for coaches/educators.",
    "Orchestrator Agent": "Coordinate specialized agents and handle platform support questions."
}

PAGE_ROUTING_CONFIG = {
    "dashboard": ["Recommendation & Coaching Agent", "Performance Analytics Agent"],
    "room": ["Argument Analysis Agent", "Logical Fallacy Detection Agent", "Counterargument Generation Agent"],
    "topics": ["Recommendation & Coaching Agent"],
    "argument-analyzer": ["Argument Analysis Agent", "Logical Fallacy Detection Agent"],
    "presentation": ["Presentation Analysis Agent", "Report Generation Agent"],
    "reports": ["Performance Analytics Agent", "Report Generation Agent"],
    "educator": ["Performance Analytics Agent", "Report Generation Agent"],
    "coach": ["Recommendation & Coaching Agent", "Performance Analytics Agent"],
    "admin": ["Report Generation Agent"],
    "help": ["Orchestrator Agent"]
}

@app.post("/api/v1/chat")
async def chat_with_ai_coach(
    chat_data: ChatMessage,
    authorization: Optional[str] = Header(None)
):
    user_email = "anonymous"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub", "anonymous")
        except jwt.PyJWTError:
            user_email = "anonymous"

    try:
        active_agent_names = PAGE_ROUTING_CONFIG.get(chat_data.current_page, ["Orchestrator Agent"])
        
        agent_instructions = "\n".join([
            f"- **{agent}**: {AGENT_DEFINITIONS[agent]}" 
            for agent in active_agent_names if agent in AGENT_DEFINITIONS
        ])

        chat_prompt = f"""
You are the **Agentic AI Debate Coach Orchestrator**.
You coordinate specialized agents to assist users in debate, public speaking, critical thinking, and presentation skills.

### CURRENT CONTEXT
- **User Role**: {chat_data.user_role}
- **Active Module/Page**: {chat_data.current_page}
- **Activated Specialized Sub-Agents**:
{agent_instructions}

### INSTRUCTIONS
1. Adapt your tone and response structure specifically for the user's active page ({chat_data.current_page}).
2. Leverage the capabilities of the activated specialized sub-agents listed above.
3. Keep responses concise, highly structured, encouraging, and actionable.
4. If fallacies or weak claims are mentioned, clearly point them out and provide direct corrections.

User Query: "{chat_data.message}"
"""

        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=chat_prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
            ),
        )

        return {
            "response": response.text,
            "active_agents": active_agent_names,
            "page_context": chat_data.current_page,
            "session_id": chat_data.session_id
        }

    except Exception as e:
        print(f"❌ Chatbot Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate chat response: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)