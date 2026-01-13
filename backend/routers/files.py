import shutil
import os
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import User, UserFile
from backend.dependencies import get_current_user

# Konfigurasi Logger
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/files",
    tags=["Cloud Storage"],
)

# Folder khusus untuk file storage (bukan foto profil)
UPLOAD_DIR = "backend/static/files"
os.makedirs(UPLOAD_DIR, exist_ok=True) # Bikin folder kalau belum ada

@router.post("/upload",
    summary="Upload File Baru",
    description="Upload file PDF, DOCX, atau Gambar ke Cloud Storage"
)
async def upload_file(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Log info file masuk untuk debugging
    logger.info(f"Attempt Upload: Filename={file.filename}, Content-Type={file.content_type}")

    # 1. Validasi Tipe File (MIME Type & Extension)
    # Browsers kadang mengirim MIME type yang aneh, jadi kita cek ekstensi juga.
    ALLOWED_MIME_TYPES = [
        "application/pdf", 
        "application/x-pdf", # Kadang PDF terdeteksi begini
        "application/acrobat",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", # docx
        "application/msword", # doc lama
        "image/jpeg", 
        "image/jpg",
        "image/png"
    ]
    
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"}
    
    # Ambil ekstensi file (misal: .pdf)
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    # Logic: Jika MIME tidak cocok DAN Ekstensi tidak cocok, baru tolak.
    if (file.content_type not in ALLOWED_MIME_TYPES) and (file_ext not in ALLOWED_EXTENSIONS):
         logger.warning(f"Upload Ditolak! Tipe: {file.content_type}, Ext: {file_ext}")
         raise HTTPException(status_code=400, detail=f"File tidak didukung. Terdeteksi: {file.content_type} ({file_ext})")

    # 1.5 Validasi Ukuran File (Server-Side, Max 5MB)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        logger.warning(f"Upload Ditolak! Ukuran: {len(contents)} bytes (Max: {MAX_FILE_SIZE})")
        raise HTTPException(status_code=400, detail=f"Ukuran file terlalu besar. Maksimal 5MB.")
    # Reset file pointer untuk proses selanjutnya
    await file.seek(0)

    # 2. Buat Nama Unik (UUID) tapi tetap simpan nama asli
    unique_filename = f"{current_user.id}_{uuid.uuid4()}{file_ext}"
    file_location = f"{UPLOAD_DIR}/{unique_filename}"
    
    # 3. Simpan Fisik
    try:
        with open(file_location, "wb+") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Gagal simpan file ke disk: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")
        
    # 4. Simpan ke Database
    db_file = UserFile(
        filename=file.filename,
        file_url=f"/static/files/{unique_filename}",
        file_type=file.content_type, # Simpan mime type asli untuk referensi
        owner_id=current_user.id
    )
    
    session.add(db_file)
    session.commit()
    session.refresh(db_file)
    
    return db_file

@router.get("/", response_model=List[UserFile])
def get_my_files(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(UserFile).where(UserFile.owner_id == current_user.id).order_by(UserFile.created_at.desc())
    files = session.exec(statement).all()
    return files

@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Cari File
    db_file = session.get(UserFile, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
        
    # 2. Cek Kepemilikan
    if db_file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bukan milik Anda")
        
    # 3. Hapus Fisik
    # URL di DB: /static/files/namajelek.pdf
    # Lokasi Asli: backend/static/files/namajelek.pdf
    # Jadi kita perlu konversi path
    
    filename_on_disk = db_file.file_url.split("/")[-1] # Ambil nama filenya saja
    file_path = f"{UPLOAD_DIR}/{filename_on_disk}"
    
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # 4. Hapus Database
    session.delete(db_file)
    session.commit()
    
    return {"message": "File berhasil dihapus permanen"}
