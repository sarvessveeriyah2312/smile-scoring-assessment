import logging
import math

from fastapi import HTTPException, Request, status
from redis.exceptions import RedisError

from cache import redis

log = logging.getLogger(__name__)

WINDOW_SECONDS = 15 * 60
MAX_FAILURES_PER_EMAIL = 5
MAX_FAILURES_PER_IP = 20

# Requests arrive through the Next.js proxy, so the real client is in X-Forwarded-For.
# Only trust that header when the request actually came from the proxy on this machine.
_TRUSTED_PROXIES = {"127.0.0.1", "::1"}


def client_ip(request: Request) -> str | None:
    """The visitor's IP, or None if it came via the proxy without saying who the visitor was.
    Without that, every visitor would share the proxy's IP and lock each other out."""
    host = request.client.host if request.client else None
    if host not in _TRUSTED_PROXIES:
        return host
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",")[0].strip() if forwarded else None


def _keys(email: str, ip: str | None) -> list[tuple[str, int]]:
    keys = [(f"login:fail:email:{email}", MAX_FAILURES_PER_EMAIL)]
    if ip:
        keys.append((f"login:fail:ip:{ip}", MAX_FAILURES_PER_IP))
    return keys


async def check_login_allowed(email: str, ip: str | None) -> None:
    keys = _keys(email, ip)
    try:
        counts = await redis.mget([key for key, _ in keys])
        blocked = [key for (key, limit), count in zip(keys, counts) if int(count or 0) >= limit]
        if not blocked:
            return
        wait = max([await redis.ttl(key) for key in blocked] + [1])
    except RedisError:
        # Better to allow logins without the limit than to lock everyone out.
        log.warning("Redis unavailable, skipping login rate limit", exc_info=True)
        return

    minutes = math.ceil(wait / 60)
    raise HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        f"Too many failed attempts. Please try again in {minutes} minute{'s' if minutes != 1 else ''}.",
        headers={"Retry-After": str(wait)},
    )


async def record_failure(email: str, ip: str | None) -> None:
    try:
        async with redis.pipeline(transaction=True) as pipe:
            for key, _ in _keys(email, ip):
                # NX: the window starts at the first failure and isn't pushed back by later ones.
                pipe.incr(key).expire(key, WINDOW_SECONDS, nx=True)
            await pipe.execute()
    except RedisError:
        log.warning("Redis unavailable, failed login not counted", exc_info=True)


async def clear_failures(email: str) -> None:
    try:
        await redis.delete(_keys(email, None)[0][0])
    except RedisError:
        pass
