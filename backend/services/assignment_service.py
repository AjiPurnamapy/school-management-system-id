from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status, UploadFile
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from backend.models import Assignment, SchoolClass, Subject, User, UserRole
from backend.services.file_service import file_service

class AssignmentService:
    
    async def create_assignment(
        self,
        session: Session,
        user: User,
        title: str,
        description: str,
        due_date_str: str,
        subject_id: int,
        class_id: int,
        file: Optional[UploadFile]
    ) -> Assignment:
        # 1. Permission Check
        if user.role not in [UserRole.admin.value, UserRole.principal.value, UserRole.teacher.value]:
             raise HTTPException(status_code=403, detail="Hanya Guru/Admin yang bisa membuat tugas.")

        # 2. Validate IDs
        if not session.get(Subject, subject_id):
            raise HTTPException(status_code=404, detail="Subject not found")
        if not session.get(SchoolClass, class_id):
             raise HTTPException(status_code=404, detail="Class not found")

        # 3. Handle File Upload (via FileService)
        file_url = None
        if file:
            file_url = await file_service.save_file(
                file,
                folder="assignments",
                allowed_extensions={"pdf", "doc", "docx", "ppt", "pptx", "txt", "jpg", "png"},
                max_size_mb=10
            )

        # 4. Parse Date
        try:
             due_date_dt = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
        except ValueError:
             raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")

        # 5. Save to DB
        assignment = Assignment(
            title=title,
            description=description,
            due_date=due_date_dt,
            subject_id=subject_id,
            class_id=class_id,
            teacher_id=user.id,
            file_url=file_url
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)
        
        # Load relations for response
        statement = select(Assignment).where(Assignment.id == assignment.id).options(
            selectinload(Assignment.subject),
            selectinload(Assignment.school_class),
            selectinload(Assignment.teacher)
        )
        return session.exec(statement).first()

    def get_assignments(
        self, 
        session: Session, 
        user: User, 
        class_id: Optional[int] = None, 
        subject_id: Optional[int] = None
    ) -> List[Assignment]:
        query = select(Assignment).options(
            selectinload(Assignment.subject),
            selectinload(Assignment.school_class),
            selectinload(Assignment.teacher)
        ).order_by(Assignment.created_at.desc())
        
        if class_id:
            query = query.where(Assignment.class_id == class_id)
        if subject_id:
             query = query.where(Assignment.subject_id == subject_id)
            
        # SECURITY: Siswa hanya bisa lihat tugas dari kelasnya sendiri
        if user.role == UserRole.student.value:
            if user.class_id is None:
                return []
            query = query.where(Assignment.class_id == user.class_id)
            
        return session.exec(query).all()

    def delete_assignment(self, session: Session, user: User, assignment_id: int):
        assignment = session.get(Assignment, assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
            
        # Permission check: Admin or Owner Teacher
        if user.role != UserRole.admin.value and assignment.teacher_id != user.id:
             raise HTTPException(status_code=403, detail="Not authorized to delete this assignment")
        
        # Delete file if exists
        if assignment.file_url:
            file_service.delete_file(assignment.file_url)
            
        session.delete(assignment)
        session.commit()

# Singleton
assignment_service = AssignmentService()
