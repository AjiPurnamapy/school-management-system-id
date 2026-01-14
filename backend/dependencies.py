import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone # untuk menambahkan waktu dan batas waktu
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer  # Untuk form login
from sqlmodel import Session, select
from passlib.context import CryptContext    # untuk mengubah password
from jose import JWTError, jwt 
from backend.database import get_session
from backend.models import User
from pathlib import Path

# ... (existing imports)



# cari lokasi file ini (dependencies.py) berada
current_file_path = Path(__file__).resolve()

# mundur 2 langkah untuk dapat folder root (BELAJAR-BACKEND)
project_root = current_file_path.parent.parent

# gabungkan dengan file .env
env_path = project_root / ".env"

load_dotenv(dotenv_path=env_path)

# konfigurasi keamanan dan kunci rahasia
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)) # batas waktu penggunaan token (menit)
SECURITY_PEPPER = os.getenv("SECURITY_PEPPER", "") # Pepper Rahasia

if not SECRET_KEY:
    raise ValueError("FATAL ERROR: SECRET_KEY tidak ditemukan di file .env!")

# konfigurasi dan seting agar menggunakan algoritma bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_password_hash(password: str) -> str : # ' -> ' keluaran berupa string
    return pwd_context.hash(password + SECURITY_PEPPER)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password + SECURITY_PEPPER, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# dependency pengecekan token
def get_current_user(token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
):
    # baca tokennya (decode)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah kadaluarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")  # mengambil nama user dari dalam token 
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    # untuk memastikan data user masih ada, tidak dihapus (admin)
    statement = select(User).where(User.name == username)
    user = session.exec(statement).first()
    if user is None:
        raise credentials_exception
    return user

