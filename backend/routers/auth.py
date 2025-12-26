from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from jose import jwt, JWTError
from fastapi.responses import HTMLResponse

from backend.database import get_session
from backend.schemas.user import UserCreate, UserRead
from backend.schemas.token import Token
from backend.models import User
from backend.limiter import limiter
from backend.email import send_verification_email
from backend.dependencies import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    ALGORITHM,
    SECRET_KEY
)

router = APIRouter(tags=["Authentication"])

@router.post("/register", response_model=UserRead)
def create_user(
    user_input: UserCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    # cek username kembar
    existing_user = session.exec(select(User).where(User.name ==user_input.name)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="username sudah dipakai")
    
    # cek email kembar (wajib, verifkasi via email)
    existing_email = session.exec(select(User).where(User.email == user_input.email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    
    # konversi dari UserCreate (schema) ke User (model database)
    user_db = User.model_validate(user_input)
    # hash password dan timpa password asli dengan yang sudah diacak
    user_db.password = get_password_hash(user_input.password)
    user_db.is_active = False

    session.add(user_db)        # menyimpan data ke memori python
    session.commit()            # mengirim datanya ke database
    session.refresh(user_db)    # mengambil data yang tadi dari database

    # buat token verifikasi (beda dengan token login)
    verify_token = create_access_token(data={"sub": user_db.email})
    # kirim email
    background_tasks.add_task(send_verification_email, user_db.email, user_db.name, verify_token)

    return user_db              # menampilkan data ke user

# endpoint khusus verifikasi
@router.get("/verify", response_class=HTMLResponse)
def verify_email(token: str, session: Session = Depends(get_session)):
    try:
        # Deskripsi token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            return HTMLResponse(content="<h1 style='color:red; text-align:center;'>Error: Token Tidak Valid</h1>", status_code=400)
    except JWTError:
        return HTMLResponse(content="<h1 style='color:red; text-align:center;'>Error: Token Kadaluarsa / Rusak </h1>", status_code=400)
    
    # cari user berdasarkan email dari token
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()

    if not user:
        return HTMLResponse(content="<h1 style='color:red; text-align:center;'>Token Tidak Ditemukan</h1>", status_code=404)

    if not user.is_active:
        user.is_active = True
        session.add(user)
        session.commit()

    # Tampilan halaman sukses html
    html_content = """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Verifikasi Sukses</title>
            <style>
                body{
                    font-family:Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background-color: #f4f4f9;
                    margin: 0;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    text-align: center;
                }
                h1 {color: #4CAF50;}
                p {color: #555; font-size: 18px;}
                .btn {
                    margin-top: 20px;
                    display: inline-block;
                    background-color: #4CAF50;
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    transition: background 0.3s;
                }
                .btn:hover {background-color: #45a049; }
            </style>
        </head>
        <body>
            <div class="container">
            <h1>Verifikasi Berhasil! </h1>
            <p>Akun kamu sekarang sudah aktif.</p>
            <p>Silahkan kembali ke aplikasi untuk login</p>
            <a href="http://127.0.0.1:8000/docs" class="btn">Masuk ke Aplikasi</a>
            </div>
        </body>
    </html>
    """

    return HTMLResponse(content=html_content, status_code=200)

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
        raise HTTPException(
            status_code=400,
            detail="Email Belum Terverifikasi. Cek inbox email kamu sekarang juga untuk aktivasi"
        )
    # jika lolos, buatkan token
    access_token = create_access_token(data={"sub": user.name})
    return {"access_token": access_token, "token_type": "bearer"}

# endpoint khusus data pribadi user
@router.get("/myprofile", response_model=UserRead)
def check_my_profile(current_user : User = Depends(get_current_user)):
    return current_user