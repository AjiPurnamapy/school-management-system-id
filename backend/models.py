from datetime import datetime
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship


class UserRole(str, Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email    : str = Field(unique=True, index=True, max_length=100)
    name     : str = Field(unique=True, index=True, max_length=50)
    age      : int
    password : str = Field(max_length=128)
    is_active: bool = Field(default=False)
    profile_image: Optional[str] = Field(default=None)
    
    # Role: Menentukan hak akses user (default: siswa)
    role: str = Field(default=UserRole.student.value, max_length=20)
    
    # Relasi: Siswa bisa masuk ke 1 Kelas (Optional karena Guru tidak punya kelas)
    class_id: Optional[int] = Field(default=None, foreign_key="schoolclass.id", index=True)

    # RELASI CASCADE DELETE (Hapus User = Hapus Data)
    notes: List["Note"] = Relationship(back_populates="owner", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    files: List["UserFile"] = Relationship(back_populates="owner", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class SchoolClass(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, index=True)  # Contoh: "X-RPL-1"
    grade_level: int = Field(default=10)  # 10, 11, atau 12
    academic_year: str = Field(max_length=20, default="2024/2025")  # Tahun Ajaran
    
    # Wali Kelas (Guru yang bertanggung jawab atas kelas ini)
    # Optional karena kelas baru mungkin belum ada wali kelasnya
    wali_kelas_id: Optional[int] = Field(default=None, foreign_key="user.id")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title   : str = Field(max_length=100)
    content: str = Field(max_length=10000)
    owner_id: Optional[int] = Field(foreign_key="user.id", index=True)
    
    # Penanda Waktu (untuk fitur sorting)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relasi Balik
    owner: Optional[User] = Relationship(back_populates="notes")


class UserFile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(max_length=255)
    file_url: str = Field(max_length=500)
    file_type: str = Field(max_length=50)  # pdf, image, docx
    owner_id: Optional[int] = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relasi Balik
    owner: Optional[User] = Relationship(back_populates="files")