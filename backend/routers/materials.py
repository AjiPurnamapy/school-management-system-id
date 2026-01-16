"""
Materials Router (Course Content API)
======================================
Endpoint untuk mengelola materi pelajaran (upload, list, delete).

KEAMANAN:
- Hanya Guru pemilik jadwal yang bisa upload materi ke jadwal tersebut.
- Admin bisa upload/delete ke semua jadwal.
- Whitelist file extension untuk mencegah upload file berbahaya.
- Limit ukuran file maksimal 50MB.

PERFORMA:
- Menggunakan Eager Loading (selectinload) untuk menghindari N+1 Query.
- File disimpan di filesystem, bukan database (efisien).
"""

import os
import uuid
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from backend.database import get_session
from backend.models import Material, Schedule, User, UserRole
from backend.schemas.material import MaterialRead
from backend.dependencies import get_current_user


router = APIRouter(prefix="/materials", tags=["Materials (Materi Pelajaran)"])

# ============================================================================
# KONFIGURASI KEAMANAN & VALIDASI
# ============================================================================

# Whitelist extension yang diizinkan (lowercase)
# Hanya file-file yang aman untuk pembelajaran
ALLOWED_EXTENSIONS = {
    # Dokumen
    "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt",
    # Gambar
    "jpg", "jpeg", "png", "gif", "webp",
    # Video
    "mp4", "webm", "mov",
    # Audio
    "mp3", "wav", "ogg"
}

# Maksimal ukuran file: 50MB (dalam bytes)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Folder penyimpanan file materi
MATERIALS_DIR = Path(__file__).parent.parent / "static" / "materials"


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def validate_file(file: UploadFile) -> str:
    """
    Validasi file upload:
    1. Cek extension ada di whitelist
    2. Cek ukuran tidak melebihi batas
    
    Returns: extension jika valid
    Raises: HTTPException jika tidak valid
    """
    # Ambil extension dari nama file
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    # Validasi extension
    if extension not in ALLOWED_EXTENSIONS:
        allowed_str = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Tipe file '{extension}' tidak diizinkan. Format yang diterima: {allowed_str}"
        )
    
    # Validasi ukuran (jika tersedia)
    # Note: file.size mungkin None untuk beberapa client, akan dicek ulang saat save
    if file.size and file.size > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Ukuran file terlalu besar. Maksimal {max_mb}MB."
        )
    
    return extension


def check_schedule_ownership(schedule: Schedule, user: User) -> bool:
    """
    Cek apakah user berhak upload ke jadwal ini.
    - Admin: Boleh semua
    - Teacher: Hanya jadwal yang dia ajar
    """
    if user.role == UserRole.admin.value:
        return True
    if user.role == UserRole.teacher.value and schedule.teacher_id == user.id:
        return True
    return False


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/upload/{schedule_id}", response_model=MaterialRead, status_code=status.HTTP_201_CREATED)
async def upload_material(
    schedule_id: int,
    title: str = Form(..., max_length=200, description="Judul materi"),
    description: Optional[str] = Form(None, max_length=1000, description="Deskripsi opsional"),
    file: UploadFile = File(..., description="File materi (PDF, Video, dll)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Upload file materi ke jadwal tertentu.
    
    - **schedule_id**: ID jadwal yang akan ditambahkan materi
    - **title**: Judul materi (wajib)
    - **description**: Deskripsi opsional
    - **file**: File yang diupload (max 50MB)
    
    Hanya Guru pemilik jadwal atau Admin yang bisa upload.
    """
    
    # 1. VALIDASI: Cek jadwal ada
    schedule = session.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    
    # 2. VALIDASI: Cek kepemilikan jadwal
    if not check_schedule_ownership(schedule, current_user):
        raise HTTPException(
            status_code=403, 
            detail="Anda tidak memiliki izin untuk upload materi ke jadwal ini. Hanya guru yang mengajar jadwal ini yang diizinkan."
        )
    
    # 3. VALIDASI: Cek file (extension & size)
    extension = validate_file(file)
    
    # 4. SIMPAN FILE KE FILESYSTEM
    # Generate nama file unik untuk menghindari konflik nama
    unique_filename = f"{uuid.uuid4().hex}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{extension}"
    
    # Pastikan folder exists
    MATERIALS_DIR.mkdir(parents=True, exist_ok=True)
    
    file_path = MATERIALS_DIR / unique_filename
    
    # Baca dan simpan file
    try:
        content = await file.read()
        
        # Double-check ukuran setelah baca (untuk client yang tidak kirim size header)
        if len(content) > MAX_FILE_SIZE:
            max_mb = MAX_FILE_SIZE // (1024 * 1024)
            raise HTTPException(status_code=400, detail=f"Ukuran file terlalu besar. Maksimal {max_mb}MB.")
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        file_size = len(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")
    
    # 5. SIMPAN METADATA KE DATABASE
    # Path relatif untuk akses via static files
    relative_url = f"/static/materials/{unique_filename}"
    
    db_material = Material(
        schedule_id=schedule_id,
        uploaded_by=current_user.id,
        title=title,
        description=description,
        file_url=relative_url,
        file_type=extension,
        file_size=file_size
    )
    
    session.add(db_material)
    session.commit()
    session.refresh(db_material)
    
    # 6. RETURN ENRICHED RESPONSE
    return MaterialRead(
        id=db_material.id,
        schedule_id=db_material.schedule_id,
        title=db_material.title,
        description=db_material.description,
        file_url=db_material.file_url,
        file_type=db_material.file_type,
        file_size=db_material.file_size,
        uploader_name=current_user.name,
        created_at=db_material.created_at
    )


@router.get("/", response_model=List[MaterialRead])
def get_materials(
    schedule_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Ambil daftar materi untuk jadwal tertentu.
    
    - **schedule_id**: ID jadwal (wajib)
    
    Semua user yang terautentikasi bisa melihat materi.
    """
    
    # Query dengan Eager Loading untuk menghindari N+1
    statement = (
        select(Material)
        .where(Material.schedule_id == schedule_id)
        .options(selectinload(Material.uploader))
        .order_by(Material.created_at.desc())  # Terbaru di atas
    )
    
    results = session.exec(statement).all()
    
    # Transform ke response schema
    return [
        MaterialRead(
            id=mat.id,
            schedule_id=mat.schedule_id,
            title=mat.title,
            description=mat.description,
            file_url=mat.file_url,
            file_type=mat.file_type,
            file_size=mat.file_size,
            uploader_name=mat.uploader.name if mat.uploader else "Unknown",
            created_at=mat.created_at
        )
        for mat in results
    ]


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Hapus materi pelajaran.
    
    - **material_id**: ID materi yang akan dihapus
    
    Hanya Admin atau Guru yang mengupload yang bisa menghapus.
    """
    
    # 1. Cek materi ada
    material = session.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")
    
    # 2. Cek permission: Admin atau Uploader sendiri
    is_admin = current_user.role == UserRole.admin.value
    is_owner = material.uploaded_by == current_user.id
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki izin untuk menghapus materi ini."
        )
    
    # 3. Hapus file fisik (best effort, jangan gagalkan jika file tidak ada)
    try:
        # Ekstrak nama file dari URL
        filename = material.file_url.split("/")[-1]
        file_path = MATERIALS_DIR / filename
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        # Log error tapi jangan gagalkan operasi database
        print(f"Warning: Gagal hapus file fisik: {e}")
    
    # 4. Hapus dari database
    session.delete(material)
    session.commit()
    
    return None
