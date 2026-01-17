"""
=============================================================================
                    ROUTERS/CLASSES.PY - MANAJEMEN KELAS
=============================================================================
Router ini menangani semua operasi terkait kelas sekolah:
- CRUD Kelas (Create, Read, Update, Delete)
- Assign Siswa ke Kelas
- Assign Wali Kelas

PENTING: Hanya Admin dan Kepala Sekolah yang boleh mengelola kelas!
=============================================================================
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import SchoolClass, User, UserRole
from backend.schemas.class_schema import ClassCreate, ClassUpdate, ClassRead, AssignStudentRequest
from backend.dependencies import get_current_user
from backend.permissions import require_admin
from backend.exceptions import PermissionDeniedError, NotFoundError, ConflictError

# Setup Logging
logger = logging.getLogger(__name__)

# Inisialisasi Router dengan prefix /classes
router = APIRouter(prefix="/classes", tags=["Classes (Kelas)"])


# Helper: Roles yang boleh kelola kelas
ACADEMIC_MANAGEMENT_ROLES = [UserRole.admin.value, UserRole.principal.value]


@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED,
    summary="Buat Kelas Baru",
    description="Membuat kelas baru. Hanya Admin dan Kepala Sekolah yang bisa akses."
)
def create_class(
    class_data: ClassCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Membuat kelas baru di database.
    
    Flow:
    1. Permission: Hanya Admin & Kepala Sekolah.
    2. Validasi: Pastikan nama kelas belum ada (duplikat).
    3. Validasi: Jika wali_kelas_id disediakan, pastikan user tersebut adalah Guru.
    4. Simpan ke database.
    
    NOTE: Guru TIDAK bisa membuat kelas sendiri. 
          Kepala Sekolah yang menentukan kelas dan wali kelas.
    """
    # 1. Cek Permission - HANYA Admin dan Kepala Sekolah
    if current_user.role not in ACADEMIC_MANAGEMENT_ROLES:
        raise PermissionDeniedError("membuat kelas (hanya Admin/Kepala Sekolah)")

    # 2. Cek duplikat nama kelas
    existing = session.exec(
        select(SchoolClass).where(SchoolClass.name == class_data.name)
    ).first()
    if existing:
        raise ConflictError(f"Kelas dengan nama '{class_data.name}' sudah ada.")
    
    # 3. Validasi Wali Kelas (jika ada)
    final_wali_kelas_id = class_data.wali_kelas_id
    
    if class_data.wali_kelas_id:
        wali = session.get(User, class_data.wali_kelas_id)
        if not wali:
            raise NotFoundError("User wali kelas", class_data.wali_kelas_id)
        if wali.role != UserRole.teacher.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User '{wali.name}' bukan Guru. Wali kelas harus memiliki role 'teacher'."
            )
    
    # Buat objek kelas baru dengan override wali_kelas_id logika di atas
    class_dict = class_data.model_dump()
    class_dict['wali_kelas_id'] = final_wali_kelas_id
    
    new_class = SchoolClass(**class_dict)
    session.add(new_class)
    session.commit()
    session.refresh(new_class)
    
    logger.info(f"Kelas baru dibuat: '{new_class.name}' oleh '{current_user.name}' (Wali: {final_wali_kelas_id})")
    return new_class


