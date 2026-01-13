from typing import List, Optional
from datetime import datetime # Import datetime
from sqlmodel import SQLModel, Field
from pydantic import field_validator

class BaseNotes(SQLModel):
    title  : str = Field (..., min_length=3, max_length=100, schema_extra={"example":"Belajar Bikin API"})
    content: str = Field(..., min_length=4, max_length=10000, schema_extra={"example":"Mau jadi backend profesional, ya harus belajar!"})

class CreateNotes(BaseNotes):
    @field_validator("title", "content")
    @classmethod
    def check_empty_string(cls, v: str):
        if not v.strip():
            raise ValueError("Tidak boleh kosong atau hanya spasi")
        return v

class ReadNotes(BaseNotes):
    id: int
    owner_id: int
    created_at: Optional[datetime] = None  # Ganti str ke datetime
    updated_at: Optional[datetime] = None

class PaginatedResponse(SQLModel):
    data: List[ReadNotes] # List of notes
    total_items: int      # Total semua catatan (misal 100)
    page: int             # Halaman sekarang (misal 1)
    size: int             # Jumlah per halaman (misal 10)
    total_pages: int      # Total halaman (misal 10)