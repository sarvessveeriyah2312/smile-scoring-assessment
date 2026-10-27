import logging

from fastapi.concurrency import run_in_threadpool

from sqlalchemy import select

from database import SessionLocal
from uploads import storage
from uploads.models import SmileAnalysis, Upload
from uploads.smile_cache import analyse_cached

log = logging.getLogger(__name__)


async def analyse_upload(upload_id: int) -> None:
    async with SessionLocal() as db:
        upload = await db.get(Upload, upload_id)
        # Deleted before we got to it, or already done by an earlier run.
        if upload is None or upload.smile is None or upload.smile.status != "pending":
            return

        try:
            data = await run_in_threadpool(storage.read, upload.stored_name)
            result = await analyse_cached(data)
        except Exception:
            log.exception("Smile analysis failed for upload %s", upload_id)
            upload.smile.status = "failed"
        else:
            upload.smile.status = "done"
            upload.smile.face_found = result.face_found
            upload.smile.smile_left = result.smile_left
            upload.smile.smile_right = result.smile_right
            upload.smile.score = result.score

        await db.commit()


async def resume_pending() -> None:
    """Picks up analyses that were still pending when the server last stopped."""
    async with SessionLocal() as db:
        ids = (await db.scalars(select(SmileAnalysis.upload_id).where(SmileAnalysis.status == "pending"))).all()
    for upload_id in ids:
        await analyse_upload(upload_id)
