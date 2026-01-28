"""
Analytics Router - Dashboard Statistics
Provides aggregated statistics for the dashboard.
"""

from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from pydantic import BaseModel

from backend.database import get_session
from backend.models import User, UserRole, SchoolClass, Subject, Schedule, Assignment, Submission
from backend.dependencies import get_current_user


router = APIRouter(prefix="/analytics", tags=["Analytics"])


class DashboardStats(BaseModel):
    """Response model for dashboard statistics."""
    total_students: int
    total_teachers: int
    total_classes: int
    total_subjects: int
    total_assignments: int
    pending_submissions: int
    completed_submissions: int
    upcoming_deadlines: int
    
    # Optional per-role stats
    my_class_students: Optional[int] = None  # For teachers
    my_pending_tasks: Optional[int] = None   # For students
    my_graded_tasks: Optional[int] = None    # For students


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics based on user role.
    - Admin/Principal: See all stats
    - Teacher: See class-specific stats
    - Student: See personal stats
    """
    
    # Global stats (visible to all authenticated users)
    total_students = session.exec(
        select(func.count(User.id)).where(User.role == UserRole.student.value)
    ).one()
    
    total_teachers = session.exec(
        select(func.count(User.id)).where(User.role == UserRole.teacher.value)
    ).one()
    
    total_classes = session.exec(select(func.count(SchoolClass.id))).one()
    total_subjects = session.exec(select(func.count(Subject.id))).one()
    total_assignments = session.exec(select(func.count(Assignment.id))).one()
    
    # Submission stats
    completed_submissions = session.exec(
        select(func.count(Submission.id)).where(Submission.grade.isnot(None))
    ).one()
    
    pending_submissions = session.exec(
        select(func.count(Submission.id)).where(Submission.grade.is_(None))
    ).one()
    
    # Upcoming deadlines (next 7 days)
    now = datetime.utcnow()
    week_ahead = now + timedelta(days=7)
    upcoming_deadlines = session.exec(
        select(func.count(Assignment.id)).where(
            Assignment.due_date >= now,
            Assignment.due_date <= week_ahead
        )
    ).one()
    
    # Role-specific stats
    my_class_students = None
    my_pending_tasks = None
    my_graded_tasks = None
    
    if current_user.role == UserRole.teacher.value:
        # Teachers: Get students in classes they teach
        # Simplified: count all students (would need teacher-class mapping for exact)
        my_class_students = total_students
        
    elif current_user.role == UserRole.student.value:
        # Students: Get their personal task stats
        if current_user.class_id:
            # Assignments for student's class
            class_assignments = session.exec(
                select(Assignment.id).where(Assignment.class_id == current_user.class_id)
            ).all()
            assignment_ids = [a for a in class_assignments]
            
            # My submitted tasks
            my_submissions = session.exec(
                select(Submission).where(
                    Submission.student_id == current_user.id
                )
            ).all()
            
            submitted_ids = {s.assignment_id for s in my_submissions}
            my_pending_tasks = len(assignment_ids) - len(submitted_ids)
            my_graded_tasks = len([s for s in my_submissions if s.grade is not None])
        else:
            my_pending_tasks = 0
            my_graded_tasks = 0
    
    return DashboardStats(
        total_students=total_students,
        total_teachers=total_teachers,
        total_classes=total_classes,
        total_subjects=total_subjects,
        total_assignments=total_assignments,
        pending_submissions=pending_submissions,
        completed_submissions=completed_submissions,
        upcoming_deadlines=upcoming_deadlines,
        my_class_students=my_class_students,
        my_pending_tasks=my_pending_tasks,
        my_graded_tasks=my_graded_tasks
    )


class AssignmentStats(BaseModel):
    """Assignment-specific statistics."""
    assignment_id: int
    title: str
    total_students: int
    submitted_count: int
    graded_count: int
    average_grade: Optional[float] = None


@router.get("/assignment/{assignment_id}", response_model=AssignmentStats)
def get_assignment_stats(
    assignment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get detailed statistics for a specific assignment."""
    
    # Only teachers/admin can see assignment stats
    if current_user.role not in [UserRole.admin.value, UserRole.principal.value, UserRole.teacher.value]:
        raise HTTPException(status_code=403, detail="Hanya guru yang bisa melihat statistik tugas.")
    
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    
    # Get class student count
    total_students = session.exec(
        select(func.count(User.id)).where(
            User.class_id == assignment.class_id,
            User.role == UserRole.student.value
        )
    ).one()
    
    # Get submission counts
    submissions = session.exec(
        select(Submission).where(Submission.assignment_id == assignment_id)
    ).all()
    
    submitted_count = len(submissions)
    graded_count = len([s for s in submissions if s.grade is not None])
    
    # Calculate average grade
    grades = [s.grade for s in submissions if s.grade is not None]
    average_grade = sum(grades) / len(grades) if grades else None
    
    return AssignmentStats(
        assignment_id=assignment.id,
        title=assignment.title,
        total_students=total_students,
        submitted_count=submitted_count,
        graded_count=graded_count,
        average_grade=round(average_grade, 2) if average_grade else None
    )
