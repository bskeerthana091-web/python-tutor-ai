import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from database import Submission, PlagiarismAlert, Student
import datetime

embedder = None
try:
    embedder = SentenceTransformer('all-MiniLM-L6-v2', local_files_only=True)
except Exception:
    try:
        embedder = SentenceTransformer('all-MiniLM-L6-v2')
    except Exception as e:
        print("Warning: Could not connect to HuggingFace Hub for SentenceTransformer. Using local hash embedding fallback.", e)

def cosine_similarity(v1, v2):
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def get_embedding(code: str):
    if embedder is not None:
        try:
            return embedder.encode([code])[0]
        except Exception:
            pass
    # Fallback deterministic pseudo-embedding vector (length 384)
    vector = np.zeros(384)
    for idx, char in enumerate(code[:384]):
        vector[idx % 384] += ord(char)
    norm = np.linalg.norm(vector)
    return vector / norm if norm > 0 else vector

class PlagiarismDetector:
    def __init__(self, db: Session, ai_model_inference=None):
        self.db = db
        self.ai_model_inference = ai_model_inference
        
    def check_submission(self, student_id: int, code: str, time_spent: int):
        current_embedding = get_embedding(code)
        
        # Layer 3: Compare against all recent submissions in database
        # In a production environment with many users, we would use a vector DB like pgvector or Pinecone.
        recent_submissions = self.db.query(Submission).filter(Submission.student_id != student_id).order_by(Submission.timestamp.desc()).limit(100).all()
        
        highest_similarity = 0
        source_student = None
        
        for sub in recent_submissions:
            if not sub.embedding:
                continue
                
            sub_embedding = np.array(json.loads(sub.embedding))
            
            # Layer 1: Semantic Embedding Similarity
            similarity = cosine_similarity(current_embedding, sub_embedding)
            
            if similarity > highest_similarity:
                highest_similarity = similarity
                source_student = sub.student_id
                
        is_plagiarized = False
        
        # Threshold requested: 90%
        if highest_similarity >= 0.90:
            is_plagiarized = True
            
            # Layer 4: Behavior check (e.g. solved a hard problem in under 5 seconds)
            if time_spent < 5:
                # Highly suspicious
                highest_similarity = min(1.0, highest_similarity + 0.05)
                
            # Layer 2: Send to AI for logic check (Simulated for this implementation since seq2seq is QA)
            # if self.ai_model_inference:
            #     prompt = f"Are these two codes logically identical?\nCode1: {code}\nCode2: {source_code}"
            #     ai_verdict = self.ai_model_inference(prompt)
            #     if 'yes' in ai_verdict.lower():
            #         is_plagiarized = True
                    
            # Record Alert
            alert = PlagiarismAlert(
                student_id=student_id,
                source_student_id=source_student,
                similarity_score=highest_similarity,
                timestamp=datetime.datetime.utcnow()
            )
            self.db.add(alert)
            
            # Deduct XP
            student = self.db.query(Student).filter(Student.id == student_id).first()
            if student:
                student.xp_points = max(0, student.xp_points - 50)
                
            self.db.commit()
            
        return is_plagiarized, highest_similarity
