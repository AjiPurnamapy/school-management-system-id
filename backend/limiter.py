"""
Rate Limiter Configuration
==========================
Menggunakan SlowAPI untuk membatasi jumlah request per IP.
Di environment TEST, rate limiter dimatikan agar tidak mengganggu test.
"""

import os
from slowapi import Limiter
from slowapi.util import get_remote_address

# Cek apakah sedang running di test environment
# Pytest set variabel ini otomatis, atau bisa manual set TESTING=1
IS_TESTING = os.getenv("TESTING", "false").lower() in ("true", "1", "yes")

# Inisialisasi limiter
# get_remote_address artinya kita membatasi berdasarkan IP Address user
# Di mode testing, kita disabled rate limiting agar tidak mengganggu test
limiter = Limiter(
    key_func=get_remote_address,
    enabled=not IS_TESTING  # Matikan jika sedang testing
)