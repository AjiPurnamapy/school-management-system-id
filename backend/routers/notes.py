from typing import List, Optional # Optional: artinya boleh kosong (None)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col, desc, asc, func # SQL helpers
from backend.schemas.notes import ReadNotes, CreateNotes, PaginatedResponse # Import PaginatedResponse
from backend.database import get_session
from backend.models import Note, User
from backend.dependencies import get_current_user
import math # Import math for ceil

router = APIRouter(
    prefix="/notes",    # semua URl diisi otomatis depannya/catatan
    tags=["Notes Management"],      # biar rapi
)

@router.post("/",
    response_model=ReadNotes,
    summary="Buat Catatan Baru",
    description="Endpoint ini menerima judul dan isi catatan, wajib menyertakan token JWT di header",
)
def create_notes(
    notes_input: CreateNotes,
    session: Session = Depends(get_session),
    current_user : User = Depends(get_current_user),
):
    note_dict = notes_input.model_dump()
    note_dict["owner_id"] = current_user.id

    notes_db = Note.model_validate(note_dict)
    
    session.add(notes_db)
    session.commit()
    session.refresh(notes_db)
    return notes_db

@router.get("/",
    response_model=PaginatedResponse,
    summary="Melihat Catatan (Cari & Urutkan)",
    description="Endpoint ini bisa mencari catatan (q) dan mengurutkan (sort_by), serta dibatasi per halaman",
)
def read_my_notes(
    q: Optional[str] = None, # Keyword Pencarian (opsional)
    sort_by: str = "date_desc", # Urutan (default: Terbaru di atas)
    offset : int = 0,       # default: mulai dari awal
    limit : int = Query(default=10, le=100),     # default: 10 data, maksimal 100 data
    session: Session = Depends(get_session),
    current_user : User = Depends(get_current_user),
):
    # 1. BASE STATEMENT (User Filter)
    base_statement = select(Note).where(Note.owner_id == current_user.id)

    # 2. FILTER PENCARIAN
    if q:
        base_statement = base_statement.where(
            col(Note.title).contains(q) | col(Note.content).contains(q)
        )

    # 3. HITUNG TOTAL DATA (Sebelum dipotong pagination)
    # Kita butuh info "Total 50 data" agar frontend tau ada berapa halaman.
    # Note: Kita gunakan count() dari library sqlmodel
    total_statement = select(func.count()).select_from(base_statement.subquery())
    total_items = session.exec(total_statement).one()

    # 4. PENGURUTAN (Sorting)
    if sort_by == "date_desc":
        base_statement = base_statement.order_by(desc(Note.created_at))
    elif sort_by == "date_asc":
        base_statement = base_statement.order_by(asc(Note.created_at))

    # 5. PAGINATION (Potong Data)
    paginated_statement = base_statement.offset(offset).limit(limit)
    data = session.exec(paginated_statement).all()

    # 6. HITUNG INFO HALAMAN
    # Rumus Total Halaman: Total Data / Limit (dibulatkan ke atas)
    # Contoh: 12 data / 10 limit = 1.2 -> jadi 2 halaman
    # Jika total_items 0, maka total_pages 0 atau 1 (kita set 1 minimal agar tidak error)
    if total_items == 0:
        total_pages = 1
    else:
        total_pages = math.ceil(total_items / limit)
    
    # Hitung halaman sekarang (dari offset)
    # Offset 0 -> Page 1, Offset 10 -> Page 2
    current_page = (offset // limit) + 1

    return PaginatedResponse(
        data=data,
        total_items=total_items,
        page=current_page,
        size=limit,
        total_pages=total_pages
    )

@router.put("/{notes_id}",
    response_model=ReadNotes,
    summary="Update Catatan",
    description="Endpoint ini untuk mengupdate catatan yang diinginkan berdasarkan id catatan-nya"
)
def update_notes(notes_id:int, new_notes:CreateNotes,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    notes_db = session.get(Note, notes_id)

    if not notes_db:
        raise HTTPException(status_code=404, detail="notes not found")
    
    if notes_db.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="youre not allowed")
    
    notes_db.title = new_notes.title
    notes_db.content = new_notes.content

    session.add(notes_db)
    session.commit()
    session.refresh(notes_db)
    return notes_db


@router.delete("/{notes_id}",
    summary="Hapus Catatan",
    description="Endpoint ini khusus untuk menghapus catatan yang diinginkan berdasarkan id catatan-nya",
)
def delete_notes(
    notes_id :int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # mencari catatan di database
    notes_db = session.get(Note, notes_id)

    # catatan ada/tidak?
    if not notes_db:
        raise HTTPException(status_code=404, detail="notes not found")
    
    # cek apakah pemilik catatan (id), sama dengan (id) user yg saat ini login?
    if notes_db.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your own notes")

    session.delete(notes_db)
    session.commit()
    return{"message": "notes deleted"}
