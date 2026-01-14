import os
import time
from dotenv import load_dotenv
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse
from backend.models import User, Note, UserFile, SchoolClass

load_dotenv()
USERNAME_ADMIN = os.getenv("USERNAME_ADMIN")
PASSWORD_ADMIN = os.getenv("PASSWORD_ADMIN")
TOKEN_ADMIN = os.getenv("TOKEN_ADMIN")
SECRET_KEY_ADMIN = os.getenv("SECRET_KEY_ADMIN_SESSION")
MAX_SESSION_TIME = 3600 

# Cek kelengkapan konfigurasi
config_complete = all([USERNAME_ADMIN, PASSWORD_ADMIN, TOKEN_ADMIN, SECRET_KEY_ADMIN])

if not config_complete:
    print("WARNING: Konfigurasi Admin tidak lengkap. Fitur Admin Panel dinonaktifkan.")
    
    # Dummy function agar main.py tidak error saat memanggil setup_admin
    def setup_admin(app, engine):
        print("[INFO] Admin Panel skipped (Missing Config)")
        pass

else:
    # Definisi Kelas Admin hanya jika config lengkap
    class AdminAuth(AuthenticationBackend):
        async def login(self, request: Request) -> bool:
            form = await request.form()
            username = form.get("username")
            password = form.get("password")
            
            # validasi manual hardcode (bisa di ganti .env)
            if username == USERNAME_ADMIN and password == PASSWORD_ADMIN:
                # simpan tiket di session
                request.session.update({
                    "token": TOKEN_ADMIN,
                    "login_time": time.time()
                    })
                return True
            return False
        
        async def logout(self, request: Request) -> bool:
            # hapus tiket dari session
            request.session.clear()
            return True
        
        async def authenticate(self, request: Request) -> bool:
            token = request.session.get("token")
            login_time = request.session.get("login_time") 
        
            if not token or token != TOKEN_ADMIN:
                return False
            
            if not login_time:
                return False
            
            if time.time() - login_time > MAX_SESSION_TIME:
                request.session.clear()
                return False
            
            return True
        

    class UserAdmin(ModelView, model=User):
        column_list = [User.id, User.email, User.name, User.role, User.class_id, User.is_active]
        # Sembunyikan relasi Notes & Files dari Form Edit agar tidak berat/membingungkan
        form_excluded_columns = [User.notes, User.files]
        can_create = True
        can_delete = True
        can_edit = True
        icon = "fa-solid fa-user"

    class SchoolClassAdmin(ModelView, model=SchoolClass):
        column_list = [SchoolClass.id, SchoolClass.name, SchoolClass.grade_level, SchoolClass.wali_kelas_id]
        can_create = True
        can_edit = True
        can_delete = True
        icon = "fa-solid fa-school"

    class NotesAdmin(ModelView, model=Note):
        column_list = [Note.id, Note.title, Note.content, Note.owner_id]
        can_create = True
        can_edit = True
        can_delete = True
        icon = "fa-solid fa-book"

    class UserFileAdmin(ModelView, model=UserFile):
        column_list = [UserFile.id, UserFile.filename, UserFile.file_type, UserFile.owner_id]
        can_create = False 
        can_edit = True
        can_delete = True
        icon = "fa-solid fa-file"

    def setup_admin(app, engine):
        # inisialisasi keamanan (kunci untuk session browser)
        authentication_backend = AdminAuth(secret_key=SECRET_KEY_ADMIN)

        admin = Admin(app, engine, authentication_backend=authentication_backend)
        admin.add_view(UserAdmin)
        admin.add_view(SchoolClassAdmin)
        admin.add_view(NotesAdmin)
        admin.add_view(UserFileAdmin)