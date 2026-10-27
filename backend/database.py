import os
from collections.abc import AsyncIterator
# DB connection file for backend
from dotenv import load_dotenv
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

load_dotenv()


def _asyncpg_url(raw: str) -> tuple[URL, dict]:
    """Accepts URLs as Neon, Render etc. hand them out (postgresql://...?sslmode=require)
    and turns them into what asyncpg understands."""
    url = make_url(raw)
    if url.drivername in ("postgres", "postgresql"):
        url = url.set(drivername="postgresql+asyncpg")

    # asyncpg rejects libpq-only options like these; SSL goes through connect_args instead.
    query = dict(url.query)
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    connect_args = {"ssl": sslmode} if sslmode and sslmode != "disable" else {}
    return url.set(query=query), connect_args


DATABASE_URL, _connect_args = _asyncpg_url(os.environ["DATABASE_URL"])

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
