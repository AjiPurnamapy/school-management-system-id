from sqlmodel import SQLModel, Field
from typing import Optional
from pydantic import EmailStr, field_validator

class BaseUser(SQLModel):
    email: EmailStr
    name : str
    age : Optional[int] = Field(default=None, ge=0)     # ge=0 greater or equal 0 artinya gaboleh minus

class UserCreate(BaseUser):
    password: str

    # validator costum @field_validato akan mencegat data sebelum masuk ke router
    @field_validator("password")
    @classmethod
    def validasi_password(cls, v):  # v adalah value yg di input user
        # minimal 8 karakter
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

