from typing import List, Optional
from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlmodel import Session

from backend.database import get_session
from backend.models import User
from backend.schemas.lms import AssignmentRead
from backend.dependencies import get_current_user
from backend.services.assignment_service import assignment_service

router = APIRouter(prefix="/assignments", tags=["Assignments (Tugas)"])

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
    assignment = await assignment_service.create_assignment(
        session, current_user, title, description, due_date, subject_id, class_id, file
    )

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
    results = assignment_service.get_assignments(session, current_user, class_id, subject_id)
    
    # Mapper manual (seperti sebelumnya)
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
    assignment_service.delete_assignment(session, current_user, id)
    return None
