from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel

# =======================
# ASSIGNMENT SCHEMAS
# =======================

class AssignmentRead(SQLModel):
    id: int
    title: str
    description: str
    due_date: datetime
    created_at: datetime
    file_url: Optional[str] = None
    
    # Context Names (Enriched)
    subject_name: str
    class_name: str
    teacher_name: str
    
    # Status (untuk siswa) - Computed dynamically later
    # is_submitted: bool = False  
    # grade: Optional[int] = None

class AssignmentCreate(SQLModel):
    # Digunakan jika JSON body (tapi endpoint create pakai Form data)
    title: str
    description: str
    due_date: datetime
    subject_id: int
    class_id: int


# =======================
# SUBMISSION SCHEMAS
# =======================

class SubmissionRead(SQLModel):
    id: int
    assignment_id: int
    student_id: int
    student_name: str
    file_url: str
    submitted_at: datetime
    grade: Optional[int] = None
    feedback: Optional[str] = None

class SubmissionUpdate(SQLModel):
    # Untuk guru input nilai
    grade: int
    feedback: Optional[str] = None
