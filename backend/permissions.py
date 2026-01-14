import logging
from fastapi import Depends, HTTPException, status
from backend.models import User, UserRole
from backend.dependencies import get_current_user

logger = logging.getLogger(__name__)

def require_admin(current_user: User = Depends(get_current_user)):
    """
    Dependency to ensure the user is an Admin.
    """
    if current_user.role != UserRole.admin.value:
        logger.warning(f"Access denied: User '{current_user.name}' (role: {current_user.role}) tried admin access.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya Admin yang bisa melakukan aksi ini."
        )
    return current_user
