# Author: Mayank Lohani
# Roll No: 2400320100677
# Section: CSE-21
# Description: Milestone 2 - Argument Analysis & Fallacy Detection using LangChain + PostgreSQL

from fastapi import APIRouter, Form, HTTPException, Header, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import psycopg2
import jwt
from dotenv import load_dotenv

# LangChain Imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

# Load environment variables (like GOOGLE_API_KEY)
load_dotenv()

router = APIRouter()

# ---------------------------------------------------------
# DATABASE & JWT CONFIGURATION
# ---------------------------------------------------------
DB_HOST = "localhost"
DB_NAME = "debate_db"
DB_USER = "postgres"
DB_PASSWORD = "Mayank123"
DB_PORT = 5432

SECRET_KEY = "your-super-secret-production-key-here"
ALGORITHM = "HS256"

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )

# ---------------------------------------------------------
# 1. PYDANTIC SCHEMAS (For LangChain Output)
# ---------------------------------------------------------
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

# ---------------------------------------------------------
# 2. LANGCHAIN SETUP
# ---------------------------------------------------------
# ---------------------------------------------------------
# 2. LANGCHAIN SETUP
# ---------------------------------------------------------
parser = PydanticOutputParser(pydantic_object=ArgumentAnalysisResult)

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite", 
    temperature=0.2, 
api_key = os.getenv("GOOGLE_API_KEY")
)
template = """
You are an expert AI Debate Coach evaluating a user's argument in a {debate_format}.

Evaluate the following argument based on these specific criteria: Clarity, Relevance, Evidence Strength, Logical Consistency, and Persuasiveness.
Also, scan the argument for the following logical fallacies: Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring.

User Argument:
"{user_argument}"

{format_instructions}
"""

prompt = PromptTemplate(
    template=template,
    input_variables=["debate_format", "user_argument"],
    partial_variables={"format_instructions": parser.get_format_instructions()}
)

analysis_chain = prompt | llm | parser

# ---------------------------------------------------------
# 3. THE DEBATE TURN API ENDPOINT
# ---------------------------------------------------------
@router.post("/api/v1/debate/turn")
async def analyze_argument(
    text_argument: str = Form(""),
    debate_format: str = Form(...),
    session_id: str = Form(...),
    duration: Optional[str] = Form("0"),
    audio_file: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None)
):
    # Step 1: Extract the user email from the JWT Token
    user_email = "anonymous"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub", "anonymous")
        except jwt.PyJWTError:
            user_email = "anonymous"

    try:
        # Step 2: Execute the LangChain pipeline to analyze the text
        target_text = text_argument
        
        result = analysis_chain.invoke({
            "debate_format": debate_format,
            "user_argument": target_text
        })
        
        # Convert Pydantic object to a standard Python dictionary
        result_dict = result.model_dump()

        # Step 3: Save the LangChain results to PostgreSQL
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

        # Step 4: Add the original text transcript back into the final JSON response for the frontend
        result_dict["user_transcript"] = target_text

        return result_dict

    except Exception as e:
        print(f"LangChain / DB Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze argument and save to database.")