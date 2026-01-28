from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from backend.database import get_session
from backend.models import User
from backend.dependencies import get_current_user
from backend.services.attendance_service import attendance_service
from pydantic import BaseModel
from datetime import datetime
from backend.models import AttendanceStatus

# ============================================================================
# SCHEMAS (Re-defined for now, or preferably moved to backend/schemas/attendance.py in future)
# ============================================================================

class AttendanceCreate(BaseModel):
    schedule_id: int
    student_id: int
    date: str
    status: AttendanceStatus = AttendanceStatus.HADIR
    notes: Optional[str] = None

class AttendanceBulkCreate(BaseModel):
    schedule_id: int
    date: str
    records: List[dict]

class AttendanceUpdate(BaseModel):
    status: AttendanceStatus
    notes: Optional[str] = None

class AttendanceRead(BaseModel):
    id: int
    schedule_id: int
    student_id: int
    student_name: str
    date: str
    status: AttendanceStatus
    notes: Optional[str]
    recorded_by_name: str
    created_at: datetime

class AttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    hadir: int
    izin: int
    sakit: int
    alfa: int
    total: int
    percentage: float

# ============================================================================
# ENDPOINTS
# ============================================================================

router = APIRouter(prefix="/attendance", tags=["Attendance (Absensi)"])

@router.post("/", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
def create_attendance(
    data: AttendanceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    attendance = attendance_service.create_attendance(
        session, current_user, data.schedule_id, data.student_id, data.date, data.status, data.notes
    )
    # Manual Mapper (Service returns Model)
    # Ideally Service returns Schema or we use Helper Mapper
    return AttendanceRead(
        id=attendance.id,
        schedule_id=attendance.schedule_id,
        student_id=attendance.student_id,
        student_name=attendance.student.name if attendance.student else "Unknown", # Relation loaded in service? 
        # CAUTION: Service `create_attendance` does `refresh` but might not load relations needed here.
        # Ideally Service should return loaded model.
        # Let's check Service implementation... it does refresh but not explicit Relation Loading.
        # We might need to fetch names or rely on lazy loading (sync) if supported, but best is explicit.
        # For now, simplistic approach.
        date=attendance.date,
        status=attendance.status,
        notes=attendance.notes,
        recorded_by_name=current_user.name,
        created_at=attendance.created_at
    )

@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def create_bulk_attendance(
    data: AttendanceBulkCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    result = attendance_service.bulk_create_attendance(
        session, current_user, data.schedule_id, data.date, data.records
    )
    return {
        "message": f"Absensi berhasil disimpan.",
        **result
    }

@router.get("/schedule/{schedule_id}", response_model=List[AttendanceRead])
def get_attendance_by_schedule(
    schedule_id: int,
    date: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    results = attendance_service.get_attendance_by_schedule(session, schedule_id, date)
    return [
        AttendanceRead(
            id=a.id,
            schedule_id=a.schedule_id,
            student_id=a.student_id,
            student_name=a.student.name if a.student else "Unknown",
            date=a.date,
            status=a.status,
            notes=a.notes,
            recorded_by_name=a.recorder.name if a.recorder else "Unknown",
            created_at=a.created_at
        ) for a in results
    ]

@router.get("/student/{student_id}", response_model=List[AttendanceRead])
def get_attendance_by_student(
    student_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    results = attendance_service.get_attendance_by_student(session, current_user, student_id)
    return [
        AttendanceRead(
            id=a.id,
            schedule_id=a.schedule_id,
            student_id=a.student_id,
            student_name=a.student.name if a.student else "Unknown",
            date=a.date,
            status=a.status,
            notes=a.notes,
            recorded_by_name=a.recorder.name if a.recorder else "Unknown",
            created_at=a.created_at
        ) for a in results
    ]

@router.get("/summary/class/{class_id}", response_model=List[AttendanceSummary])
def get_class_attendance_summary(
    class_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    summaries = attendance_service.get_class_summary(session, current_user, class_id)
    return [AttendanceSummary(**s) for s in summaries]

@router.put("/{id}", response_model=AttendanceRead)
def update_attendance(
    id: int,
    data: AttendanceUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    attendance = attendance_service.update_attendance(session, current_user, id, data.status, data.notes)
    
    # Need to fetch relations again or use lazy loading if session is active
    # For safety/performance, we might assume standard loading or fetch just names
    # Re-using simple mapping for now
    
    # Ideally we should Eager Load in Update Service too.
    # But for simplified refactor:
    student_name = session.get(User, attendance.student_id).name
    recorder_name = session.get(User, attendance.recorded_by).name
    
    return AttendanceRead(
        id=attendance.id,
        schedule_id=attendance.schedule_id,
        student_id=attendance.student_id,
        student_name=student_name,
        date=attendance.date,
        status=attendance.status,
        notes=attendance.notes,
        recorded_by_name=recorder_name,
        created_at=attendance.created_at
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(
    id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    attendance_service.delete_attendance(session, current_user, id)
    return None
