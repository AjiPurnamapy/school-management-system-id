from sqlmodel import SQLModel, Field
from typing import Optional

class BaseUser(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    name : str
    age : int

