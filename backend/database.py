from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from pymongo import MongoClient

# Establish connection to your local MongoDB instance
client = MongoClient("mongodb://localhost:27017/")
db = client["debate_coach_db"]
sessions_collection = db["sessions"]

def save_session_to_db(session_data):
    # Inserts the debate turn into the 'sessions' collection
    return sessions_collection.insert_one(session_data).inserted_id

# IMPORTANT: Replace 'YOUR_PASSWORD' with the actual password you created for PostgreSQL in pgAdmin
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Mayank123@localhost:5432/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()