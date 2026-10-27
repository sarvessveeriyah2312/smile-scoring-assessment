import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool

from cache import redis
import schema_upgrades
from database import Base, engine
from encryption_middleware import PayloadEncryptionMiddleware
from uploads import models as upload_models  # noqa: F401  (registers the uploads table)
from uploads import smile
from uploads.jobs import resume_pending
from uploads.router import router as uploads_router
from users import models  # noqa: F401  (imported so the users table is known to Base)
from users.google import router as google_router
from users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Make sure the tables exist before we take any requests. Fine for now;
    # once the schema starts changing we'll want proper migrations instead.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # create_all doesn't touch tables that already exist, so bring older ones up to date.
        await schema_upgrades.upgrade(conn)
    # A missing model should stop startup, not fail every upload later.
    await run_in_threadpool(smile.load)
    resume = asyncio.create_task(resume_pending())
    yield
    resume.cancel()
    await engine.dispose()
    await redis.aclose()


app = FastAPI(lifespan=lifespan)

# Request and response values travel encrypted. See payload_crypto.py.
app.add_middleware(PayloadEncryptionMiddleware)

app.include_router(users_router)
app.include_router(google_router)
app.include_router(uploads_router)
