import os
import uuid
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from backend.database import get_session
from backend.models import Submission, Assignment, User, UserRole, SchoolClass
from backend.schemas.lms import SubmissionRead, SubmissionUpdate
from backend.dependencies import get_current_user

router = APIRouter(prefix="/submissions", tags=["Submissions (Pengumpulan Tugas)"])

# Config
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "txt", "jpg", "png", "zip", "rar"} # Boleh zip/rar untuk tugas
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
SUBMISSIONS_DIR = Path(__file__).parent.parent / "static" / "submissions"
SUBMISSIONS_DIR.mkdir(parents=True, exist_ok=True)

def validate_file(file: UploadFile) -> str:
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    return extension

@router.post("/upload/{assignment_id}", response_model=SubmissionRead, status_code=status.HTTP_201_CREATED)
async def upload_submission(
    assignment_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Validation
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    
    # 2. Check if user is student
    if current_user.role != UserRole.student.value:
         # Optional: Admin/Teacher testing mode
         pass 

    # 3. Check Deadline
    if datetime.utcnow() > assignment.due_date:
        # Late submission logic? Or block?
        # For now, just accept but maybe mark as late (not implemented yet)
        pass 
        
    # 4. Check if already submitted? (One submission per assignment per student)
    existing = session.exec(select(Submission).where(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    )).first()
    
    if existing:
        # Update existing submission? Or block?
        # Let's block for simplicity, require delete first.
        # Or simpler: Update the file.
        # Let's DELETE the old file and generic replace record
        # For MVP: Return error "Already submitted"
        raise HTTPException(status_code=400, detail="Anda sudah mengumpulkan tugas ini.")

    # 5. Save File
    extension = validate_file(file)
    unique_filename = f"{current_user.id}_{assignment_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{extension}"
    file_path = SUBMISSIONS_DIR / unique_filename
    
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
             raise HTTPException(status_code=400, detail="File too large (Max 20MB)")
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        
    file_url = f"/static/submissions/{unique_filename}"
    
    # 6. Save DB
    submission = Submission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        file_url=file_url
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)
    
    return SubmissionRead(
        id=submission.id,
        assignment_id=submission.assignment_id,
        student_id=submission.student_id,
        student_name=current_user.name,
        file_url=submission.file_url,
        submitted_at=submission.submitted_at,
        grade=submission.grade,
        feedback=submission.feedback
    )

@router.get("/assignment/{assignment_id}", response_model=List[SubmissionRead])
def get_submissions_by_assignment(
    assignment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Permission: Teacher of the class/subject, or Admin
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
        
    # Check simple permission
    if current_user.role == UserRole.student.value:
        # Student can only see THEIR OWN submission
        submissions = session.exec(select(Submission).where(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id
        ).options(selectinload(Submission.student))).all()
    else:
        # Teacher/Admin see all
        # Ideally check if teacher teaches this class, but basic role check for now
        submissions = session.exec(select(Submission).where(
            Submission.assignment_id == assignment_id
        ).options(selectinload(Submission.student))).all()
        
    return [
        SubmissionRead(
            id=s.id,
            assignment_id=s.assignment_id,
            student_id=s.student_id,
            student_name=s.student.name if s.student else "Unknown",
            file_url=s.file_url,
            submitted_at=s.submitted_at,
            grade=s.grade,
            feedback=s.feedback
        ) for s in submissions
    ]

@router.put("/{id}/grade", response_model=SubmissionRead)
def grade_submission(
    id: int,
    data: SubmissionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.admin.value, UserRole.principal.value, UserRole.teacher.value]:
        raise HTTPException(status_code=403, detail="Hanya Guru yang bisa menilai.")
        
    submission = session.get(Submission, id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # SECURITY: Validasi kepemilikan tugas
    # Guru hanya bisa menilai tugas yang DIA buat, bukan tugas guru lain
    if current_user.role == UserRole.teacher.value:
        assignment = session.get(Assignment, submission.assignment_id)
        if assignment and assignment.teacher_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Anda hanya bisa menilai tugas yang Anda buat sendiri."
            )
        
    submission.grade = data.grade
    submission.feedback = data.feedback
    session.add(submission)
    session.commit()
    session.refresh(submission)
    
    # Reload student for response
    # We need to manually load or fetch again
    student_name = "Unknown"
    if submission.student_id:
        st = session.get(User, submission.student_id)
        if st: student_name = st.name

    return SubmissionRead(
        id=submission.id,
        assignment_id=submission.assignment_id,
        student_id=submission.student_id,
        student_name=student_name,
        file_url=submission.file_url,
        submitted_at=submission.submitted_at,
        grade=submission.grade,
        feedback=submission.feedback
    )
