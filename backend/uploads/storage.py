import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# On Render, point this at the persistent disk (e.g. /var/data/media) so files survive deploys.
MEDIA_DIR = Path(os.getenv("MEDIA_DIR") or Path(__file__).resolve().parent.parent / "media")

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


# These block on disk I/O, so call them via run_in_threadpool from async code.
def save(data: bytes, extension: str) -> str:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = secrets.token_hex(16) + extension
    (MEDIA_DIR / stored_name).write_bytes(data)
    return stored_name


def read(stored_name: str) -> bytes:
    return (MEDIA_DIR / stored_name).read_bytes()


def remove(stored_name: str) -> None:
    (MEDIA_DIR / stored_name).unlink(missing_ok=True)
