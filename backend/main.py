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
        
        # Convert RealDictCursor rows to standard Python dictionaries
        history = [dict(row) for row in rows]
        
        # Format timestamps to ISO strings for frontend parsing
        for item in history:
            if item.get("timestamp"):
                item["timestamp"] = item["timestamp"].isoformat()

        return {"history": history}

    except Exception as e:
        print(f"❌ History Fetch Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not fetch history")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)