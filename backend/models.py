from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email    : str = Field(unique=True, index=True, max_length=100)
    name     : str = Field(unique=True, index=True, max_length=50)
    age      : int
    password : str = Field(max_length=128)
    is_active: bool = Field(default=False)
    profile_image: Optional[str] = Field(default=None)

class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title   : str = Field(max_length=100)
    content: str = Field(max_length=10000)
    owner_id: Optional[int] = Field(foreign_key="user.id")
    
    # Penanda Waktu (untuk fitur sorting)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)