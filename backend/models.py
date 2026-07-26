from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from database import Base

class UserRole(enum.Enum):
    LEARNER = "Learner"
    DEBATE_COACH = "Debate Coach"
    EDUCATOR = "Educator"
    ADMINISTRATOR = "Administrator"

# Update your User model in models.py
class User(Base):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    # Use String instead of Enum
    role = Column(String, default="Learner", nullable=False)
    
    profile = relationship("UserProfile", back_populates="owner", uselist=False)
    sessions = relationship("DebateSession", back_populates="creator")
    skills = relationship("SkillTracking", back_populates="user")

class UserProfile(Base):
    __tablename__ = 'user_profiles'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    experience_level = Column(String, default="Beginner") 
    preferred_topics = Column(String, default="General") 
    learning_goals = Column(String, default="Improve reasoning")   
    
    owner = relationship("User", back_populates="profile")

class DebateTopic(Base):
    __tablename__ = 'debate_topics'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String)
    description = Column(Text)

class DebateSession(Base):
    __tablename__ = 'debate_sessions'
    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey('users.id'))
    topic_id = Column(Integer, ForeignKey('debate_topics.id'), nullable=True)
    topic_title = Column(String, nullable=False) 
    format = Column(String) 
    scheduled_time = Column(DateTime, default=datetime.utcnow) 
    
    creator = relationship("User", back_populates="sessions")

class SkillTracking(Base):
    __tablename__ = 'skill_tracking'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    logical_consistency_score = Column(Float, default=0.0)
    rebuttal_strength_score = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="skills")