from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ClassCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, examples=["X-RPL-1"])
    grade_level: int = Field(default=10, ge=1, le=12)  # ge = greater equal, le = less equal
    academic_year: str = Field(default="2024/2025", max_length=20)
    wali_kelas_id: Optional[int] = None


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    grade_level: Optional[int] = Field(None, ge=1, le=12)
    academic_year: Optional[str] = Field(None, max_length=20)
    wali_kelas_id: Optional[int] = None


class ClassRead(BaseModel):
    """Schema untuk response membaca data kelas."""
    model_config = ConfigDict(from_attributes=True)  # Pydantic V2 style
    
    id: int
    name: str
    grade_level: int
    academic_year: str
    wali_kelas_id: Optional[int] = None


class AssignStudentRequest(BaseModel):
    """
    Schema untuk memasukkan siswa ke dalam kelas.
    
    Field:
    - user_id : ID siswa yang akan dimasukkan
    - class_id: ID kelas tujuan
    """
    user_id: int
    class_id: int
