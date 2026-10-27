from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import Base, engine
from users import models  # noqa: F401  (imported so the users table is known to Base)
from users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Make sure the tables exist before we take any requests. Fine for now;
    # once the schema starts changing we'll want proper migrations instead.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(lifespan=lifespan)

app.include_router(users_router)
