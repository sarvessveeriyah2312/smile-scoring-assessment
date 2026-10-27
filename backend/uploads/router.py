import logging

from cryptography.exceptions import InvalidTag
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from payload_crypto import decrypt_bytes, decrypt_value, encrypt_bytes
from uploads import storage
from uploads.models import SmileAnalysis, Upload
from uploads.smile_cache import analyse_cached
from uploads.schemas import UploadResponse
from users.models import User
from users.session import get_current_user

router = APIRouter(prefix="/uploads", tags=["uploads"])
log = logging.getLogger(__name__)


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    # Both parts arrive encrypted: the filename like any other value, the file as raw bytes.
    filename: str = Form(),
    file: UploadFile = File(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        filename = str(decrypt_value(filename))[:255]
        data = decrypt_bytes(await file.read())
    except (ValueError, TypeError, InvalidTag):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That file didn't come through properly. Please try again.")
    if not filename.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That file needs a name.")

    if len(data) > storage.MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "That image is over 10 MB. Please pick a smaller one.")

    detected = storage.detect_image(data)
    if detected is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "That doesn't look like a JPG, PNG, WEBP or GIF image.",
        )
    content_type, extension = detected

    # If analysis falls over, the upload still goes through; it just won't have a score.
    try:
        result = await analyse_cached(data)
    except Exception:
        log.exception("Smile analysis failed for %r", filename)
        result = None

    stored_name = storage.save(data, extension)
    upload = Upload(
        user_id=user.id,
        filename=filename,
        stored_name=stored_name,
        content_type=content_type,
        size=len(data),
    )
    if result is not None:
        upload.smile = SmileAnalysis(
            face_found=result.face_found,
            smile_left=result.smile_left,
            smile_right=result.smile_right,
            score=result.score,
        )
    db.add(upload)
    try:
        await db.commit()
    except Exception:
        storage.remove(stored_name)
        raise

    await db.refresh(upload, attribute_names=["created_at", "smile"])
    return upload


@router.get("", response_model=list[UploadResponse])
async def list_uploads(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.scalars(select(Upload).where(Upload.user_id == user.id).order_by(Upload.created_at.desc()))
    return result.all()


async def _own_upload(upload_id: int, user: User, db: AsyncSession) -> Upload:
    upload = await db.get(Upload, upload_id)
    # Someone else's image looks exactly like a missing one.
    if upload is None or upload.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find that image.")
    return upload


@router.get("/{upload_id}", response_model=UploadResponse)
async def get_upload(upload_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _own_upload(upload_id, user, db)


@router.get("/{upload_id}/image")
async def get_upload_image(
    upload_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The image itself, encrypted, as raw bytes. The browser decrypts it before showing it."""
    upload = await _own_upload(upload_id, user, db)

    # An image never changes once uploaded, so its stored name works as a version tag.
    # "no-cache" means the browser may keep a copy but must check back every time,
    # so the login and ownership checks above still run on every view. When its
    # copy is current we answer 304 and skip sending the file again.
    etag = f'"{upload.stored_name}"'
    headers = {"ETag": etag, "Cache-Control": "private, no-cache"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=headers)

    data = await run_in_threadpool(storage.read, upload.stored_name)
    return Response(content=encrypt_bytes(data), media_type="application/octet-stream", headers=headers)


@router.delete("/{upload_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_upload(upload_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    upload = await _own_upload(upload_id, user, db)

    stored_name = upload.stored_name
    await db.delete(upload)
    await db.commit()
    storage.remove(stored_name)
