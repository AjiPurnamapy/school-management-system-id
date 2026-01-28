# 🏫 School Management System (SaaS Ready)

**School Management System** adalah platform manajemen sekolah modern yang dirancang untuk efisiensi, keamanan, dan skalabilitas. Dibangun dengan teknologi terkini (FastAPI + React), aplikasi ini menangani seluruh ekosistem sekolah mulai dari manajemen user, akademik, hingga pembelajaran (LMS).

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Python](https://img.shields.io/badge/python-v3.10+-blue.svg) ![React](https://img.shields.io/badge/react-v18-blue.svg) ![FastAPI](https://img.shields.io/badge/FastAPI-High_Performance-009688.svg)

---

## 🚀 Fitur Utama

### 1. Manajemen Akademik
*   **Kelas & Wali Kelas**: Admin/Kepala Sekolah dapat membuat kelas dan menunjuk Wali Kelas.
*   **Mata Pelajaran (Subjects)**: Manajemen kurikulum mata pelajaran.
*   **Jadwal Pelajaran**: Sistem penjadwalan otomatis dengan deteksi konflik waktu.
*   **Tugas & PR (Assignments)**: Guru membuat tugas, siswa upload jawaban, dan grading otomatis.
*   **Learning Management (LMS)**: Guru dapat upload materi (PDF, DOCX) untuk siswa.
*   **Sistem Absensi**: Absensi harian per jadwal dengan bulk create, rekap per siswa/kelas.
*   **Analytics Dashboard**: Statistik real-time (total siswa, guru, tugas, kehadiran).

### 2. Hierarki Role & Izin (RBAC)
Sistem memiliki 4 tingkatan akses yang ketat:
1.  **Admin (IT/System)**: Kontrol penuh sistem, manajemen user, konfigurasi global.
2.  **Principal (Kepala Sekolah)**: Manajemen akademik (Kelas, Guru, Jadwal).
3.  **Teacher (Guru)**: Mengelola materi, melihat jadwal, dan siswa di kelasnya.
4.  **Student (Siswa)**: Akses materi pelajaran, jadwal, dan mengirim tugas.

### 3. Keamanan & Performa
*   **Secure Auth**: OAuth2 dengan JWT, Hashing Password (Bcrypt + Pepper).
*   **Rate Limiting**: Perlindungan terhadap brute-force attack (SlowAPI).
*   **Input Validation**: Validasi ketat untuk semua input data dan upload file.
*   **Optimized Queries**: Database indexing dan connection pooling untuk performa tinggi.

### 4. Fitur Produktivitas
*   **Smart Notes**: Catatan pribadi untuk setiap user dengan pencarian real-time.
*   **Cloud Storage**: Penyimpanan file pribadi terintegrasi.
*   **User Profile**: Manajemen profil lengkap (Foto, Alamat, Kontak) dengan validasi.

---

## 🛠️ Teknologi yang Digunakan

### Backend (Server)
*   **Core**: [FastAPI](https://fastapi.tiangolo.com/) (Python Asynchronous Framework)
*   **Database**: SQLModel (SQLAlchemy + Pydantic)
    *   Development: SQLite
    *   Production: PostgreSQL
*   **Security**: Python-Jose (JWT), Passlib (Bcrypt), SlowAPI
*   **Testing**: Pytest (Coverage 95%+)

### Frontend (User Interface)
*   **Framework**: React.js (Vite Build Tool)
*   **Styling**: Modern CSS (Glassmorphism Design System)
*   **State Management**: React Hooks (Context API)
*   **HTTP Client**: Axios dengan Interceptors

---

## 🔌 API Reference

Dokumentasi interaktif (Swagger UI) tersedia di: `http://localhost:8000/docs`

| Modul | Endpoint Prefix | Deskripsi |
| :--- | :--- | :--- |
| **Auth** | `/auth/*` | Login, Register, Reset Password |
| **Users** | `/users/*` | Manajemen data pengguna (Admin Only) |
| **Classes** | `/classes/*` | CRUD Kelas & Wali Kelas (Admin/Principal) |
| **Subjects** | `/subjects/*` | Manajemen Mata Pelajaran |
| **Schedules** | `/schedules/*` | Penjadwalan & Konflik Checker |
| **Assignments**| `/assignments/*` | Pembuatan & Manajemen Tugas |
| **Submissions**| `/submissions/*` | Pengumpulan & Penilaian Tugas |
| **Materials** | `/materials/*` | Upload & Download Materi Pelajaran |
| **Notes** | `/notes/*` | Catatan Pribadi User |
| **Files** | `/files/*` | Personal Cloud Storage |
| **Analytics** | `/analytics/*` | Dashboard Statistik (Siswa, Guru, Tugas) |
| **Attendance** | `/attendance/*` | Sistem Absensi Harian (CRUD + Bulk) |

---

## ⚙️ Cara Instalasi & Menjalankan

### Persyaratan
*   Python 3.10 ke atas
*   Node.js 18 ke atas

### 1. Setup Backend
```bash
cd backend
# Buat Virtual Environment
python -m venv venv
# Aktifkan Venv (Windows)
venv\Scripts\activate
# Install Dependencies
pip install -r requirements.txt
# Jalankan Server
python -m uvicorn backend.main:app --reload
```

### 2. Setup Frontend
```bash
cd frontend
# Install Modules
npm install
# Jalankan Website
npm run dev
```

### 3. Konfigurasi Environment (.env)
Copy file `.env.example` menjadi `.env` dan sesuaikan isinya:
```env
SECRET_KEY=isi_dengan_string_acak_rahasia
ALGORITHM=HS256
FRONTEND_URL=http://localhost:5173
```

---

## 🧪 Testing

Jalankan suite testing otomatis untuk memastikan kestabilan sistem:

```bash
# Jalankan semua test
pytest tests/ -v

# Jalankan test spesifik
pytest tests/test_endpoints.py -v
```

---

## 📄 Lisensi
Project ini dilisensikan di bawah [MIT License](LICENSE).
