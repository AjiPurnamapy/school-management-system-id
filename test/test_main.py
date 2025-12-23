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

    # buka koneksi ke RAM
    with Session(engine_test) as session:
        yield session

    # opsional untuk dilakukan hapus table yg di atas setelah selesai
    #     SQLModel.metadata.create_all(engine_test)

# pasang jebakan override, tidak memberikan ke router get_session yg mengarah ke database asli
# dan hanya memberikan yg override (database RAM)
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
        "email": "ajip23@gmail.com",
        "name": "aji_tes_buat",
        "age": 24,
        "password": "ajipurnama123"
    }

    # tembak endpoint register (POST)
    # sesuaikan dengan URL "/register" yg ada di routers
    response = client.post("/register", json=payload)

    print("\n" + "=" * 30)
    print("PESAN DARI SERVER :", response.json())
    print("="*30 + "\n")

    # 'assert' untuk mengecek/melakukan validasi akhir Sukses (200 OK) atau (201 Created) sesuaikan
    assert response.status_code == 200

    data = response.json()
    assert data ["email"] == "ajip23@gmail.com"
    assert "id" in data  # pastikan dia (data user) punya id yg otomatis di berikan DB (artinya masuk DB)
    assert "password" not in data # pastikan agar password tidak dikembalikan ke user(security)

# skenario 3 cek token login akses
def test_login_user():
    # register usernya biar ada di database dan harus beda email dan name-nya
    setup_payload = {
        "email": "ajip234@gmail.com",
        "name": "aji_tes_login",
        "age": 21,
        "password": "ajipurnama123"
    }
    client.post("/register", json=setup_payload)

    # siapkan payload login
    # key-nya harus "username" (karena aturan FastAPI)
    # valuenya adalah "aji_tes_login" (karena logikanya login pakai name yg akan berubah menjadi username)
    login_payload = {
        "username": "aji_tes_login",
        "password": "ajipurnama123"
    }
    
    # tembak endpoint pakai data=..., bukan json=...
    response = client.post("/token", data=login_payload)

    # cek hasil
    print("\nRESPONSE LOGIN:", response.json())
    assert response.status_code == 200
    assert "access_token" in response.json()