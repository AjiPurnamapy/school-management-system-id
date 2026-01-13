"""
=============================================================================
                    ROUTERS/CLASSES.PY - MANAJEMEN KELAS
=============================================================================
Router ini menangani semua operasi terkait kelas sekolah:
- CRUD Kelas (Create, Read, Update, Delete)
- Assign Siswa ke Kelas
- Assign Wali Kelas

PENTING: Hanya Admin yang boleh mengelola kelas!
=============================================================================
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import SchoolClass, User, UserRole
from backend.schemas.class_schema import ClassCreate, ClassUpdate, ClassRead, AssignStudentRequest
from backend.dependencies import get_current_user

# Setup Logging
logger = logging.getLogger(__name__)

# Inisialisasi Router dengan prefix /classes
router = APIRouter(prefix="/classes", tags=["Classes (Kelas)"])


# =============================================================================
#                           HELPER: CEK AKSES ADMIN
# =============================================================================
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency untuk memastikan hanya Admin yang bisa akses endpoint ini.
    
    Cara Kerja:
    1. Ambil user yang sedang login dari token JWT.
    2. Cek apakah role-nya adalah 'admin'.
    3. Jika bukan, tolak dengan HTTP 403 Forbidden.
    
    Penggunaan:
        @router.post("/")
        def create_class(admin: User = Depends(require_admin)):
            ...
    """
    if current_user.role != UserRole.admin.value:
        logger.warning(f"Akses ditolak: User '{current_user.name}' (role: {current_user.role}) mencoba akses admin.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya Admin yang bisa melakukan aksi ini."
        )
    return current_user


# =============================================================================
#                           ENDPOINT: CREATE CLASS
# =============================================================================
@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED,
    summary="Buat Kelas Baru",
    description="Membuat kelas baru. Hanya Admin yang bisa akses endpoint ini."
)
def create_class(
    class_data: ClassCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)  # <-- Cek Admin
):
    """
    Membuat kelas baru di database.
    
    Flow:
    1. Validasi: Pastikan nama kelas belum ada (duplikat).
    2. Jika ada wali_kelas_id, pastikan user tersebut adalah Guru.
    3. Simpan ke database.
    4. Kembalikan data kelas yang baru dibuat.
    """
    # Cek duplikat nama kelas
    existing = session.exec(
        select(SchoolClass).where(SchoolClass.name == class_data.name)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kelas dengan nama '{class_data.name}' sudah ada."
        )
    
    # Jika ada wali kelas, validasi bahwa itu adalah Guru
    if class_data.wali_kelas_id:
        wali = session.get(User, class_data.wali_kelas_id)
        if not wali:
            raise HTTPException(status_code=404, detail="User wali kelas tidak ditemukan.")
        if wali.role != UserRole.teacher.value:
            raise HTTPException(
                status_code=400,
                detail=f"User '{wali.name}' bukan Guru. Wali kelas harus memiliki role 'teacher'."
            )
    
    # Buat objek kelas baru
    new_class = SchoolClass(**class_data.model_dump())
    session.add(new_class)
    session.commit()
    session.refresh(new_class)
    
    logger.info(f"Kelas baru dibuat: '{new_class.name}' oleh Admin '{admin.name}'")
    return new_class


# =============================================================================
#                           ENDPOINT: GET ALL CLASSES
# =============================================================================
@router.get("/", response_model=List[ClassRead],
    summary="Lihat Semua Kelas",
    description="Menampilkan daftar semua kelas. Bisa diakses oleh semua user yang login."
)
def get_all_classes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # <-- Semua user bisa lihat
):
    """
    Mengambil daftar semua kelas dari database.
    Endpoint ini tidak dibatasi admin karena Guru/Siswa juga perlu lihat daftar kelas.
    """
    classes = session.exec(select(SchoolClass)).all()
    return classes


