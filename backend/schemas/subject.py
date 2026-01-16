from typing import Optional
from sqlmodel import SQLModel

class SubjectBase(SQLModel):
    name: str
    code: str
    teacher_id: Optional[int] = None # Guru Pengampu Utama

class SubjectCreate(SubjectBase):
    pass

class SubjectRead(SubjectBase):
    id: int

class SubjectUpdate(SQLModel):
    name: Optional[str] = None
    code: Optional[str] = None
    teacher_id: Optional[int] = None
