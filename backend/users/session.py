import hashlib
import logging
import os
import secrets
from datetime import UTC, datetime, timedelta

from dotenv import load_dotenv
from fastapi import Cookie, Depends, HTTPException, Response, status
from redis.exceptions import RedisError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from cache import redis
from database import get_db
from users.models import Session, User

load_dotenv()

SESSION_COOKIE = "session"
SESSION_LIFETIME = timedelta(days=7)

_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

log = logging.getLogger(__name__)


def _hash(token: str) -> str:
    # The token is already long and random, so a plain SHA-256 is plenty here.
    # (Slow hashes like Argon2 are for passwords people pick themselves.)
    return hashlib.sha256(token.encode()).hexdigest()


# Redis keeps token hash -> user id so most requests skip the sessions table.
# The database stays the source of truth: any Redis failure just falls back to it.
def _cache_key(token_hash: str) -> str:
    return f"session:{token_hash}"


async def _cache_get(token_hash: str) -> int | None:
    try:
        value = await redis.get(_cache_key(token_hash))
        return int(value) if value else None
    except RedisError:
        log.warning("Redis unavailable, checking session in the database", exc_info=True)
        return None


async def _cache_set(token_hash: str, user_id: int, expires_at: datetime) -> None:
    seconds = int((expires_at - datetime.now(UTC)).total_seconds())
    if seconds <= 0:
        return
    try:
        await redis.set(_cache_key(token_hash), user_id, ex=seconds)
    except RedisError:
        pass


async def _cache_delete(token_hash: str) -> None:
    try:
        await redis.delete(_cache_key(token_hash))
    except RedisError:
        log.warning("Redis unavailable, cached session not cleared", exc_info=True)


async def start_session(response: Response, user: User, db: AsyncSession) -> None:
    # A random token that means nothing on its own. It only works while there's
    # a matching row in the sessions table, which is what makes logout real.
    token = secrets.token_urlsafe(32)
    token_hash, expires_at = _hash(token), datetime.now(UTC) + SESSION_LIFETIME
    db.add(Session(token_hash=token_hash, user_id=user.id, expires_at=expires_at))
    await db.commit()
    await _cache_set(token_hash, user.id, expires_at)

    # httpOnly so JavaScript on the page can never read or steal it.
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=_COOKIE_SECURE,
        path="/",
    )


async def end_session(response: Response, token: str | None, db: AsyncSession) -> None:
    # Delete the session on our side first. After this the token is dead, even
    # if someone copied it before logging out.
    if token:
        token_hash = _hash(token)
        await db.execute(delete(Session).where(Session.token_hash == token_hash))
        await db.commit()
        await _cache_delete(token_hash)
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="lax", secure=_COOKIE_SECURE)


async def get_current_user(
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Route dependency: gives you the logged-in user, or a 401 if there isn't one."""
    not_logged_in = HTTPException(status.HTTP_401_UNAUTHORIZED, "You're not logged in.")
    if not session:
        raise not_logged_in

    token_hash = _hash(session)
    user_id = await _cache_get(token_hash)

    if user_id is None:
        row = await db.scalar(select(Session).where(Session.token_hash == token_hash))
        if row is None:
            raise not_logged_in
        if row.expires_at <= datetime.now(UTC):
            await db.delete(row)
            await db.commit()
            raise not_logged_in
        user_id = row.user_id
        await _cache_set(token_hash, user_id, row.expires_at)

    user = await db.get(User, user_id)
    if user is None:
        await _cache_delete(token_hash)
        raise not_logged_in
    return user
