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

# 3. THEN include the router
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
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        
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

class Fallacy(BaseModel):
    fallacy_name: str = Field(description="Name of the fallacy (e.g., Ad Hominem, Straw Man, Slippery Slope)")
    quote: str = Field(description="The exact quote from the user demonstrating the fallacy")
    explanation: str = Field(description="Why this is a logical fallacy")
    correction_suggestion: str = Field(description="How to fix the argument")

class EvaluationScores(BaseModel):
    clarity: int = Field(description="Score out of 100 for Clarity")
    relevance: int = Field(description="Score out of 100 for Relevance")
    evidence_strength: int = Field(description="Score out of 100 for Evidence Strength")
    logical_consistency: int = Field(description="Score out of 100 for Logical Consistency")
    persuasiveness: int = Field(description="Score out of 100 for Persuasiveness")

class ArgumentAnalysisResult(BaseModel):
    core_claim: str = Field(description="The main point the user is trying to make")
    supporting_evidence: List[str] = Field(description="List of evidence provided by the user")
    scores: EvaluationScores = Field(description="The 5 evaluation criteria scores")
    fallacies_detected: List[Fallacy] = Field(description="List of detected fallacies. Empty if none.")
    ai_rebuttal: str = Field(description="A short, logical counterargument based on the debate format")

# UPDATED: Added current_page and user_role to the ChatMessage schema
class ChatMessage(BaseModel):
    message: str
    current_page: str = Field(default="dashboard", description="The current active tab/page in the frontend")
    user_role: str = Field(default="Learner", description="Role of the user")
    session_id: Optional[str] = "default_session"

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
# 6. DEBATE TURN ANALYSIS API ENDPOINT (AUDIO/TEXT + GEMINI + POSTGRES)
# ---------------------------------------------------------
@app.post("/api/v1/debate/turn")
async def analyze_debate_turn(
    text_argument: Optional[str] = Form(""),
    debate_format: str = Form(...),
    session_id: str = Form(...),
    duration: Optional[str] = Form("0"),
    audio_file: Optional[UploadFile] = File(None),
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

    target_text = text_argument

    try:
        if audio_file:
            audio_bytes = await audio_file.read()
            temp_filename = f"temp_{session_id}_{audio_file.filename}"
            with open(temp_filename, "wb") as f:
                f.write(audio_bytes)
            
            try:
                uploaded_file = client.files.upload(file=temp_filename)
                transcription_prompt = "Transcribe the exact speech from this audio file accurately for a debate analysis."
                transcript_response = client.models.generate_content(
                    model='gemini-3.1-flash-lite',
                    contents=[uploaded_file, transcription_prompt]
                )
                if transcript_response.text:
                    target_text = transcript_response.text
            finally:
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)

        if not target_text or not target_text.strip():
            raise HTTPException(status_code=400, detail="No argument text or speech transcript provided.")

        prompt_text = f"""
You are an expert AI Debate Coach evaluating a user's argument in a {debate_format}.

Evaluate the following argument based on these specific criteria: Clarity, Relevance, Evidence Strength, Logical Consistency, and Persuasiveness (scored out of 100).
Also, scan the argument for logical fallacies (e.g., Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring).

User Argument:
"{target_text}"
"""

        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt_text,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ArgumentAnalysisResult,
                temperature=0.2,
            ),
        )

        result_dict = json.loads(response.text)

        conn = get_db_connection()
        cursor = conn.cursor()
        
        scores = result_dict.get("scores", {})
        
        cursor.execute('''
            INSERT INTO debate_turns 
            (email, session_id, debate_format, user_transcript, clarity, relevance, evidence_strength, logical_consistency, persuasiveness, ai_rebuttal)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            user_email,
            session_id,
            debate_format,
            target_text,
            scores.get("clarity", 0),
            scores.get("relevance", 0),
            scores.get("evidence_strength", 0),
            scores.get("logical_consistency", 0),
            scores.get("persuasiveness", 0),
            result_dict.get("ai_rebuttal", "")
        ))
        
        conn.commit()
        cursor.close()
        conn.close()

        result_dict["user_transcript"] = target_text
        return result_dict

    except Exception as e:
        print(f"❌ Debate Turn Analysis Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze argument: {str(e)}")

# ---------------------------------------------------------
# 7. FETCH HISTORY ENDPOINT (POSTGRESQL)
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
            SELECT debate_format, clarity, relevance, evidence_strength, logical_consistency, persuasiveness, timestamp
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
# 8. AI COACH CHATBOT ENDPOINT (AGENTIC ORCHESTRATOR)
# ---------------------------------------------------------
# Master Agent Directory Definitions
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

# Mapping frontend active tabs/pages to agent execution pipelines
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
        # Determine active agents based on current page
        active_agent_names = PAGE_ROUTING_CONFIG.get(chat_data.current_page, ["Orchestrator Agent"])
        
        agent_instructions = "\n".join([
            f"- **{agent}**: {AGENT_DEFINITIONS[agent]}" 
            for agent in active_agent_names if agent in AGENT_DEFINITIONS
        ])

        # Construct Agentic Orchestrator System Prompt
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