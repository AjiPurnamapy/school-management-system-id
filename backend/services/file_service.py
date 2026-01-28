import os
import shutil
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException

class FileService:
    def __init__(self):
        # Base static folder
        self.BASE_DIR = Path("backend/static")
    
    def validate_file(self, file: UploadFile, allowed_types: list[str], max_size_mb: int) -> None:
        """
        Validates file type (MIME or extension) and checks file size if possible.
        Note: Exact size check usually requires reading file, so we do soft check here 
        or rely on reading during save.
        """
        # 1. Validate content type or extension
        # Simple extraction from filename
        filename = file.filename or ""
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        
        # Check if allowed_types contains extensions (e.g. 'jpg') or mime types 'image/jpeg'
        # simplifying to extension check for now as per existing logic, could be improved.
        if extension not in allowed_types and file.content_type not in allowed_types:
             # Basic check: if strict MIME types are passed (like 'image/jpeg'), check content_type
             # if extensions are passed (like 'pdf'), check extension
             pass # Logic is a bit complex to unify perfectly, let's implement specific checks in methods
             
    async def save_file(self, file: UploadFile, folder: str, allowed_extensions: set[str], max_size_mb: int) -> str:
        """
        Saves an upload file to backend/static/{folder}/
        Returns the public URL string.
        """
        # 1. Extension Validation
        filename = file.filename or ""
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        
        if extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}"
            )

        # 2. Size Validation (Chunked read) & Saving
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        save_dir = self.BASE_DIR / folder
        save_dir.mkdir(parents=True, exist_ok=True)
        file_path = save_dir / unique_filename
        
        max_bytes = max_size_mb * 1024 * 1024
        
        try:
            # Read content to check size and write
            # For very large files, chunked writing is better to avoid memory RAM spikes
            size = 0
            with open(file_path, "wb") as buffer:
                while chunk := await file.read(1024 * 1024): # 1MB chunks
                    size += len(chunk)
                    if size > max_bytes:
                        # cleanup before raising
                        buffer.close()
                        file_path.unlink(missing_ok=True)
                        raise HTTPException(
                            status_code=400, 
                            detail=f"File too large. Max {max_size_mb}MB"
                        )
                    buffer.write(chunk)
                    
            return f"/static/{folder}/{unique_filename}"
            
        except HTTPException:
            raise
        except Exception as e:
            # Cleanup if fail
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    def delete_file(self, file_url: str) -> bool:
        """
        Deletes a file given its public URL (e.g., /static/images/xxx.jpg).
        """
        ifbox_path = file_url.lstrip("/") # remove leading slash
        # expected: static/images/xxx.jpg
        # physical path: backend/static/images/xxx.jpg
        
        # We need to construct physical path correctly relative to CWD
        # Assuming CWD is root of project (where generic 'backend' folder is)
        physical_path = Path("backend") / ifbox_path
        
        try:
            if physical_path.exists():
                physical_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting file {physical_path}: {e}")
            return False

# Singleton instance
file_service = FileService()
