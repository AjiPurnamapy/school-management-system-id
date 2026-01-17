from sqlmodel import SQLModel, Field
from typing import Optional
from pydantic import EmailStr, field_validator

class BaseUser(SQLModel):
    email: EmailStr = Field(max_length=100)
    name : str = Field(max_length=50)
    age : Optional[int] = Field(default=None, ge=0)     # ge=0 greater or equal 0 artinya gaboleh minus

class UserCreate(BaseUser):
    password: str = Field(min_length=8, max_length=128)

    # validator costum @field_validator akan mencegat data sebelum masuk ke router
    @field_validator("password")
    @classmethod
    def validasi_password(cls, v):  # v adalah value yg di input user
        # Note: min_length=8 sudah dicek oleh Field di atas, tapi kita double check gapapa
        if len(v) < 8:
            raise ValueError("password terlalu lemah! minimal 8 karakter!")
        
        # tidak boleh ada spasi
        if " " in v:
            raise ValueError("password tidak boleh mengandung spasi")
        
        # harus ada angka
        if not any(char.isdigit() for char in v):
            raise ValueError("password harus mengandung setidaknya satu angka")
        
        return v
    
class UserRead(BaseUser):
    id: int
    profile_image: Optional[str] = None
    role: str = "student"
    class_id: Optional[int] = None
    # Profile fields
    nis: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    is_profile_complete: bool = False

class ProfileCompleteSchema(SQLModel):
    """Schema untuk melengkapi profil setelah registrasi."""
    nis: str = Field(min_length=5, max_length=20)
    address: str = Field(min_length=10, max_length=500)
    phone: str = Field(min_length=10, max_length=20)
    birth_date: str = Field(max_length=10)  # Format: YYYY-MM-DD
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        # Bersihkan karakter non-digit kecuali +
        import re
        if not re.match(r'^[+]?[0-9]{10,15}$', v.replace(' ', '').replace('-', '')):
            raise ValueError("Format nomor HP tidak valid")
        return v

class ForgotPasswordRequest(SQLModel):
    email: EmailStr = Field(max_length=100)

class ResetPasswordRequest(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validasi_password(cls, v):
        if len(v) < 8:
            raise ValueError("password terlalu lemah! minimal 8 karakter!")
        if " " in v:
            raise ValueError("password tidak boleh mengandung spasi")
        if not any(char.isdigit() for char in v):
            raise ValueError("password harus mengandung setidaknya satu angka")
        return v
