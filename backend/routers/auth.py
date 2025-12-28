import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from jose import jwt, JWTError
from fastapi.responses import HTMLResponse
from sqlalchemy.exc import IntegrityError

from backend.database import get_session
from backend.schemas.user import UserCreate, UserRead
from backend.schemas.token import Token
from backend.models import User
from backend.limiter import limiter
from backend.email import send_verification_email
from backend.utils.templates import get_error_html, get_success_html
from backend.dependencies import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    ALGORITHM,
    SECRET_KEY
)
# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])

@router.post("/register", response_model=UserRead)
async def create_user(
    user_input: UserCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    # konversi dari UserCreate (schema) ke User (model database)
    user_db = User.model_validate(user_input)
    # hash password dan timpa password asli dengan yang sudah diacak
    user_db.password = get_password_hash(user_input.password)
    user_db.is_active = False

    try:
        session.add(user_db)        # menyimpan data ke memori python
        session.commit()            # mengirim datanya ke database
        session.refresh(user_db)    # mengambil data yang tadi dari database

        # buat token verifikasi (beda dengan token login)
        verify_token = create_access_token(
            data={"sub": user_db.email, "type" : "email_verification"}
        )

        # kirim email
        background_tasks.add_task(
            send_verification_email,
            user_db.email,
            user_db.name,
            verify_token
        )
        logger.info(f"New user registered: {user_db.name} ({user_db.email})")
        return user_db              
    
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username atau Email sudah terdaftar"
        )
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Terjadi kesalahan pada sistem"
        )

# endpoint khusus verifikasi
@router.get("/verify", response_class=HTMLResponse)
def verify_email(token: str, session: Session = Depends(get_session)):
    try:
        # Deskripsi token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")

        # validasi token type untuk keamanan
        if email is None or token_type != "email_verification":
            logger.warning("Invalid Verification token attemted")
            return HTMLResponse(
                content= get_error_html ("Token tidak valid"),
                status_code=status.HTTP_400_BAD_REQUEST
            )
    except JWTError as e:
        logger.warning(f"JWT error during verification: {str(e)}")
        return HTMLResponse(
            content= get_error_html ("Token Kadaluarsa atau rusak"),
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # cari user berdasarkan email dari token
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()

    if not user:
        logger.warning(f"Verification attemted for non-existent email: {email}")
        return HTMLResponse(
            content= get_error_html("User tidak ditemukan"),
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # cek apakah user sudah aktif sebelumnya
    if user.is_active:
        logger.info(f"User already verified: {user.email}")
        return HTMLResponse(
            content= get_success_html(
                "Akun Sudah Aktif",
                "Akun Kamu sudah diverifikasi sebelumnya. silahkan login."
            ),
            status_code=status.HTTP_200_OK
        )
    try:
        user.is_active = True
        session.add(user)
        session.commit()
        logger.info(f"User verified successfully: {user.email}")

        return HTMLResponse(
            content= get_success_html(
                "Verifikasi Berhasil!",
                "Akun Kamu sekarang sudah aktif. silahkan kembali ke aplikasi untuk login."
            ),
            status_code=status.HTTP_200_OK
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Error activating user {email} : {str(e)}")
        return HTMLResponse(
            content= get_error_html("Terjadi kesalahan sistem"),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
    ):
    # cari user di database berdasarkan username 
    statement = select(User).where(User.name == form_data.username)
    user = session.exec(statement).first()
    
    # cek user ada atau tidak, cek password cocok atau tidak
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # cek apakah user sudah terverifikasi
    if not user.is_active:
        logger.warning(f"Unverified user attemted login : {user.name}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email Belum Terverifikasi. Cek inbox email kamu sekarang juga untuk aktivasi"
        )
    # jika lolos, buatkan token dengan type identifier
    access_token = create_access_token(
        data={"sub": user.name, "type":"access"}
    )
    logger.info(f"User Logged in successfully: {user.name}")
    return {"access_token": access_token, "token_type": "bearer"}

# endpoint khusus data pribadi user
@router.get("/myprofile", response_model=UserRead)
def check_my_profile(current_user : User = Depends(get_current_user)):
    return current_user