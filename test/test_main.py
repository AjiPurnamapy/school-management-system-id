import sys
import os
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

# Trik navigasi, agar folder test bisa melihat folder bakckend
current_file_dir = os.path.dirname(os.path.abspath(__file__))
root_project = os.path.join(current_file_dir, "..")
backend_folder = os.path.join(root_project, "backend")

sys.path.insert(0, root_project) # agar bisa from backend.main
sys.path.insert(0, backend_folder) # supaya bisa main.py 'from routers'

# import app dari main.py
from backend.main import app
from backend.database import get_session

# sqlite:// artinya tes ini akan menggunakan RAM(memory) bukan file fisik
# staticpool memastikan koneksi stabil di memory
TEST_DATABASE_URL = "sqlite://"
engine_test = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

def get_session_override():
    # buat table kosong di RAM seperti alembic tapi instan
    SQLModel.metadata.create_all(engine_test)

    with Session(engine_test) as session:
        yield session

    # opsional untuk dilakukan hapus table yg di atas setelah selesai
    #     SQLModel.metadata.create_all(engine_test)

# pasang jebakan override, tidak memberikan get_session yg mengarah ke database asli
# dan hanya memberikan yg override
app.dependency_overrides[get_session] = get_session_override

# membuat client (pengganti postman)
client = TestClient(app)

# skenario 1 cek health
def test_read_root():
    #simulasi user nembak GET ke "/"
    response = client.get("/")

    # assert (tuntutan) memastikan status code 200 OK(bukan 404, 500)
    assert response.status_code == 200

    # sesuaikan teks di dalam dictionary, pastikan sesuai dengan isi endpoint get "/"
    # kalau di main py return {"message": "Hello world"} tulis sama persis
    assert response.json() == {"message": "Hello World"}

# skenario 2 register user
def test_create_user():
    # data pendaftaran
    payload = {
        "email": "sentana23@gmail.com",
        "name": "senta",
        "age": "24",
        "password": "sentana2323"
    }

    # tembak endpoint register (POST)
    # sesuaikan dengan URL "/auth/register" yg ada di routers
    response = client.post("/register", json=payload)

    print("\n" + "=" * 30)
    print("PESAN DARI SERVER :", response.json())
    print("="*30 + "\n")

    # melakukan validasi akhir Sukses (200 OK) atau (201 Created)
    assert response.status_code == 200

    data = response.json()
    assert data ["email"] == "sentana23@gmail.com"
    assert "id" in data  # pastikan dia punya id (artinya masuk DB)
    assert "password" not in data # pastikan password tidak dikembalikan (security)