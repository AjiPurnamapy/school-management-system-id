from typing import Optional
from sqlmodel import SQLModel
from backend.models import DayEnum

class ScheduleBase(SQLModel):
    class_id: int
    subject_id: int
    teacher_id: int
    day: DayEnum
    start_time: str
    end_time: str

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleRead(ScheduleBase):
    id: int
    class_name: Optional[str] = None
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None

class ScheduleUpdate(SQLModel):
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    day: Optional[DayEnum] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
