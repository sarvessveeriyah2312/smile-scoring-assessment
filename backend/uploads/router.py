import base64
import logging

from cryptography.exceptions import InvalidTag
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from payload_crypto import decrypt_bytes, decrypt_value
from uploads import smile, storage
from uploads.models import SmileAnalysis, Upload
from uploads.schemas import UploadResponse, UploadWithData
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

    # MediaPipe is slow, CPU-bound work, so keep it off the event loop.
    # If it falls over, the upload still goes through; it just won't have a score.
    try:
        result = await run_in_threadpool(smile.analyse, data)
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


@router.get("/{upload_id}", response_model=UploadWithData)
async def get_upload(upload_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    upload = await db.get(Upload, upload_id)
    if upload is None or upload.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find that image.")


    data = base64.b64encode(storage.read(upload.stored_name)).decode()
    return UploadWithData(**UploadResponse.model_validate(upload).model_dump(), data=data)


@router.delete("/{upload_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_upload(upload_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    upload = await db.get(Upload, upload_id)
    if upload is None or upload.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find that image.")

    stored_name = upload.stored_name
    await db.delete(upload)
    await db.commit()
    storage.remove(stored_name)
