from sqlmodel import SQLModel
from typing import Optional

class BaseUser(SQLModel):
    name : str
    age : Optional[int] = None

class UserCreate(BaseUser):
    password: str

class UserRead(BaseUser):
    id: int

