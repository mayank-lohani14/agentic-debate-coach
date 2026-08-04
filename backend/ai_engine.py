# Author: Mayank Lohani
# Roll No: 2400320100677
# Section: CSE-21
# Description: Milestone 3 - AI Debate Simulation & Coaching Engine using LangChain, LangGraph Memory + PostgreSQL (SSE Streaming)

from fastapi import APIRouter, Form, HTTPException, Header, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Annotated, TypedDict
import os
import psycopg2
import jwt
import json
from dotenv import load_dotenv
from google import genai # For audio transcription

# LangChain & LangGraph Imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

# Import your new Milestone 3 schemas
from schemas import AIRebuttalResponse

# Load environment variables
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
# MILESTONE 3: SCORING ALGORITHM
# ---------------------------------------------------------
def calculate_overall_score(scores: dict) -> float:
    """Calculates the weighted debate performance score based on Milestone 3 requirements."""
    overall = (
        (0.30 * scores.get("argument_quality_score", 0)) +
        (0.20 * scores.get("evidence_usage_score", 0)) +
        (0.20 * scores.get("logical_consistency_score", 0)) +
        (0.15 * scores.get("rebuttal_effectiveness_score", 0)) +
        (0.15 * scores.get("communication_skills_score", 0))
    )
    return round(overall, 2)

# ---------------------------------------------------------
# SETUP AI CLIENTS
# ---------------------------------------------------------
# 1. Official Client for Audio Transcription
genai_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))

# 2. LangChain Client for Debate Engine
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite", 
    temperature=0.2, 
    api_key=os.getenv("GEMINI_API_KEY"), 
    transport="rest"                     
)

# Lock down the output using Pydantic
structured_llm = llm.with_structured_output(AIRebuttalResponse)

# ---------------------------------------------------------
# MILESTONE 3: LANGGRAPH STATE & MEMORY MANAGEMENT
# ---------------------------------------------------------
# Define the State for the Debate Graph
class DebateState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    summary: str
    debate_format: str
    difficulty: str
    latest_analysis: dict

# Node 1: Summarization (Runs if conversation gets too long)
def summarize_conversation(state: DebateState):
    summary = state.get("summary", "")
    messages = state["messages"]
    
    # Keep the last 4 messages (2 turns) raw. If less, skip summarization.
    if len(messages) <= 4:
        return {"summary": summary}
        
    summary_prompt = (
        "Summarize the debate so far. Highlight the main claims made by the human and the AI counterarguments. "
        "Keep it concise as a bulleted list."
    )
    if summary:
        summary_prompt = f"Previous summary: {summary}\n\n" + summary_prompt
        
    # Generate new summary using standard unstructured LLM
    summary_msg = llm.invoke(messages[:-2] + [HumanMessage(content=summary_prompt)])
    
    return {"summary": summary_msg.content}

# Node 2: Call the Model for the Rebuttal
def call_model(state: DebateState):
    summary = state.get("summary", "")
    format_str = state.get("debate_format", "One-on-One Debate")
    diff_str = state.get("difficulty", "Advanced")
    
    system_content = f"You are an expert AI Debate Coach acting as an opponent in a {format_str} debate. Analyze the user's argument, generate a structured counterargument, and provide actionable rewrite recommendations based on difficulty level: {diff_str}."
    
    # Add the summarized background graph to the context window
    if summary:
        system_content += f"\n\nContext/Summary of earlier debate:\n{summary}"
        
    # Send System Prompt + ONLY the last 2 messages (to prevent context limits)
    recent_messages = state["messages"][-2:]
    prompt_messages = [SystemMessage(content=system_content)] + recent_messages
    
    # Generate structured JSON response
    result = structured_llm.invoke(prompt_messages)
    
    result_dict = result.model_dump()
    result_dict["overall_performance_score"] = calculate_overall_score(result_dict)
    
    # Append the AI's rebuttal back to the state memory
    ai_reply = AIMessage(content=result_dict["counter_argument"]["rebuttal_text"])
    
    return {"messages": [ai_reply], "latest_analysis": result_dict}

