import hashlib
import os
import secrets
from datetime import UTC, datetime, timedelta

from dotenv import load_dotenv
from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from users.models import Session, User

load_dotenv()

SESSION_COOKIE = "session"
SESSION_LIFETIME = timedelta(days=7)

_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


def _hash(token: str) -> str:
    # The token is already long and random, so a plain SHA-256 is plenty here.
    # (Slow hashes like Argon2 are for passwords people pick themselves.)
    return hashlib.sha256(token.encode()).hexdigest()


async def start_session(response: Response, user: User, db: AsyncSession) -> None:
    # A random token that means nothing on its own. It only works while there's
    # a matching row in the sessions table, which is what makes logout real.
    token = secrets.token_urlsafe(32)
    db.add(Session(token_hash=_hash(token), user_id=user.id, expires_at=datetime.now(UTC) + SESSION_LIFETIME))
    await db.commit()

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
        await db.execute(delete(Session).where(Session.token_hash == _hash(token)))
        await db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="lax", secure=_COOKIE_SECURE)


async def get_current_user(
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Route dependency: gives you the logged-in user, or a 401 if there isn't one."""
    not_logged_in = HTTPException(status.HTTP_401_UNAUTHORIZED, "You're not logged in.")
    if not session:
        raise not_logged_in

    row = await db.scalar(select(Session).where(Session.token_hash == _hash(session)))
    if row is None:
        raise not_logged_in

    if row.expires_at <= datetime.now(UTC):
        await db.delete(row)
        await db.commit()
        raise not_logged_in

    user = await db.get(User, row.user_id)
    if user is None:
        raise not_logged_in
    return user
