# ... imports (keeping existing ones)
import logging
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from starlette.middleware.sessions import SessionMiddleware
from backend.routers import notes, auth
from backend.database import engine
from backend.admin import setup_admin
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from backend.limiter import limiter
from backend.admin import SECRET_KEY_ADMIN
import os
from pathlib import Path


# SETUP FOLDER PENYIMPANAN GAMBAR
# Kita menggunakan "Absolute Path" (Alamat Mutlak) agar komputer tidak bingung
# mencari folder gambar, tidak peduli dari folder mana terminal dijalankan.
BASE_DIR = Path(__file__).resolve().parent  # Mencari alamat folder tempat file ini berada
STATIC_DIR = os.path.join(BASE_DIR, "static") # Menunjuk ke folder 'static'
IMAGES_DIR = os.path.join(STATIC_DIR, "images") # Menunjuk ke folder 'static/images'

# Buat folder jika belum ada (agar tidak error saat pertama kali dijalankan)
os.makedirs(IMAGES_DIR, exist_ok=True)

# konfigurasi Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Server Sedang Menyala...")
    logger.info("🛑 Server dimatikan.")
    yield

app = FastAPI(
    title="Notes API Service",
    description="API Backend Untuk Aplikasi Manajemen Catatan Pribadi.",
    version="1.0.0",
    lifespan=lifespan
)

# HUBUNGKAN FOLDER GAMBAR KE INTERNET
# 'Mount' artinya kita membuka akses folder ini ke publik.
# Jadi jika user membuka 'http://localhost:8000/static/foto.jpg',
# server akan mengambil file 'foto.jpg' dari folder STATIC_DIR di laptop kita.
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# DAFTAR TAMU YANG DIIZINKAN (CORS)
# CORS adalah satpam browser. Kita harus mencatat siapa saja yang boleh
# "berbicara" dengan backend ini.
origin = [
    "http://127.0.0.1:5500", 
    "http://localhost:5500", 
    "http://localhost:3000",
    "http://localhost:8000",
    
    # PENTING: Ini alamat Frontend.
    # Jika tidak dimasukkan, Login akan gagal (diblokir).
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origin,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY_ADMIN,
    max_age=3600, 
    https_only=False,
)


# pasang state limiter ke app
app.state.limiter = limiter
# pasang penanganan error (agar jika limit habis muncul pesan jelas)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# sambungkan jalur router ke app
app.include_router(auth.router)
app.include_router(notes.router)

# pasang admin panel
setup_admin(app, engine)

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # log error nya hanya bisa dilihat programer
    logger.error (f"FATAL ERROR TERJADI: {exc}")

    # response ke user
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "fail",
            "message": "terjadi kesalahan internal pada server. silahkan coba lagi nanti."
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handlers(request: Request, exc: RequestValidationError):
    # ambil list error mentah
    errors = exc.errors()

    # buat list pesan yg rapi
    error_messages = []
    for e in errors:
        # ambil nama field (misal: "age", "title")
        field = e["loc"][-1]
        message = e["msg"]
        error_messages.append(f"{field}: {message}")

    logger.warning(f"validasi Gagal: {error_messages}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content = {
            "status":"fail",
            "message":"Data yang dikirimkan tidak valid",
            "errors":error_messages # hasil error yg sudah di rapihkan
        },
    )