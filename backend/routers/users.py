from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import User, UserRole
from backend.schemas.user import UserRead
from backend.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserRead])
def get_users(
    role: Optional[str] = Query(None, description="Filter by role (student, teacher, admin)"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of users.
    - Filter by role.
    - Search by name/email.
    - Accessible by all authenticated users (needed for teachers to see students).
    """
    statement = select(User)
    
    if role:
        statement = statement.where(User.role == role)
        
    if search:
        statement = statement.where(
            (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
        
    users = session.exec(statement).all()
    return users

@router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
