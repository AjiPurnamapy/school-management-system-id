from typing import Optional
from sqlmodel import SQLModel

class SubjectBase(SQLModel):
    name: str
    code: str

class SubjectCreate(SubjectBase):
    pass

class SubjectRead(SubjectBase):
    id: int

class SubjectUpdate(SQLModel):
    name: Optional[str] = None
    code: Optional[str] = None