# =============================================================================
#                           ENDPOINT: GET CLASS BY ID
# =============================================================================
@router.get("/{class_id}", response_model=ClassRead,
    summary="Lihat Detail Kelas",
    description="Menampilkan detail satu kelas berdasarkan ID."
)
def get_class_by_id(
    class_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Mengambil detail kelas berdasarkan ID.
    """
    school_class = session.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan.")
    return school_class


# =============================================================================
#                      ENDPOINT: GET STUDENTS IN CLASS
# =============================================================================
@router.get("/{class_id}/students", 
    summary="Lihat Daftar Siswa di Kelas",
    description="Menampilkan semua siswa yang terdaftar di kelas tertentu."
)
def get_students_in_class(
    class_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Mengambil daftar siswa yang ada di suatu kelas.
    
    Return: List of {id, name, email}
    """
    # Pastikan kelas ada
    school_class = session.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan.")
    
    # Cari semua user dengan class_id ini dan role student
    students = session.exec(
        select(User).where(
            User.class_id == class_id,
            User.role == UserRole.student.value
        )
    ).all()
    
    # Return data siswa (tanpa password!)
    return [{"id": s.id, "name": s.name, "email": s.email} for s in students]


# =============================================================================
#                           ENDPOINT: UPDATE CLASS
# =============================================================================
@router.put("/{class_id}", response_model=ClassRead,
    summary="Update Data Kelas",
    description="Mengubah data kelas. Hanya Admin."
)
def update_class(
    class_id: int,
    class_data: ClassUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)
):
    """
    Mengupdate data kelas (nama, tingkat, tahun ajaran, wali kelas).
    Hanya field yang dikirim yang akan diupdate (Partial Update).
    """
    school_class = session.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan.")
    
    # Update hanya field yang dikirim (bukan None)
    update_data = class_data.model_dump(exclude_unset=True)
    
    # Validasi wali kelas jika diupdate
    if "wali_kelas_id" in update_data and update_data["wali_kelas_id"]:
        wali = session.get(User, update_data["wali_kelas_id"])
        if not wali or wali.role != UserRole.teacher.value:
            raise HTTPException(status_code=400, detail="Wali kelas harus seorang Guru.")
    
    for key, value in update_data.items():
        setattr(school_class, key, value)
    
    session.add(school_class)
    session.commit()
    session.refresh(school_class)
    
    logger.info(f"Kelas '{school_class.name}' diupdate oleh Admin '{admin.name}'")
    return school_class


# =============================================================================
#                           ENDPOINT: DELETE CLASS
# =============================================================================
@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus Kelas",
    description="Menghapus kelas dari database. Hanya Admin. Siswa di kelas akan jadi tanpa kelas."
)
def delete_class(
    class_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)
):
    """
    Menghapus kelas dari database.
    
    PERHATIAN: Siswa yang ada di kelas ini akan memiliki class_id = NULL setelah dihapus.
    """
    school_class = session.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan.")
    
    # Set semua siswa di kelas ini menjadi tanpa kelas
    students = session.exec(select(User).where(User.class_id == class_id)).all()
    for student in students:
        student.class_id = None
        session.add(student)
    
    session.delete(school_class)
    session.commit()
    
    logger.info(f"Kelas '{school_class.name}' dihapus oleh Admin '{admin.name}'. {len(students)} siswa dilepas.")
    return None


# =============================================================================
#                      ENDPOINT: ASSIGN STUDENT TO CLASS
# =============================================================================
@router.post("/assign-student",
    summary="Masukkan Siswa ke Kelas",
    description="Memasukkan siswa ke dalam kelas tertentu. Hanya Admin."
)
def assign_student_to_class(
    data: AssignStudentRequest,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)
):
    """
    Memasukkan seorang siswa ke dalam kelas.
    
    Validasi:
    1. User harus ada.
    2. User harus berstatus 'student'.
    3. Kelas harus ada.
    """
    # Cek user
    user = session.get(User, data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")
    if user.role != UserRole.student.value:
        raise HTTPException(status_code=400, detail="Hanya siswa yang bisa dimasukkan ke kelas.")
    
    # Cek kelas
    school_class = session.get(SchoolClass, data.class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan.")
    
    # Assign
    user.class_id = data.class_id
    session.add(user)
    session.commit()
    
    logger.info(f"Siswa '{user.name}' dimasukkan ke kelas '{school_class.name}' oleh Admin '{admin.name}'")
    return {"message": f"Siswa '{user.name}' berhasil dimasukkan ke kelas '{school_class.name}'."}
