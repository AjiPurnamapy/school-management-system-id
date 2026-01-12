# 🚀 Panduan Deploy - Notes API

Panduan ini akan membantu Anda men-deploy aplikasi Notes API ke server production (VPS/Cloud) atau menjalankannya di komputer lokal.

## 📋 Prasyarat
Pastikan server atau komputer Anda sudah terinstall:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

---

## 🛠️ Langkah 1: Persiapan Environment

Aplikasi ini membutuhkan variabel environment untuk keamanan dan konfigurasi database.

### Untuk Production (Docker)
Anda **TIDAK PERLU** membuat file `.env` jika menggunakan layanan Cloud yang menyediakan menu "Environment Variables" (seperti Railway, Render, Fly.io).

Namun jika Anda deploy di VPS (Ubuntu/DigitalOcean) menggunakan Docker Compose, buatlah file `.env.prod`:

```bash
# Contoh isi file .env.prod
SECRET_KEY=gantisayadenganpasswordyangsangatpanjangdanacak123!@#
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
USERNAME_ADMIN=admin
PASSWORD_ADMIN=admin123
TOKEN_ADMIN=rahasia123
SECRET_KEY_ADMIN_SESSION=rahasia_session_admin

# DATABASE_URL akan otomatis di-inject oleh docker-compose.yml jika Anda pakai file default,
# tapi jika pakai database luar (misal Supabase/Neon), isi di sini:
# DATABASE_URL=postgresql://user:pass@host:port/dbname
```

---

## 🚀 Langkah 2: Menjalankan Aplikasi (Production Mode)

1.  **Build dan Jalankan Container**
    Jalankan perintah ini di terminal root folder project:
    ```bash
    docker-compose up -d --build
    ```
    *   `-d`: Menjalankan di background (detach).
    *   `--build`: Memaksa rebuild image agar perubahan kode terbaru terupdate.

2.  **Cek Status**
    Pastikan semua container (backend, db, adminer) statusnya `Up`.
    ```bash
    docker-compose ps
    ```

---

## 🗄️ Langkah 3: Migrasi Database (Wajib!)

Saat pertama kali deploy, database PostgreSQL masih kosong (belum ada tabel). Anda harus menjalankan migrasi Alembic.

1.  **Masuk ke dalam container backend:**
    ```bash
    docker-compose exec backend bash
    ```

2.  **Jalankan perintah upgrade:**
    ```bash
    alembic upgrade head
    ```
    *Jika sukses, tidak akan ada error merah.*

3.  **Keluar dari container:**
    ```bash
    exit
    ```

---

## 🧪 Langkah 4: Testing & Monitoring

*   **API Documentation:** Buka browser dan akses `http://IP-SERVER-ANDA:8000/docs`.
*   **Web App:** Buka `http://IP-SERVER-ANDA:8000/`.
*   **Admin Database:** Buka `http://IP-SERVER-ANDA:8080` (System: PostgreSQL, Server: db, User: postgres, Pass: password123, DB: notes_db).

---

## 💻 Cara Menjalankan Lokal (Tanpa Docker)

Untuk pengembangan sehari-hari di laptop:

1.  Pastikan virtual environment aktif.
2.  Install dependencies: `pip install -r requirements.txt`.
3.  Jalankan server:
    ```bash
    uvicorn backend.main:app --reload
    ```
    *Aplikasi otomatis akan menggunakan SQLite (`database.db`).*

---

## ⚠️ Maintenance

*   **Melihat Log Error:**
    ```bash
    docker-compose logs -f backend
    ```
*   **Restart Server:**
    ```bash
    docker-compose restart backend
    ```
*   **Matikan Server:**
    ```bash
    docker-compose down
    ```
