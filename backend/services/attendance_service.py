from typing import List, Dict, Optional
from fastapi import HTTPException, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from backend.models import Attendance, AttendanceStatus, Schedule, User, UserRole, SchoolClass

class AttendanceService:

    def create_attendance(
        self,
        session: Session,
        user: User,
        schedule_id: int,
        student_id: int,
        date: str,
        status_val: AttendanceStatus,
        notes: Optional[str]
    ) -> Attendance:
        # Permission check
        if user.role not in [UserRole.admin.value, UserRole.principal.value, UserRole.teacher.value]:
            raise HTTPException(status_code=403, detail="Hanya guru yang bisa mencatat absensi.")
        
        # Validate schedule
        schedule = session.get(Schedule, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan.")
        
        # Validate student
        student = session.get(User, student_id)
        if not student or student.role != UserRole.student.value:
            raise HTTPException(status_code=404, detail="Siswa tidak ditemukan.")
        
        # Check duplicate
        existing = session.exec(
            select(Attendance).where(
                Attendance.schedule_id == schedule_id,
                Attendance.student_id == student_id,
                Attendance.date == date
            )
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Absensi sudah tercatat untuk tanggal ini.")
        
        attendance = Attendance(
            schedule_id=schedule_id,
            student_id=student_id,
            date=date,
            status=status_val,
            notes=notes,
            recorded_by=user.id
        )
        session.add(attendance)
        session.commit()
        session.refresh(attendance)
        return attendance

    def bulk_create_attendance(
        self,
        session: Session,
        user: User,
        schedule_id: int,
        date: str,
        records: List[Dict]
    ) -> Dict:
        if user.role not in [UserRole.admin.value, UserRole.principal.value, UserRole.teacher.value]:
            raise HTTPException(status_code=403, detail="Hanya guru yang bisa mencatat absensi.")
        
        schedule = session.get(Schedule, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan.")
        
        created_count = 0
        updated_count = 0
        
        for record in records:
            student_id = record.get("student_id")
            status_val = record.get("status", "hadir")
            notes = record.get("notes", "")
            
            existing = session.exec(
                select(Attendance).where(
                    Attendance.schedule_id == schedule_id,
                    Attendance.student_id == student_id,
                    Attendance.date == date
                )
            ).first()
            
            if existing:
                existing.status = AttendanceStatus(status_val)
                existing.notes = notes
                session.add(existing)
                updated_count += 1
            else:
                attendance = Attendance(
                    schedule_id=schedule_id,
                    student_id=student_id,
                    date=date,
                    status=AttendanceStatus(status_val),
                    notes=notes,
                    recorded_by=user.id
                )
                session.add(attendance)
                created_count += 1
        
        session.commit()
        return {"created": created_count, "updated": updated_count}

    def get_attendance_by_schedule(
        self,
        session: Session,
        schedule_id: int,
        date: Optional[str]
    ) -> List[Attendance]:
        query = select(Attendance).where(Attendance.schedule_id == schedule_id)
        if date:
            query = query.where(Attendance.date == date)
        
        query = query.options(
            selectinload(Attendance.student),
            selectinload(Attendance.recorder)
        ).order_by(Attendance.date.desc())
        
        return session.exec(query).all()

    def get_attendance_by_student(
        self,
        session: Session,
        user: User,
        student_id: int
    ) -> List[Attendance]:
        if user.role == UserRole.student.value and user.id != student_id:
            raise HTTPException(status_code=403, detail="Anda hanya bisa melihat absensi sendiri.")
            
        query = select(Attendance).where(
            Attendance.student_id == student_id
        ).options(
            selectinload(Attendance.student),
            selectinload(Attendance.recorder),
            selectinload(Attendance.schedule)
        ).order_by(Attendance.date.desc())
        
        return session.exec(query).all()

    def get_class_summary(
        self,
        session: Session,
        user: User,
        class_id: int
    ) -> List[Dict]:
        if user.role not in [UserRole.admin.value, UserRole.principal.value, UserRole.teacher.value]:
            raise HTTPException(status_code=403, detail="Hanya guru yang bisa melihat rekap absensi kelas.")
            
        students = session.exec(
            select(User).where(
                User.class_id == class_id,
                User.role == UserRole.student.value
            )
        ).all()
        
        summaries = []
        for student in students:
            attendances = session.exec(
                select(Attendance).where(Attendance.student_id == student.id)
            ).all()
            
            hadir = len([a for a in attendances if a.status == AttendanceStatus.HADIR])
            izin = len([a for a in attendances if a.status == AttendanceStatus.IZIN])
            sakit = len([a for a in attendances if a.status == AttendanceStatus.SAKIT])
            alfa = len([a for a in attendances if a.status == AttendanceStatus.ALFA])
            total = len(attendances)
            
            percentage = (hadir / total * 100) if total > 0 else 0
            
            summaries.append({
                "student_id": student.id,
                "student_name": student.name,
                "hadir": hadir,
                "izin": izin,
                "sakit": sakit,
                "alfa": alfa,
                "total": total,
                "percentage": round(percentage, 2)
            })
        return summaries

    def update_attendance(
        self,
        session: Session,
        user: User,
        attendance_id: int,
        status_val: AttendanceStatus,
        notes: Optional[str]
    ) -> Attendance:
        if user.role not in [UserRole.admin.value, UserRole.principal.value, UserRole.teacher.value]:
            raise HTTPException(status_code=403, detail="Hanya guru yang bisa mengubah absensi.")
            
        attendance = session.get(Attendance, attendance_id)
        if not attendance:
            raise HTTPException(status_code=404, detail="Data absensi tidak ditemukan.")
            
        attendance.status = status_val
        attendance.notes = notes
        session.add(attendance)
        session.commit()
        session.refresh(attendance)
        return attendance

    def delete_attendance(self, session: Session, user: User, attendance_id: int):
        if user.role != UserRole.admin.value:
             raise HTTPException(status_code=403, detail="Hanya admin yang bisa menghapus data absensi.")
             
        attendance = session.get(Attendance, attendance_id)
        if not attendance:
             raise HTTPException(status_code=404, detail="Data absensi tidak ditemukan.")
             
        session.delete(attendance)
        session.commit()

# Singleton
attendance_service = AttendanceService()
