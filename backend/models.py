from datetime import datetime
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Integer, ForeignKey, Index


class UserRole(str, Enum):
    """
    Hierarki Role:
    - admin     : Super admin (IT/System) - Full akses sistem
    - principal : Kepala Sekolah - Manajemen akademik (kelas, wali kelas, jadwal)
    - teacher   : Guru - Mengajar, upload materi, input nilai
    - student   : Siswa - Lihat materi, kumpul tugas
    """
    admin = "admin"
    principal = "principal"  # NEW: Kepala Sekolah
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
    
    # Profile Data (wajib diisi setelah registrasi)
    nis: Optional[str] = Field(default=None, max_length=20, index=True)  # NIS/NIP
    address: Optional[str] = Field(default=None, max_length=500)
    phone: Optional[str] = Field(default=None, max_length=20)
    birth_date: Optional[str] = Field(default=None, max_length=10)  # Format: YYYY-MM-DD
    is_profile_complete: bool = Field(default=False)  # Flag untuk cek profil sudah lengkap

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
    
    # Guru Pengampu Utama (Koordinator Mapel)
    teacher_id: Optional[int] = Field(default=None, foreign_key="user.id")
    
    # Relasi
    teacher: Optional["User"] = Relationship()
    schedules: List["Schedule"] = Relationship(back_populates="subject")

class DayEnum(str, Enum):
    SENIN = "Senin"
    SELASA = "Selasa"
    RABU = "Rabu"
    KAMIS = "Kamis"
    JUMAT = "Jumat"
    SABTU = "Sabtu"

class Schedule(SQLModel, table=True):
    """
    Jadwal Pelajaran per Kelas.
    
    Index Strategy:
    - idx_schedule_class_day: Composite index untuk query jadwal per kelas per hari
      Query pattern: SELECT * FROM schedule WHERE class_id=? AND day=?
    - idx_schedule_teacher_day: Untuk cek konflik jadwal guru
      Query pattern: SELECT * FROM schedule WHERE teacher_id=? AND day=?
    """
    # Composite Indexes untuk optimasi query
    __table_args__ = (
        # Index untuk query jadwal per kelas per hari (paling sering dipakai)
        Index('idx_schedule_class_day', 'class_id', 'day'),
        # Index untuk cek konflik jadwal guru
        Index('idx_schedule_teacher_day', 'teacher_id', 'day'),
        {"comment": "Schedule table with composite indexes for performance"},
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys (masing-masing sudah punya single-column index)
    class_id: int = Field(foreign_key="schoolclass.id", index=True)
    subject_id: int = Field(foreign_key="subject.id", index=True)
    teacher_id: int = Field(foreign_key="user.id", index=True)
    
    # Relationships -> Enable Eager Loading / Joins
    school_class: Optional["SchoolClass"] = Relationship(back_populates="schedules")
    subject: Optional["Subject"] = Relationship(back_populates="schedules")
    teacher: Optional["User"] = Relationship(back_populates="teaching_schedules")
    materials: List["Material"] = Relationship(back_populates="schedule")  # NEW: Materi pelajaran

    # Waktu
    day: DayEnum = Field(index=True)  # Added index for day column
    start_time: str = Field(max_length=5) # Format "HH:MM" e.g "07:00"
    end_time: str = Field(max_length=5)   # Format "HH:MM" e.g "08:30"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)



# ============================================================================
# MATERIAL MODEL (Materi Pelajaran / Course Content)
# ============================================================================
# Catatan Arsitektur:
# - File TIDAK disimpan dalam database (BLOB), hanya path-nya saja.
#   Ini untuk efisiensi storage dan performa query.
# - Setiap Material terhubung ke satu Schedule (pertemuan).
# - Index pada schedule_id dan uploaded_by untuk query cepat.
# ============================================================================

class Material(SQLModel, table=True):
    """
    Menyimpan metadata file materi pelajaran.
    File fisik disimpan di folder: backend/static/materials/
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ========== RELASI ==========
    # Material terhubung ke satu Jadwal (Schedule)
    # Index untuk query: "Tampilkan semua materi untuk jadwal X"
    schedule_id: int = Field(foreign_key="schedule.id", index=True)
    
    # Siapa yang upload? (Untuk audit trail & permission check)
    uploaded_by: int = Field(foreign_key="user.id", index=True)
    
    # ========== METADATA FILE ==========
    title: str = Field(max_length=200, index=True)       # Judul materi (searchable)
    description: Optional[str] = Field(default=None, max_length=1000)  # Deskripsi opsional
    file_url: str = Field(max_length=500)                # Path relatif: /static/materials/xxx.pdf
    file_type: str = Field(max_length=50)                # Extension: pdf, mp4, pptx, dll
    file_size: int = Field(default=0)                    # Ukuran dalam bytes (untuk UI display)
    
    # ========== AUDIT TRAIL ==========
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # ========== RELATIONSHIPS (Eager Loading Ready) ==========
    schedule: Optional["Schedule"] = Relationship(back_populates="materials")
    uploader: Optional["User"] = Relationship()  # Simple link, no back_populates needed


# ============================================================================
# ASSIGNMENT SYSTEM (LMS)
# ============================================================================

class Assignment(SQLModel, table=True):
    """
    Tugas yang diberikan oleh Guru untuk satu Kelas pada Mata Pelajaran tertentu.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Content
    title: str = Field(max_length=200, index=True)
    description: str = Field(max_length=5000) # Bisa panjang (instruksi tugas)
    due_date: datetime = Field(index=True)    # Batas waktu pengumpulan
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Lampiran Soal (Optional) - Guru bisa upload PDF soal
    file_url: Optional[str] = Field(default=None, max_length=500)
    
    # Context (Tugas ini untuk siapa?)
    subject_id: int = Field(foreign_key="subject.id", index=True) # Mapel apa?
    class_id: int = Field(foreign_key="schoolclass.id", index=True) # Kelas mana?
    teacher_id: int = Field(foreign_key="user.id", index=True)      # Siapa yang buat?
    
    # Relationships
    subject: Optional["Subject"] = Relationship()
    school_class: Optional["SchoolClass"] = Relationship()
    teacher: Optional["User"] = Relationship()
    submissions: List["Submission"] = Relationship(back_populates="assignment", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class Submission(SQLModel, table=True):
    """
    Jawaban tugas yang dikumpulkan oleh Siswa.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Context
    assignment_id: int = Field(foreign_key="assignment.id", index=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    
    # Content
    file_url: str = Field(max_length=500) # File jawaban siswa
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Grading (Diisi oleh Guru)
    grade: Optional[int] = Field(default=None) # Nilai 0-100
    feedback: Optional[str] = Field(default=None, max_length=1000) # Catatan guru
    
    # Relationships
    assignment: Optional["Assignment"] = Relationship(back_populates="submissions")
    student: Optional["User"] = Relationship()