import os
from dotenv import load_dotenv
from sqlmodel import create_engine, Session

load_dotenv()

current_file = os.path.abspath(__file__)
backend_dir = os.path.dirname(current_file)
BASE_DIR = os.path.dirname(backend_dir)
# Cek apakah ada DATABASE_URL di environment (bawaan docker/cloud)
database_url = os.getenv("DATABASE_URL")

# Logika Switch Database
if database_url:
    # Jika ada variabel DATABASE_URL, pakai PostgreSQL
    # (Fix untuk SQLAlchemy lama: ubah postgres:// jadi postgresql:// jika perlu)
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(database_url, echo=True)
else:
    # Jika tidak ada, pakai SQLite (Local Development)
    sqlite_file_name = "database.db"
    sqlite_url = f"sqlite:///{os.path.join(BASE_DIR, sqlite_file_name)}"
    connect_args = {"check_same_thread": False} 
    engine = create_engine(sqlite_url, echo=True, connect_args=connect_args)

#def create_db_table():
    #SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session