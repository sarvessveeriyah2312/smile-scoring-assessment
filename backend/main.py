from contextlib import asynccontextmanager

from fastapi import FastAPI

from cache import redis
from database import Base, engine
from encryption_middleware import PayloadEncryptionMiddleware
from uploads import models as upload_models  # noqa: F401  (registers the uploads table)
from uploads import smile
from uploads.router import router as uploads_router
from users import models  # noqa: F401  (imported so the users table is known to Base)
from users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Make sure the tables exist before we take any requests. Fine for now;
    # once the schema starts changing we'll want proper migrations instead.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Load the face model now: a missing model should stop startup, not an upload.
    smile.load()
    yield
    await engine.dispose()
    await redis.aclose()


app = FastAPI(lifespan=lifespan)

# Request and response values travel encrypted. See payload_crypto.py.
app.add_middleware(PayloadEncryptionMiddleware)

app.include_router(users_router)
app.include_router(uploads_router)
