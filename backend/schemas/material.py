"""
Material Schemas (Pydantic)
============================
Schema untuk validasi request/response pada endpoint Materials.

Catatan Desain:
- MaterialCreate: Hanya metadata, file dihandle terpisah via UploadFile.
- MaterialRead: Enriched dengan nama uploader untuk tampilan UI.
"""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class MaterialCreate(SQLModel):
    """
    Schema untuk membuat materi baru.
    File diupload terpisah via multipart/form-data.
    """
    title: str = Field(max_length=200, description="Judul materi pelajaran")
    description: Optional[str] = Field(default=None, max_length=1000, description="Deskripsi opsional")


class MaterialRead(SQLModel):
    """
    Schema untuk response API.
    Enriched dengan informasi tambahan untuk kebutuhan UI.
    """
    id: int
    schedule_id: int
    title: str
    description: Optional[str]
    file_url: str           # Path untuk download
    file_type: str          # Extension (pdf, mp4, dll)
    file_size: int          # Bytes (untuk display: "2.5 MB")
    uploader_name: str      # Nama Guru yang upload (enriched)
    created_at: datetime
