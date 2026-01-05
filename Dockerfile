# Base Image: Kita pakai Python versi ringan (Slim) biar hemat memori
FROM python:3.10-slim

# Setup Environment Variables
# PYTHONDONTWRITEBYTECODE: Mencegah python bikin file .pyc (sampah cache)
# PYTHONUNBUFFERED: Biar log langsung muncul di terminal (penting buat debugging)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Work Directory: Kita bikin folder kerja di dalam kontainer bernama /app
WORKDIR /app

# 4. Install Dependencies (Layer Caching Strategy)
# copy requirements.txt DULUAN sebelum kodingan lain.
# Supaya kalau kamu cuma ubah kodingan (tanpa nambah library),
# Docker gak perlu install ulang semua library dari awal. Hemat waktu build.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Source Code
# Masukkan semua file dari laptopmu ke dalam folder /app di kontainer
COPY . .

# Command to Run
# Perintah yang otomatis jalan saat kontainer dinyalakan
# host 0.0.0.0 artinya: "Dengarkan request dari luar kontainer ini"
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]