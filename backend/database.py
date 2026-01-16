import os
import time
import logging
from dotenv import load_dotenv
from sqlmodel import create_engine, Session, SQLModel

load_dotenv()

# Setup logging untuk query timing
logger = logging.getLogger(__name__)

current_file = os.path.abspath(__file__)
backend_dir = os.path.dirname(current_file)
BASE_DIR = os.path.dirname(backend_dir)

# Cek apakah ada DATABASE_URL di environment (bawaan docker/cloud)
database_url = os.getenv("DATABASE_URL")

# Logika Switch Database
if database_url:
    # ========== PRODUCTION: PostgreSQL dengan Connection Pooling ==========
    # Jika ada variabel DATABASE_URL, pakai PostgreSQL
    # (Fix untuk SQLAlchemy lama: ubah postgres:// jadi postgresql:// jika perlu)
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    # Connection Pool Settings untuk Production:
    # - pool_size: Jumlah koneksi yang selalu tersedia (default: 5)
    # - max_overflow: Koneksi ekstra jika pool penuh (default: 10)
    # - pool_timeout: Timeout tunggu koneksi (30 detik)
    # - pool_recycle: Daur ulang koneksi lama (1 jam) untuk hindari stale connection
    # - pool_pre_ping: Cek koneksi masih hidup sebelum dipakai
    engine = create_engine(
        database_url, 
        echo=False,  # Matikan SQL logging di production untuk performa
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=3600,  # 1 jam
        pool_pre_ping=True  # Health check koneksi
    )
    logger.info("🐘 PostgreSQL engine initialized with connection pooling")
else:
    # ========== DEVELOPMENT: SQLite (No Pooling Needed) ==========
    sqlite_file_name = "database.db"
    sqlite_url = f"sqlite:///{os.path.join(BASE_DIR, sqlite_file_name)}"
    connect_args = {"check_same_thread": False} 
    engine = create_engine(sqlite_url, echo=True, connect_args=connect_args)

    # EVENT LISTENER: AKTIFKAN FOREIGN KEYS DI SQLITE
    # Tanpa ini, 'ON DELETE CASCADE' tidak akan jalan, dan Orphan data akan menumpuk.
    from sqlalchemy import event
    from sqlalchemy.engine import Engine

    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    logger.info("🗄️ SQLite engine initialized for development")


# ============================================================================
# QUERY TIMING LOGGING (untuk monitoring performa)
# ============================================================================
# Event listener ini akan mencatat waktu eksekusi setiap query.
# Berguna untuk menemukan slow queries yang perlu dioptimasi.

from sqlalchemy import event
from sqlalchemy.engine import Engine as SQLAlchemyEngine

@event.listens_for(SQLAlchemyEngine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Simpan waktu mulai query di context"""
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(SQLAlchemyEngine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Hitung durasi query dan log jika > 100ms (slow query)"""
    total_time = time.time() - conn.info['query_start_time'].pop()
    
    # Log SLOW QUERIES (> 100ms) sebagai WARNING
    if total_time > 0.1:
        logger.warning(f"🐌 SLOW QUERY ({total_time:.3f}s): {statement[:100]}...")
    # Log semua query yang > 50ms sebagai DEBUG
    elif total_time > 0.05:
        logger.debug(f"⏱️ Query took {total_time:.3f}s: {statement[:80]}...")


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