# ENDPOINT UNTUK MELIHAT SEMUA KELAS
@router.get("/", response_model=List[ClassRead],
    summary="Lihat Semua Kelas",
    description="Menampilkan daftar semua kelas dengan pagination. Bisa diakses oleh semua user yang login."
)
def get_all_classes(
    offset: int = Query(0, ge=0, description="Mulai dari data ke-"),
    limit: int = Query(50, ge=1, le=100, description="Jumlah data per halaman (max 100)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Mengambil daftar semua kelas dari database dengan pagination.
    Endpoint ini tidak dibatasi admin karena Guru/Siswa juga perlu lihat daftar kelas.
    
    Default: 50 item per halaman, maksimal 100 untuk mencegah overload.
    """
    classes = session.exec(
        select(SchoolClass).offset(offset).limit(limit)
    ).all()
    return classes


# ENDPOINT: GET CLASS BY ID
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


# ENDPOINT: GET STUDENTS IN CLASS
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


# ENDPOINT: UPDATE CLASS
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


# ENDPOINT: DELETE CLASS
@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus Kelas",
    description="Menghapus kelas dari database. Admin bebas hapus. Guru hanya bisa hapus kelas walinya."
)
def delete_class(
    class_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Menghapus kelas dari database.
    
    PERHATIAN: Siswa yang ada di kelas ini akan memiliki class_id = NULL setelah dihapus.
    Permission:
    - Admin: Bebas hapus semua kelas.
    - Guru: Hanya boleh hapus kelas yang dia wai-i.
    """
    school_class = session.get(SchoolClass, class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan.")
    
    # Logic Permission
    # 1. Admin boleh segalanya
    is_admin = current_user.role == UserRole.admin.value
    
    # 2. Guru boleh hapus jika:
    #    a. Dia adalah Wali Kelas-nya
    #    b. ATAU Kelas tersebut tidak punya Wali Kelas (orphan/sampah)
    is_teacher = current_user.role == UserRole.teacher.value
    is_owner = school_class.wali_kelas_id == current_user.id
    is_orphan = school_class.wali_kelas_id is None
    
    allow_teacher = is_teacher and (is_owner or is_orphan)

    if not (is_admin or allow_teacher):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki izin untuk menghapus kelas ini (Bukan Wali Kelas)."
        )

    # === MANUAL CASCADE DELETE START ===
    # Karena tidak ada CASCADE di database level, kita harus hapus manual child-nya.
    # Chain: Class -> Schedule -> Material
    
    from backend.models import Schedule, Material
    
    # 1. Cari semua Schedule milik kelas ini
    schedules = session.exec(select(Schedule).where(Schedule.class_id == class_id)).all()
    
    for sched in schedules:
        # 2. Cari & Hapus semua Material milik Schedule ini
        materials = session.exec(select(Material).where(Material.schedule_id == sched.id)).all()
        for mat in materials:
            session.delete(mat)
        
        # 3. Hapus Schedule itu sendiri
        session.delete(sched)
        
    # === MANUAL CASCADE DELETE END ===

    # 4. Set semua siswa di kelas ini menjadi tanpa kelas
    students = session.exec(select(User).where(User.class_id == class_id)).all()
    for student in students:
        student.class_id = None
        session.add(student)
    
    # 5. Akhirnya hapus kelas
    session.delete(school_class)
    session.commit()
    
    logger.info(f"Kelas '{school_class.name}' dihapus oleh '{current_user.name}'. {len(students)} siswa dilepas, {len(schedules)} jadwal dihapus.")
    return None


# ENDPOINT: ASSIGN STUDENT TO CLASS
@router.post("/assign-student",
    summary="Masukkan Siswa ke Kelas",
    description="Memasukkan siswa ke dalam kelas tertentu. Admin dan Guru bisa akses."
)
def assign_student_to_class(
    data: AssignStudentRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Memasukkan seorang siswa ke dalam kelas.
    
    Validasi:
    1. Permission: Admin & Guru
    2. User harus ada & status student.
    3. Kelas harus ada.
    """
    # 1. Cek Permission (Admin & Guru boleh)
    if current_user.role not in [UserRole.admin.value, UserRole.teacher.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Hanya Admin atau Guru yang bisa mengatur siswa."
        )

    # Cek user target
    user = session.get(User, data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User siswa tidak ditemukan.")
    if user.role != UserRole.student.value:
        raise HTTPException(status_code=400, detail="Hanya user dengan role 'student' yang bisa dimasukkan ke kelas.")
    
    # Cek kelas
    school_class = session.get(SchoolClass, data.class_id)
    if not school_class:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan.")
    
    # Assign
    user.class_id = data.class_id
    session.add(user)
    session.commit()
    
    logger.info(f"Siswa '{user.name}' dimasukkan ke kelas '{school_class.name}' oleh '{current_user.name}'")
    return {"message": f"Siswa '{user.name}' berhasil dimasukkan ke kelas '{school_class.name}'."}
