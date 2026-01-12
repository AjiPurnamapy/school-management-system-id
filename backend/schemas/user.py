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

