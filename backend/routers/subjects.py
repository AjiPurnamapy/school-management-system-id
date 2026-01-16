"""
=============================================================================
                    ROUTERS/SUBJECTS.PY - MANAJEMEN MATA PELAJARAN
=============================================================================
Router ini menangani CRUD untuk Mata Pelajaran (Subject).
Menggunakan custom exceptions untuk error handling yang konsisten.
=============================================================================
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import Subject, User
from backend.schemas.subject import SubjectCreate, SubjectRead, SubjectUpdate
from backend.dependencies import get_current_user
from backend.permissions import require_admin
from backend.exceptions import NotFoundError, ConflictError

router = APIRouter(prefix="/subjects", tags=["Subjects (Mapel)"])


@router.get("/", response_model=List[SubjectRead])
def get_subjects(
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    """Mengambil semua mata pelajaran."""
    return session.exec(select(Subject)).all()


@router.post("/", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject: SubjectCreate, 
    session: Session = Depends(get_session), 
    admin: User = Depends(require_admin)
):
    """
    Membuat mata pelajaran baru.
    
    Validasi:
    - Kode mata pelajaran harus unik
    """
    # Check duplicate code
    existing = session.exec(select(Subject).where(Subject.code == subject.code)).first()
    if existing:
        raise ConflictError(f"Kode mata pelajaran '{subject.code}' sudah digunakan.")
        
    db_subject = Subject.model_validate(subject)
    session.add(db_subject)
    session.commit()
    session.refresh(db_subject)
    return db_subject


@router.put("/{subject_id}", response_model=SubjectRead)
def update_subject(
    subject_id: int, 
    subject_data: SubjectUpdate, 
    session: Session = Depends(get_session), 
    admin: User = Depends(require_admin)
):
    """Update data mata pelajaran."""
    db_subject = session.get(Subject, subject_id)
    if not db_subject:
        raise NotFoundError("Mata pelajaran", subject_id)
        
    subject_dict = subject_data.model_dump(exclude_unset=True)
    for key, value in subject_dict.items():
        setattr(db_subject, key, value)
        
    session.add(db_subject)
    session.commit()
    session.refresh(db_subject)
    return db_subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int, 
    session: Session = Depends(get_session), 
    admin: User = Depends(require_admin)
):
    """Menghapus mata pelajaran."""
    db_subject = session.get(Subject, subject_id)
    if not db_subject:
        raise NotFoundError("Mata pelajaran", subject_id)
        
    session.delete(db_subject)
    session.commit()
    return None

