import os
import time
import random
from pathlib import Path
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

async def save_image(file: UploadFile | None) -> str:
    if not file or not file.filename:
        return ""
    
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only image files (jpg, png, webp) are allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image file exceeds 5MB size limit")

    ext = os.path.splitext(file.filename)[1].lower()
    if not ext:
        ext = ".jpg"

    unique_filename = f"{int(time.time() * 1000)}-{random.randint(100000, 999999)}{ext}"
    destination = UPLOAD_DIR / unique_filename

    with open(destination, "wb") as f:
        f.write(content)

    return f"/uploads/{unique_filename}"
