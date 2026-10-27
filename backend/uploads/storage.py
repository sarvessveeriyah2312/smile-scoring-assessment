import secrets

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from uploads.models import StoredFile

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB

_SIGNATURES = [
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"GIF87a", "image/gif", ".gif"),
    (b"GIF89a", "image/gif", ".gif"),
]


def detect_image(data: bytes) -> tuple[str, str] | None:
    """Returns (content_type, extension) for images we accept, otherwise None."""
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", ".webp"
    for signature, content_type, extension in _SIGNATURES:
        if data.startswith(signature):
            return content_type, extension
    return None


# Files live in Postgres. save and remove only stage the change; the caller's
# commit makes it stick, so a file and its upload record are saved or dropped together.
async def save(db: AsyncSession, data: bytes, extension: str) -> str:
    stored_name = secrets.token_hex(16) + extension
    db.add(StoredFile(name=stored_name, data=data))
    return stored_name


async def read(db: AsyncSession, stored_name: str) -> bytes:
    file = await db.get(StoredFile, stored_name)
    if file is None:
        raise FileNotFoundError(stored_name)
    return file.data


async def remove(db: AsyncSession, stored_name: str) -> None:
    await db.execute(delete(StoredFile).where(StoredFile.name == stored_name))
