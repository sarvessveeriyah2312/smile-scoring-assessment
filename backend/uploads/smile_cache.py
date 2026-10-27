import hashlib
import json
import logging
from dataclasses import asdict

from fastapi.concurrency import run_in_threadpool
from redis.exceptions import RedisError

from cache import redis
from uploads.smile import SmileResult, analyse

log = logging.getLogger(__name__)

# Bump the version if the model or scoring changes, so old results aren't reused.
_KEY_PREFIX = "smile:v1:"
_TTL_SECONDS = 30 * 24 * 60 * 60


async def analyse_cached(data: bytes) -> SmileResult:
    """Same as smile.analyse, but an identical image is only ever analysed once."""
    key = _KEY_PREFIX + hashlib.sha256(data).hexdigest()

    try:
        cached = await redis.get(key)
        if cached:
            return SmileResult(**json.loads(cached))
    except (RedisError, ValueError, TypeError):
        log.warning("Couldn't read cached smile result, analysing instead", exc_info=True)

    result = await run_in_threadpool(analyse, data)

    try:
        await redis.set(key, json.dumps(asdict(result)), ex=_TTL_SECONDS)
    except RedisError:
        log.warning("Couldn't cache smile result", exc_info=True)
    return result
