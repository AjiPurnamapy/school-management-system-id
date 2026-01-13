# 📒 Notes App Ecosystem (Fullstack)

**Notes App** adalah sistem manajemen produktivitas lengkap (Web Dashboard + Backend API) yang dibangun dengan standar industri. Fokus utama project ini adalah performa, keamanan, dan *User Experience* (UX) yang modern.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Python](https://img.shields.io/badge/python-v3.10+-blue.svg) ![React](https://img.shields.io/badge/react-v18-blue.svg)

---

## 🚀 Fitur Unggulan

### 🔐 Autentikasi Modern
*   **Secure Login**: Mendukung Login via Email atau Username.
*   **Email Verification**: Alur aktivasi akun via email SMTP (Gmail).
*   **Forgot Password**: Fitur reset password yang aman dengan token.
*   **JWT Security**: Sesi user dilindungi JSON Web Token & Bcrypt Hashing.

### 📝 Smart Notes (Catatan)
*   **Search Engine**: Pencarian catatan *real-time* (Debounced).
*   **Sorting**: Urutkan catatan berdasarkan tanggal terbaru/terlama.
*   **Pagination**: Load ribuan catatan tanpa berat (Server-side logic).
*   **Rich UI**: Tampilan Masonry Grid (seperti Pinterest).

### ☁️ Personal Cloud Storage (New!)
*   **File Manager**: Upload, simpan, dan kelola file pribadi (PDF, DOCX, JPG).
*   **Type Validation**: Proteksi upload hanya untuk file aman.
*   **Storage Cap**: Batas ukuran file 5MB per upload.

---

## 🛠️ Tech Stack

### Backend (Server)
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python High Performance)
*   **Database**: SQLite (Dev) / PostgreSQL (Prod) via **SQLModel**
*   **Security**: OAuth2, JWT, Passlib (Bcrypt), SlowAPI (Rate Limiter)
*   **Background Tasks**: Handling kirim email tanpa blocking.

### Frontend (Client)
*   **Framework**: React.js (Vite Bundle)
*   **Styling**: CSS Modules + Glassmorphism UI
*   **HTTP Client**: Axios dengan Interceptors (Otomatis refresh token/handle error)
*   **Navigation**: React Router DOM v6

---

## 🔌 API Reference (Endpoints)

Dokumentasi lengkap (Swagger UI) tersedia di: `http://localhost:8000/docs`

| Fitur | Method | Path | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/register` | Daftar akun baru |
| | `POST` | `/auth/token` | Login (Dapat Access Token) |
| | `POST` | `/auth/forgot-password` | Request link reset password |
| **Notes** | `GET` | `/notes/?q={kw}&page=1` | Cari & lihat catatan |
| | `POST` | `/notes/` | Buat catatan baru |
| **Files** | `POST` | `/files/upload` | Upload file ke Cloud |
| | `GET` | `/files/` | Lihat list file saya |
| | `DELETE` | `/files/{id}` | Hapus file permanen |

---

## ⚙️ Cara Menjalankan (Local Development)

### 1. Setup Backend
```bash
cd backend
# Buat Virtual Environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Install Dependencies
pip install -r requirements.txt
# Jalankan Server
uvicorn backend.main:app --reload
```

### 2. Setup Frontend
```bash
cd frontend
# Install Modules
npm install
# Jalankan Website
npm run dev
```

### 3. Konfigurasi (.env)
Pastikan membuat file `.env` di root folder dengan isi:
```env
# Backend
SECRET_KEY=isi_bebas_rahasia
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
FRONTEND_URL=http://localhost:5173

# Email (SMTP)
MAIL_USERNAME=email@gmail.com
MAIL_PASSWORD=app_password_google
```

---

## 📄 Deployment
Panduan lengkap untuk deploy ke server (VPS/Railway) tersedia di:
👉 **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)**
