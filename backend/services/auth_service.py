import logging
from fastapi import HTTPException, status, BackgroundTasks
from sqlmodel import Session, select, or_
from sqlalchemy.exc import IntegrityError
from jose import jwt, JWTError

from backend.models import User
from backend.schemas.user import UserCreate, ProfileCompleteSchema
from backend.schemas.token import Token
from backend.dependencies import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    SECRET_KEY, 
    ALGORITHM
)
from backend.mail_service import send_verification_email, send_reset_password_email

logger = logging.getLogger(__name__)

class AuthService:
    
    def register_user(self, session: Session, user_input: UserCreate, background_tasks: BackgroundTasks) -> User:
        # 1. Convert Schema to Model
        user_db = User.model_validate(user_input)
        user_db.password = get_password_hash(user_input.password)
        user_db.is_active = False # Default inactive until email verified

        try:
            # 2. Save to DB
            session.add(user_db)
            session.commit()
            session.refresh(user_db)

            # 3. Create Verification Token
            verify_token = create_access_token(
                data={"sub": user_db.email, "type": "email_verification"}
            )

            # 4. Send Email (Background)
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
                detail="Terjadi kesalahan pada sistem saat registrasi"
            )

    def verify_email(self, session: Session, token: str) -> User:
        try:
            # Decode Token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            token_type = payload.get("type")

            if email is None or token_type != "email_verification":
                raise ValueError("Invalid Token Structure")

        except JWTError:
            raise HTTPException(status_code=400, detail="Token Kadaluarsa atau rusak")
        except ValueError:
            raise HTTPException(status_code=400, detail="Token tidak valid")

        # Find User
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()

        if not user:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")

        if user.is_active:
            return user # Already verified

        # Activate
        user.is_active = True
        session.add(user)
        session.commit()
        session.refresh(user)
        
        return user

    def authenticate_user(self, session: Session, username_or_email: str, password: str) -> Token:
        # Find User by Name OR Email
        statement = select(User).where(
            or_(User.name == username_or_email, User.email == username_or_email)
        )
        user = session.exec(statement).first()

        # Verify Creds
        if not user or not verify_password(password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check Active
        if not user.is_active:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email Belum Terverifikasi. Cek inbox email kamu sekarang juga untuk aktivasi"
            )

        # Generate Token
        access_token = create_access_token(
            data={"sub": user.name, "type": "access"}
        )
        
        return {"access_token": access_token, "token_type": "bearer"}

    def complete_profile(self, session: Session, user: User, data: ProfileCompleteSchema) -> User:
        user.nis = data.nis
        user.address = data.address
        user.phone = data.phone
        user.birth_date = data.birth_date
        user.is_profile_complete = True
        
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    def forgot_password_request(self, session: Session, email: str, background_tasks: BackgroundTasks):
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="Email tidak terdaftar")
            
        reset_token = create_access_token(
            data={"sub": user.email, "type": "reset_password"} 
        )
        
        background_tasks.add_task(send_reset_password_email, user.email, reset_token)

    def reset_password_confirm(self, session: Session, token: str, new_password: str):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            token_type = payload.get("type")
            
            if token_type != "reset_password":
                raise HTTPException(status_code=400, detail="Token tidak valid untuk reset password")
                
        except JWTError:
            raise HTTPException(status_code=400, detail="Token Kadaluarsa atau rusak")
            
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
             raise HTTPException(status_code=404, detail="User tidak ditemukan")
             
        user.password = get_password_hash(new_password)
        session.add(user)
        session.commit()

# Singleton
auth_service = AuthService()
