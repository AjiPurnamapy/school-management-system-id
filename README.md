# 📒 Notes API Service

**Notes API** adalah layanan backend modern untuk aplikasi manajemen catatan pribadi. Dibangun dengan fokus pada performa, keamanan, dan skalabilitas menggunakan teknologi terbaru.

---

## 🚀 Fitur Utama

### 🔐 Keamanan & Autentikasi
*   **JWT Authentication**: Login aman menggunakan JSON Web Token.
*   **Password Hashing**: Password user dilindungi dengan algoritma Bcrypt.
*   **Email Verification**: Sistem verifikasi email wajib sebelum login untuk mencegah akun spam.

### 📝 Manajemen Catatan
*   **CRUD Operations**: Create, Read, Update, dan Delete catatan dengan mudah.
*   **Ownership Security**: User hanya bisa mengedit dan menghapus catatan miliknya sendiri.
*   **Pagination**: Mendukung pengambilan data dalam jumlah besar dengan sistem halaman (offset/limit).

### 🛡️ Proteksi & Optimasi
*   **Rate Limiting**: Mencegah serangan brute-force atau spam request (Max 5 login attempt / menit).
*   **Async Database**: Menggunakan SQLModel & Async session untuk performa tinggi.
*   **Docker Ready**: Siap di-deploy kapan saja menggunakan Docker & Docker Compose.

---

## 🛠️ Tech Stack

*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
*   **Database**: PostgreSQL (Production) / SQLite (Development)
*   **ORM**: SQLModel (kombinasi Pydantic & SQLAlchemy)
*   **Schema Migration**: Alembic
*   **Container**: Docker & Docker Compose

---

## 📖 Dokumentasi API

Salah satu keunggulan FastAPI adalah dokumentasi yang **Terbuat Otomatis**. Anda tidak perlu membaca file teks statis panjang.

Setelah aplikasi berjalan (baik lokal maupun server), akses URL berikut:

### 1. Swagger UI (Interaktif)
📍 **URL**: `/docs` (contoh: `http://localhost:8000/docs`)
*   Dashboard visual untuk mencoba semua endpoint secara langsung.
*   Bisa tombol "Try it out" untuk mengirim request sungguhan.
*   Otomatis mendeteksi skema data Input & Output.

### 2. ReDoc (Referensi Statis)
📍 **URL**: `/redoc` (contoh: `http://localhost:8000/redoc`)
*   Dokumentasi yang lebih bersih dan rapi, cocok untuk dibagikan ke tim Frontend.

---

## 🔌 Daftar Endpoint Singkat

Berikut adalah ringkasan path yang tersedia:

### Authentication (`/auth`)
| Method | Path | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/register` | Mendaftar user baru |
| `POST` | `/token` | Login untuk mendapatkan Access Token |
| `GET` | `/verify` | Verifikasi email (link dari email) |
| `GET` | `/myprofile` | Melihat data user yang sedang login |

### Notes (`/notes`)
| Method | Path | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/notes/` | Membuat catatan baru |
| `GET` | `/notes/` | Melihat daftar catatan (support pagination) |
| `PUT` | `/notes/{id}` | Edit catatan |
| `DELETE` | `/notes/{id}`| Hapus catatan |

---

## ⚙️ Cara Install & Deploy

Silahkan baca panduan lengkap deployment di file terpisah:
👉 **[BACA PANDUAN DEPLOY (DEPLOY_GUIDE.md)](DEPLOY_GUIDE.md)**
