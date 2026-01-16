"""
=============================================================================
                    CUSTOM EXCEPTIONS MODULE
=============================================================================
Mendefinisikan exception khusus untuk domain aplikasi sekolah.
Keuntungan:
1. Format error response KONSISTEN di semua endpoint
2. Mudah di-maintain dan di-extend
3. Logging lebih terstruktur
4. Mengurangi duplikasi kode raise HTTPException di setiap router

PENGGUNAAN:
    from backend.exceptions import NotFoundError, PermissionDeniedError
    
    # Alih-alih:
    raise HTTPException(status_code=404, detail="Kelas tidak ditemukan")
    
    # Gunakan:
    raise NotFoundError("Kelas", class_id)
=============================================================================
"""

from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    """
    Resource tidak ditemukan (404).
    
    Usage:
        raise NotFoundError("Kelas", 123)
        # Output: "Kelas dengan ID '123' tidak ditemukan."
    """
    def __init__(self, resource: str, identifier: any = None):
        detail = f"{resource} tidak ditemukan."
        if identifier is not None:
            detail = f"{resource} dengan ID '{identifier}' tidak ditemukan."
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class PermissionDeniedError(HTTPException):
    """
    User tidak punya izin untuk aksi tertentu (403).
    
    Usage:
        raise PermissionDeniedError("menghapus kelas ini")
        # Output: "Anda tidak memiliki izin untuk: menghapus kelas ini"
    """
    def __init__(self, action: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Anda tidak memiliki izin untuk: {action}"
        )


class ConflictError(HTTPException):
    """
    Data konflik / duplikasi (409).
    
    Usage:
        raise ConflictError("Jadwal bentrok dengan kelas lain pada jam yang sama.")
    """
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=message
        )


class ValidationError(HTTPException):
    """
    Data tidak valid / tidak memenuhi syarat bisnis (400).
    
    Usage:
        raise ValidationError("Jam selesai harus lebih besar dari jam mulai")
    """
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )


class UnauthorizedError(HTTPException):
    """
    User belum login / token tidak valid (401).
    
    Usage:
        raise UnauthorizedError("Token telah expired")
    """
    def __init__(self, message: str = "Silakan login terlebih dahulu"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message,
            headers={"WWW-Authenticate": "Bearer"}
        )


class RateLimitError(HTTPException):
    """
    User terlalu banyak request (429).
    
    Usage:
        raise RateLimitError()
    """
    def __init__(self, message: str = "Terlalu banyak request. Coba lagi nanti."):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message
        )
