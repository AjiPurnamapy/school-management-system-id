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


def require_academic_manager(current_user: User = Depends(get_current_user)):
    """
    Dependency untuk memastikan user adalah Admin atau Kepala Sekolah.
    Berguna untuk: membuat kelas, mapel, jadwal, dll.
    """
    allowed_roles = [UserRole.admin.value, UserRole.principal.value]
    if current_user.role not in allowed_roles:
        logger.warning(f"Access denied: User '{current_user.name}' tried academic management.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya Admin atau Kepala Sekolah yang bisa melakukan aksi ini."
        )
    return current_user


def require_teacher_or_admin(current_user: User = Depends(get_current_user)):
    """
    Dependency untuk memastikan user adalah Admin atau Guru.
    Berguna untuk: assign siswa ke kelas, upload materi, dll.
    """
    allowed_roles = [UserRole.admin.value, UserRole.teacher.value]
    if current_user.role not in allowed_roles:
        logger.warning(f"Access denied: User '{current_user.name}' tried teacher action.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya Admin atau Guru yang bisa melakukan aksi ini."
        )
    return current_user
