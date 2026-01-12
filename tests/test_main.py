from backend.main import app
from backend.models import User
from sqlmodel import select, Session

# skenario 1 cek health
def test_read_root(client):
    #simulasi user nembak GET ke "/"
    response = client.get("/")

    # assert (tuntutan) memastikan status code 200 OK(bukan 404, 500)
    assert response.status_code == 200

    # sesuaikan teks di dalam dictionary, pastikan sesuai dengan isi endpoint get "/"
    # kalau di main py return {"message": "Hello world"} tulis sama persis
    assert response.json() == {"message": "Hello World"}

# skenario 2 register user
def test_create_user(client):
    # data pendaftaran
    payload = {
        "email": "ajip23@gmail.com",
        "name": "aji_tes_buat",
        "age": 21,
        "password": "ajipurnama123"
    }

    # tembak endpoint register (POST)
    # sesuaikan dengan URL "/register" yg ada di routers
    response = client.post("/register", json=payload)
    print("PESAN DARI SERVER :", response.json())

    # 'assert' untuk mengecek/melakukan validasi akhir Sukses (200 OK) atau (201 Created) sesuaikan
    assert response.status_code == 200

    data = response.json()
    assert data ["email"] == "ajip23@gmail.com"
    assert "id" in data  # pastikan dia (data user) punya id yg otomatis di berikan DB (artinya masuk DB)
    assert "password" not in data # pastikan agar password tidak dikembalikan ke user(security)

# skenario 3 cek token login akses
def test_login_user(client, session: Session):
    # register usernya biar ada di database dan harus beda email dan name-nya
    client.post("/register", json={
        "email": "ajip234@gmail.com",
        "name": "aji_tes_login",
        "age": 23,
        "password": "ajipurnama123",
        "is_active": True
    })

    user = session.exec(select(User).where(User.email == "ajip234@gmail.com")).first()
    user.is_active = True
    session.add(user)
    session.commit()

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

# skenario 4 CRUD notes
def test_create_notes(client, token):
    # bisa langsung pakai token dari fixture gaperlu login/regis manual

    # create note,  pastikan ada (header authorization) tanpa ini server error 401
    headers = {
        "Authorization": f"Bearer {token}"
    }

    # siapkan data yg akan dimasukkan ke notes
    note_payload = {
        "title": "Aku programer",
        "content": "percobaan pertama"
    }
    response = client.post("/notes", json=note_payload, headers=headers)

    print("\nResponse Notes", response.json())

    # validasi (assert)
    assert response.status_code==200
    data = response.json()
    assert data["title"] == "Aku programer"
    assert "id" in data
    assert "owner_id" in data

# skenario 5: Test Pencarian & Sorting
def test_search_notes(client, token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Buat 2 Catatan berbeda
    client.post("/notes", json={"title": "Belajar Python", "content": "Seru banget"}, headers=headers)
    client.post("/notes", json={"title": "Resep Nasi Goreng", "content": "Pakai kecap"}, headers=headers)
    
    # 2. Cari "Python"
    # Harusnya cuma ketemu 1 (Belajar Python)
    res_python = client.get("/notes/?q=Python", headers=headers)
    assert len(res_python.json()) == 1
    assert res_python.json()[0]["title"] == "Belajar Python"
    
    # 3. Cari "Goreng"
    # Harusnya cuma ketemu 1 (Resep Nasi Goreng)
    res_masak = client.get("/notes/?q=Goreng", headers=headers)
    assert len(res_masak.json()) == 1
    assert res_masak.json()[0]["title"] == "Resep Nasi Goreng"

    # 4. Cari "Zat Besi" (Gak ada)
    res_zonk = client.get("/notes/?q=Zat Besi", headers=headers)
    assert len(res_zonk.json()) == 0

# skenario 6: Test Login pakai Email
def test_login_by_email(client, session: Session):
    # 1. Register User
    client.post("/register", json={
        "email": "login_email@gmail.com",
        "name": "user_pake_email",
        "age": 25,
        "password": "Password123",
        "is_active": True
    })
    
    # activasi manual 
    user = session.exec(select(User).where(User.email == "login_email@gmail.com")).first()
    if user:
        user.is_active = True
        session.add(user)
        session.commit()

    # 2. Login pakai EMAIL di field username
    login_payload = {
        "username": "login_email@gmail.com", # <--- PAKE EMAIL
        "password": "Password123"
    }
    response = client.post("/token", data=login_payload)
    assert response.status_code == 200
    assert "access_token" in response.json()

# skenario 7: Test Forgot & Reset Password
def test_forgot_password_flow(client, session: Session):
    from backend.dependencies import create_access_token
    
    email = "forgot_user@gmail.com"
    # 1. Register
    client.post("/register", json={
        "email": email,
        "name": "User Lupa",
        "age": 30,
        "password": "OldPassword123",
        "is_active": True
    })
    
    # activasi manual agar bisa login di akhir test
    user = session.exec(select(User).where(User.email == email)).first()
    if user:
        user.is_active = True
        session.add(user)
        session.commit()
    
    # 2. Request Forgot Password
    res_forgot = client.post("/forgot-password", json={"email": email})
    assert res_forgot.status_code == 200
    assert "Link reset password telah dikirim" in res_forgot.json()["message"]
    
    # 3. Simulate getting token (Manual Generate karena backend cuma print)
    reset_token = create_access_token(
        data={"sub": email, "type": "reset_password"}
    )
    
    # 4. Reset Password
    res_reset = client.post("/reset-password", json={
        "token": reset_token,
        "new_password": "NewPassword123"
    })
    assert res_reset.status_code == 200
    
    # 5. Login dengan password baru (Username diisi email)
    res_login = client.post("/token", data={
        "username": email,
        "password": "NewPassword123"
    })
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()

def test_reset_password_preserves_photo(client, session: Session):
    from backend.dependencies import create_access_token
    
    email = "photo_user@gmail.com"
    # 1. Register
    client.post("/register", json={
        "email": email,
        "name": "User Photo",
        "age": 28,
        "password": "OldPassword123",
        "is_active": True
    })
    
    # 2. Set Profile Image manually
    user = session.exec(select(User).where(User.email == email)).first()
    user.profile_image = "/static/images/my_cool_photo.jpg"
    session.add(user)
    session.commit()
    
    # 3. Reset Password Flow
    reset_token = create_access_token(data={"sub": email, "type": "reset_password"})
    
    res_reset = client.post("/reset-password", json={
        "token": reset_token,
        "new_password": "NewPassword123"
    })
    assert res_reset.status_code == 200
    
    # 4. Verify Photo is still there
    session.refresh(user) # Refresh data from DB
    assert user.profile_image == "/static/images/my_cool_photo.jpg"
    assert user.profile_image is not None

# skenario 8: Test Buffer Overflow (Security)
def test_security_buffer_overflow(client):
    # Simulasi serangan buffer overflow (misal password 20.000 karakter)
    long_string = "a" * 20000 
    payload = {
        "email": "hacker@example.com",
        "name": "hacker",
        "age": 20,
        "password": long_string
    }
    response = client.post("/register", json=payload)
    
    # Harusnya ditolak oleh Pydantic (422 Unprocessable Entity)
    # Bukan 500 Internal Server Error (Crash)
    assert response.status_code == 422