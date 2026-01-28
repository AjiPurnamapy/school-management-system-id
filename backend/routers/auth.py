import logging
import os
from fastapi import UploadFile, File, APIRouter, Depends, status, Request, BackgroundTasks, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from fastapi.responses import HTMLResponse, RedirectResponse

from backend.database import get_session
from backend.schemas.user import ForgotPasswordRequest, ResetPasswordRequest
from backend.schemas.user import UserCreate, UserRead, ProfileCompleteSchema
from backend.schemas.token import Token
from backend.models import User
from backend.limiter import limiter
from backend.utils.templates import get_error_html
from backend.dependencies import get_current_user

# Import Services
from backend.services.auth_service import auth_service
from backend.services.file_service import file_service

# Setup logging
logger = logging.getLogger(__name__)

# Konfigurasi URL Frontend (dari .env)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(tags=["Authentication"])

@router.post("/register", response_model=UserRead)
@limiter.limit("3/hour")
@limiter.limit("5/day")
def create_user(
    request: Request,
    user_input: UserCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    return auth_service.register_user(session, user_input, background_tasks)

@router.get("/verify")
def verify_email(token: str, session: Session = Depends(get_session)):
    try:
        user = auth_service.verify_email(session, token)
        logger.info(f"User verified successfully: {user.email}")
        return RedirectResponse(f"{FRONTEND_URL}/?verified=true", status_code=302)
    except Exception as e:
        logger.error(f"Verification Error: {e}")
        return HTMLResponse(
            content=get_error_html(str(e.detail) if hasattr(e, 'detail') else "Terjadi kesalahan"),
            status_code=status.HTTP_400_BAD_REQUEST
        )

@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
    ):
    from sqlmodel import select, or_
    from backend.models import User
    from backend.dependencies import verify_password, create_access_token
    
    # Find User by Name OR Email
    statement = select(User).where(
        or_(User.name == form_data.username, User.email == form_data.username)
    )
    user = session.exec(statement).first()

    # Verify Creds
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check Active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email Belum Terverifikasi. Cek inbox email kamu untuk aktivasi"
        )

    # Generate Token
    access_token = create_access_token(
        data={"sub": user.name, "type": "access"}
    )
    
    return Token(access_token=access_token, token_type="bearer")

@router.get("/myprofile", response_model=UserRead)
def check_my_profile(current_user : User = Depends(get_current_user)):
    return current_user

@router.put("/complete-profile", response_model=UserRead)
def complete_profile(
    profile_data: ProfileCompleteSchema,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return auth_service.complete_profile(session, current_user, profile_data)

@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Using FileService
    # Remove old file if exists (optional logic, but good practice)
    if current_user.profile_image:
        file_service.delete_file(current_user.profile_image)

    # Save new file
    # Allowed: jpg, png. Max 2MB
    image_url = await file_service.save_file(
        file, 
        folder="images", 
        allowed_extensions={"jpg", "jpeg", "png"}, 
        max_size_mb=2
    )
    
    current_user.profile_image = image_url
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {"filename": file.filename, "url": image_url}

@router.post("/forgot-password")
@limiter.limit("2/hour")
@limiter.limit("5/day")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    auth_service.forgot_password_request(session, data.email, background_tasks)
    return {"message": "Link reset password telah dikirim ke email."}

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    session: Session = Depends(get_session)
):
    auth_service.reset_password_confirm(session, request.token, request.new_password)
    return {"message": "Password berhasil diubah! Silahkan login dengan password baru."}
