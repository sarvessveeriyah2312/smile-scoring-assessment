"""Background worker for smile analysis. Run alongside the API: arq worker.WorkerSettings"""

from fastapi.concurrency import run_in_threadpool

from database import engine
from task_queue import REDIS_SETTINGS
from uploads import models as upload_models  # noqa: F401
from uploads import smile
from uploads.jobs import analyse_upload
from users import models as user_models  # noqa: F401


async def startup(ctx: dict) -> None:
    await run_in_threadpool(smile.load)


async def shutdown(ctx: dict) -> None:
    await engine.dispose()


class WorkerSettings:
    functions = [analyse_upload]
    redis_settings = REDIS_SETTINGS
    on_startup = startup
    on_shutdown = shutdown
    job_timeout = 120
    # MediaPipe only takes one image at a time anyway (see smile._lock).
    max_jobs = 4
