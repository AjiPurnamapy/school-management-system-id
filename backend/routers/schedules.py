from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, or_
from backend.database import get_session
from backend.models import Schedule, SchoolClass, Subject, User, DayEnum
from backend.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate
from backend.dependencies import get_current_user
from backend.permissions import require_admin

router = APIRouter(prefix="/schedules", tags=["Schedules (Jadwal)"])

from sqlalchemy.orm import selectinload

@router.get("/", response_model=List[ScheduleRead])
def get_schedules(
    class_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    day: Optional[DayEnum] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # EAGER LOADING: Fetch relatives in efficient queries (Avoid N+1 Problem)
    start_stmt = select(Schedule).options(
        selectinload(Schedule.school_class),
        selectinload(Schedule.subject),
        selectinload(Schedule.teacher)
    )
    
    if class_id:
        start_stmt = start_stmt.where(Schedule.class_id == class_id)
    if teacher_id:
        start_stmt = start_stmt.where(Schedule.teacher_id == teacher_id)
    if day:
        start_stmt = start_stmt.where(Schedule.day == day)
        
    start_stmt = start_stmt.order_by(Schedule.day, Schedule.start_time)

    results = session.exec(start_stmt).all()
    
    # Enrich data from loaded relationships (No more DB calls here!)
    response_data = []
    for sch in results:
        response_data.append(ScheduleRead(
            **sch.model_dump(),
            class_name=sch.school_class.name if sch.school_class else "Unknown",
            subject_name=sch.subject.name if sch.subject else "Unknown",
            teacher_name=sch.teacher.name if sch.teacher else "Unknown"
        ))
        
    return response_data

# Helper: Validate Conflict
def validate_schedule_conflict(session: Session, class_id: int, teacher_id: int, day: DayEnum, start_time: str, end_time: str, exclude_id: Optional[int] = None):
    # 1. CEK KONFLIK: KELAS
    stmt_class = select(Schedule).where(
        Schedule.class_id == class_id,
        Schedule.day == day,
        Schedule.start_time < end_time,
        Schedule.end_time > start_time
    )
    if exclude_id:
        stmt_class = stmt_class.where(Schedule.id != exclude_id)
        
    if session.exec(stmt_class).first():
        raise HTTPException(status_code=400, detail=f"Konflik: Kelas ini sudah ada pelajaran pada {day} jam tersebut.")

    # 2. CEK KONFLIK: GURU
    stmt_teacher = select(Schedule).where(
        Schedule.teacher_id == teacher_id,
        Schedule.day == day,
        Schedule.start_time < end_time,
        Schedule.end_time > start_time
    )
    if exclude_id:
        stmt_teacher = stmt_teacher.where(Schedule.id != exclude_id)

    if session.exec(stmt_teacher).first():
        raise HTTPException(status_code=400, detail=f"Konflik: Guru tersebut sedang mengajar di kelas lain pada jam yang sama.")

@router.post("/", response_model=ScheduleRead, status_code=status.HTTP_201_CREATED)
def create_schedule(
    schedule: ScheduleCreate, 
    session: Session = Depends(get_session), 
    admin: User = Depends(require_admin)
):
    # 1. VALIDASI FORMAT JAM
    if schedule.end_time <= schedule.start_time:
        raise HTTPException(status_code=400, detail="Jam selesai harus lebih besar dari jam mulai")

    # 2. CEK KONFLIK (Helper)
    validate_schedule_conflict(
        session, schedule.class_id, schedule.teacher_id, 
        schedule.day, schedule.start_time, schedule.end_time
    )

    # Simpan
    db_schedule = Schedule.model_validate(schedule)
    session.add(db_schedule)
    session.commit()
    session.refresh(db_schedule)
    
    # Return enriched data (manual fetch for single item is fine, or use get with options)
    # Since we just added it, relations might not be eager loaded automatically unless we refresh with options
    # simpler to just return model_dump for now or fetch relations. 
    # For consistency with list, let's fetch relations manually or re-query.
    # Re-querying is cleaner for consistency.
    return session.exec(
        select(Schedule).where(Schedule.id == db_schedule.id).options(
            selectinload(Schedule.school_class),
            selectinload(Schedule.subject),
            selectinload(Schedule.teacher)
        )
    ).one()

    # Old manual enrichment removed for consistency

@router.put("/{schedule_id}", response_model=ScheduleRead)
def update_schedule(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin)
):
    db_schedule = session.get(Schedule, schedule_id)
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")

    new_data = schedule_update.model_dump(exclude_unset=True)
    
    # Current values as fallback
    check_day = new_data.get('day', db_schedule.day)
    check_start = new_data.get('start_time', db_schedule.start_time)
    check_end = new_data.get('end_time', db_schedule.end_time)
    check_class = new_data.get('class_id', db_schedule.class_id)
    check_teacher = new_data.get('teacher_id', db_schedule.teacher_id)

    # 1. VALIDASI FORMAT JAM
    if check_end <= check_start:
         raise HTTPException(status_code=400, detail="Jam selesai harus lebih besar dari jam mulai")

    # 2. CEK KONFLIK (Helper)
    validate_schedule_conflict(
        session, check_class, check_teacher, 
        check_day, check_start, check_end, 
        exclude_id=schedule_id
    )

    # Apply updates
    for key, value in new_data.items():
        setattr(db_schedule, key, value)
        
    session.add(db_schedule)
    session.commit()
    session.refresh(db_schedule)

    # Return enriched with Eager Load re-query
    return session.exec(
        select(Schedule).where(Schedule.id == db_schedule.id).options(
            selectinload(Schedule.school_class),
            selectinload(Schedule.subject),
            selectinload(Schedule.teacher)
        )
    ).one()

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: int, 
    session: Session = Depends(get_session), 
    admin: User = Depends(require_admin)
):
    db_schedule = session.get(Schedule, schedule_id)
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
        
    session.delete(db_schedule)
    session.commit()
    return None
