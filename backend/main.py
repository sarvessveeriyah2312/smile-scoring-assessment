from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from cache import redis
from database import Base, engine
from task_queue import close_queue
from encryption_middleware import PayloadEncryptionMiddleware
from uploads import models as upload_models  # noqa: F401  (registers the uploads table)
from uploads.router import router as uploads_router
from users import models  # noqa: F401  (imported so the users table is known to Base)
from users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Make sure the tables exist before we take any requests. Fine for now;
    # once the schema starts changing we'll want proper migrations instead.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # create_all doesn't touch tables that already exist, so bring older
        # smile_analyses tables up to date. Safe to run every time.
        await conn.execute(text("ALTER TABLE smile_analyses ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'done'"))
        await conn.execute(text("ALTER TABLE smile_analyses ALTER COLUMN face_found DROP NOT NULL"))
    yield
    await engine.dispose()
    await redis.aclose()
    await close_queue()


app = FastAPI(lifespan=lifespan)

# Request and response values travel encrypted. See payload_crypto.py.
app.add_middleware(PayloadEncryptionMiddleware)

app.include_router(users_router)
app.include_router(uploads_router)
