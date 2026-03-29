import re
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", filename).strip("-")
    return safe or "upload.pdf"


@dataclass(frozen=True)
class StoredUpload:
    path: Path
    filename: str
    content_type: str
    size_bytes: int


async def store_upload_file(
    upload_file: UploadFile,
    *,
    base_dir: Path,
    document_type: str,
    job_id: UUID,
) -> StoredUpload:
    ensure_directory(base_dir / document_type)
    safe_name = sanitize_filename(upload_file.filename or f"{document_type}.pdf")
    destination = base_dir / document_type / f"{job_id}-{safe_name}"

    total_size = 0
    with destination.open("wb") as target:
        while True:
            chunk = await upload_file.read(1024 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            target.write(chunk)

    await upload_file.close()
    return StoredUpload(
        path=destination,
        filename=safe_name,
        content_type=upload_file.content_type or "application/octet-stream",
        size_bytes=total_size,
    )
