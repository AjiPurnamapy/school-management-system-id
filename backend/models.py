from datetime import datetime
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Integer, ForeignKey


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
    teaching_schedules: List["Schedule"] = Relationship(back_populates="teacher")

class SchoolClass(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, index=True)  # Contoh: "X-RPL-1"
    grade_level: int = Field(default=10)  # 10, 11, atau 12
    academic_year: str = Field(max_length=20, default="2024/2025")  # Tahun Ajaran
    
    # Wali Kelas (Guru yang bertanggung jawab atas kelas ini)
    # Optional karena kelas baru mungkin belum ada wali kelasnya
    wali_kelas_id: Optional[int] = Field(default=None, foreign_key="user.id")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    schedules: List["Schedule"] = Relationship(back_populates="school_class")


class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title   : str = Field(max_length=100)
    content: str = Field(max_length=10000)
    # Gunakan ondelete="CASCADE" via sa_column agar aman
    owner_id: Optional[int] = Field(default=None, sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True))
    
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
    owner_id: Optional[int] = Field(default=None, sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relasi Balik
    owner: Optional[User] = Relationship(back_populates="files")

class Subject(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, index=True) # e.g. "Matematika"
    code: str = Field(max_length=20, unique=True, index=True) # e.g. "MTK-10"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    schedules: List["Schedule"] = Relationship(back_populates="subject")

class DayEnum(str, Enum):
    SENIN = "Senin"
    SELASA = "Selasa"
    RABU = "Rabu"
    KAMIS = "Kamis"
    JUMAT = "Jumat"
    SABTU = "Sabtu"

class Schedule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    class_id: int = Field(foreign_key="schoolclass.id", index=True)
    subject_id: int = Field(foreign_key="subject.id", index=True)
    teacher_id: int = Field(foreign_key="user.id", index=True)
    
    # Relationships -> Enable Eager Loading / Joins
    school_class: Optional["SchoolClass"] = Relationship(back_populates="schedules")
    subject: Optional["Subject"] = Relationship(back_populates="schedules")
    teacher: Optional["User"] = Relationship(back_populates="teaching_schedules")

    # Waktu
    day: DayEnum
    start_time: str = Field(max_length=5) # Format "HH:MM" e.g "07:00"
    end_time: str = Field(max_length=5)   # Format "HH:MM" e.g "08:30"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)