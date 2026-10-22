from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import os

# Use SQLite for a zero-setup local database instead of PostgreSQL
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'python_tutor.db')}"

# SQLite needs check_same_thread=False for FastAPI
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    level = Column(String, default="Newbie")
    xp_points = Column(Integer, default=0)
    badges = Column(String, default="")  # Comma separated
    streak_days = Column(Integer, default=0)
    last_login = Column(DateTime, default=datetime.datetime.utcnow)
    
    submissions = relationship("Submission", back_populates="student")
    progress = relationship("Progress", back_populates="student")

class Progress(Base):
    __tablename__ = "progress"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    topic = Column(String)
    score = Column(Float)
    time_spent = Column(Integer)  # in seconds
    mistakes = Column(Integer)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="progress")

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    code = Column(String)
    output = Column(String)
    error = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    embedding = Column(String)  # JSON serialized vector
    
    student = relationship("Student", back_populates="submissions")

class PlagiarismAlert(Base):
    __tablename__ = "plagiarism_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    source_student_id = Column(Integer, ForeignKey("students.id"))
    similarity_score = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class CompletedChallenge(Base):
    __tablename__ = "completed_challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    challenge_id = Column(Integer)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