# Compile the LangGraph State Machine
workflow = StateGraph(DebateState)
workflow.add_node("summarize", summarize_conversation)
workflow.add_node("call_model", call_model)

workflow.add_edge(START, "summarize")
workflow.add_edge("summarize", "call_model")
workflow.add_edge("call_model", END)

# Add persistent memory tracker
memory = MemorySaver()
debate_graph = workflow.compile(checkpointer=memory)

# ---------------------------------------------------------
# THE DEBATE TURN API ENDPOINT (SSE STREAMING IMPLEMENTATION)
# ---------------------------------------------------------
@router.post("/api/v1/debate/turn")
async def analyze_argument(
    text_argument: str = Form(""),
    debate_format: str = Form(...),
    session_id: str = Form(...),
    difficulty: str = Form("Advanced"),
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
            pass

    async def debate_event_generator():
        try:
            target_text = text_argument
            
            # Yield an initial status to the frontend
            yield f"data: {json.dumps({'type': 'status', 'message': 'Processing input...'})}\n\n"
            
            # Step 2: Handle Audio Transcription
            if audio_file:
                yield f"data: {json.dumps({'type': 'status', 'message': 'Transcribing audio...'})}\n\n"
                audio_bytes = await audio_file.read()
                temp_filename = f"temp_{session_id}_{audio_file.filename}"
                with open(temp_filename, "wb") as f:
                    f.write(audio_bytes)
                
                try:
                    uploaded_file = genai_client.files.upload(file=temp_filename)
                    transcription_prompt = "Transcribe the exact speech from this audio file accurately for a debate analysis."
                    transcript_response = genai_client.models.generate_content(
                        model='gemini-3.1-flash-lite',
                        contents=[uploaded_file, transcription_prompt]
                    )
                    if transcript_response.text:
                        target_text = transcript_response.text
                finally:
                    if os.path.exists(temp_filename):
                        os.remove(temp_filename)

            if not target_text or not target_text.strip():
                yield f"data: {json.dumps({'type': 'error', 'message': 'No argument text or speech transcript provided.'})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'transcript', 'text': target_text})}\n\n"
            yield f"data: {json.dumps({'type': 'status', 'message': 'Generating AI Rebuttal...'})}\n\n"

            # Step 3: Execute the LangGraph State Machine pipeline with streaming
            config = {"configurable": {"thread_id": session_id}}
            input_state = {
                "messages": [HumanMessage(content=target_text)],
                "debate_format": debate_format,
                "difficulty": difficulty
            }
            
            final_analysis = None

            # astream_events captures the raw tokens as they are generated by the model
            async for event in debate_graph.astream_events(input_state, config=config, version="v2"):
                kind = event["event"]
                
                # Stream the raw JSON chunks word-by-word to the frontend
                if kind == "on_chat_model_stream":
                    content = event["data"]["chunk"].content
                    if content:
                        yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
                
                # Capture the final parsed Pydantic object once generation is complete
                elif kind == "on_chain_end" and event["name"] == "call_model":
                    final_analysis = event["data"]["output"]["latest_analysis"]

            if not final_analysis:
                raise Exception("Failed to generate analysis.")

            # Step 4: Save results to PostgreSQL
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO debate_turns 
                (email, session_id, debate_format, user_transcript, clarity, relevance, evidence_strength, logical_consistency, persuasiveness, ai_rebuttal)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                user_email,
                session_id,
                debate_format,
                target_text,
                final_analysis.get("communication_skills_score", 0), 
                final_analysis.get("argument_quality_score", 0),     
                final_analysis.get("evidence_usage_score", 0),       
                final_analysis.get("logical_consistency_score", 0),  
                final_analysis.get("rebuttal_effectiveness_score", 0),
                final_analysis["counter_argument"]["rebuttal_text"]   
            ))
            
            conn.commit()
            cursor.close()
            conn.close()

            # Step 5: Send the final payload to the frontend to render the charts and scores
            final_analysis["user_transcript"] = target_text
            yield f"data: {json.dumps({'type': 'final', 'data': final_analysis})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            print(f"Error processing debate turn: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    # Return the generator as a StreamingResponse
    return StreamingResponse(debate_event_generator(), media_type="text/event-stream")