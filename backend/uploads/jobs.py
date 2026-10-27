import logging

from fastapi.concurrency import run_in_threadpool

from database import SessionLocal
from uploads import storage
from uploads.models import Upload
from uploads.smile_cache import analyse_cached

log = logging.getLogger(__name__)


async def analyse_upload(ctx: dict, upload_id: int) -> None:
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
