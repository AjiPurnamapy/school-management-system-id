from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from backend.routers import notes, auth
from backend.database import engine
from backend.admin import setup_admin
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from backend.limiter import limiter

# Lifespan: jalan otomatis saat server nyala
@asynccontextmanager
async def lifespan(app: FastAPI):
    # create_db_table()      # perintah: "buat semua tabel yg di-import"
    yield

app = FastAPI(
    title="Notes API Service",
    description="API sederhana untuk menyimpan catatan pribadi dengan fitur login & register",
    version="1.0.0",
    lifespan=lifespan
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
    print(f"FATAL ERROR TERJADI: {exc}")

    # response ke user
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "fail",
            "message": "terjadi kesalahan internal pada server. silahkan coba lagi nanti."
        },
    )