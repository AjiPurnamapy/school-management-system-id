import os
import uuid
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from backend.database import get_session
from backend.models import Assignment, SchoolClass, Subject, User, UserRole
from backend.schemas.lms import AssignmentRead
from backend.dependencies import get_current_user

router = APIRouter(prefix="/assignments", tags=["Assignments (Tugas)"])

# Config
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "ppt", "pptx", "txt", "jpg", "png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MATERIALS_DIR = Path(__file__).parent.parent / "static" / "assignments" # Separate folder
MATERIALS_DIR.mkdir(parents=True, exist_ok=True)

def validate_file(file: UploadFile) -> str:
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    return extension

@router.post("/", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    title: str = Form(..., max_length=200),
    description: str = Form(..., max_length=5000),
    due_date: str = Form(..., description="ISO Format YYYY-MM-DD HH:MM"),
    subject_id: int = Form(...),
    class_id: int = Form(...),
    file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Permission Check
    if current_user.role not in [UserRole.admin.value, UserRole.principal.value, UserRole.teacher.value]:
        raise HTTPException(status_code=403, detail="Hanya Guru/Admin yang bisa membuat tugas.")
    
    # 2. Validate IDs
    if not session.get(Subject, subject_id):
        raise HTTPException(status_code=404, detail="Subject not found")
    if not session.get(SchoolClass, class_id):
        raise HTTPException(status_code=404, detail="Class not found")
        
    # 3. Handle File Upload
    file_url = None
    if file:
        extension = validate_file(file)
        unique_filename = f"{uuid.uuid4().hex}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{extension}"
        file_path = MATERIALS_DIR / unique_filename
        
        try:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                 raise HTTPException(status_code=400, detail="File too large (Max 10MB)")
            with open(file_path, "wb") as f:
                f.write(content)
            file_url = f"/static/assignments/{unique_filename}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    # 4. Parse Date
    try:
        # Expecting string from frontend, need to parse to datetime
        # Frontend should send ISO string or specific format
        due_date_dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")

    # 5. Save to DB
    assignment = Assignment(
        title=title,
        description=description,
        due_date=due_date_dt,
        subject_id=subject_id,
        class_id=class_id,
        teacher_id=current_user.id,
        file_url=file_url
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    
    # Eager load for response
    # We can fetch again or just construct response manually if we have data,
    # but `refresh` only reloads attributes on the object. Relations might need loading.
    # Simpler to re-query for safety or use lazy loading (SQLModel usually lazy loads but async needs care)
    # Getting attributes like assignment.subject.name might trigger DB call.
    
    # Explicit query to be safe
    statement = select(Assignment).where(Assignment.id == assignment.id).options(
        selectinload(Assignment.subject),
        selectinload(Assignment.school_class),
        selectinload(Assignment.teacher)
    )
    assignment = session.exec(statement).first()

    return AssignmentRead(
        id=assignment.id,
        title=assignment.title,
        description=assignment.description,
        due_date=assignment.due_date,
        created_at=assignment.created_at,
        file_url=assignment.file_url,
        subject_name=assignment.subject.name,
        class_name=assignment.school_class.name,
        teacher_name=assignment.teacher.name
    )

@router.get("/", response_model=List[AssignmentRead])
def get_assignments(
    class_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    query = select(Assignment).options(
        selectinload(Assignment.subject),
        selectinload(Assignment.school_class),
        selectinload(Assignment.teacher)
    ).order_by(Assignment.created_at.desc())
    
    if class_id:
        query = query.where(Assignment.class_id == class_id)
    if subject_id:
        query = query.where(Assignment.subject_id == subject_id)
        
    # SECURITY: Siswa hanya bisa lihat tugas dari kelasnya sendiri
    # Ini mencegah kebocoran data antar kelas
    if current_user.role == UserRole.student.value:
        if current_user.class_id is None:
            # Siswa tanpa kelas tidak bisa lihat tugas apapun
            return []
        query = query.where(Assignment.class_id == current_user.class_id)
        
    results = session.exec(query).all()
    
    return [
        AssignmentRead(
            id=a.id,
            title=a.title,
            description=a.description,
            due_date=a.due_date,
            created_at=a.created_at,
            file_url=a.file_url,
            subject_name=a.subject.name,
            class_name=a.school_class.name,
            teacher_name=a.teacher.name
        ) for a in results
    ]

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    assignment = session.get(Assignment, id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
        
    if current_user.role != UserRole.admin.value and assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this assignment")
        
    # Delete file if exists
    if assignment.file_url:
        try:
            fname = assignment.file_url.split("/")[-1]
            fpath = MATERIALS_DIR / fname
            if fpath.exists():
                fpath.unlink()
        except Exception as e:
            # LOGGING: Jangan silent fail, log errornya untuk debugging
            import logging
            logging.warning(f"Gagal hapus file tugas: {e}")
            
    session.delete(assignment)
    session.commit()
    return None
