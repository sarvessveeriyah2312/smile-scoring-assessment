import os

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from dotenv import load_dotenv

load_dotenv()

REDIS_SETTINGS = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

_pool: ArqRedis | None = None


async def get_queue() -> ArqRedis:
    global _pool
    if _pool is None:
        _pool = await create_pool(REDIS_SETTINGS)
    return _pool


async def close_queue() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
