import os
from datetime import UTC, datetime, timedelta

import jwt
from dotenv import load_dotenv
from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from users.models import User

load_dotenv()

SESSION_COOKIE = "session"
SESSION_LIFETIME = timedelta(days=7)

_SECRET = os.environ["SESSION_SECRET"]
_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


def start_session(response: Response, user: User) -> None:
    # A signed token that just says "this is user N until <expiry>". It lives in
    # an httpOnly cookie, so JavaScript on the page can never read or steal it.
    expires = datetime.now(UTC) + SESSION_LIFETIME
    token = jwt.encode({"sub": str(user.id), "exp": expires}, _SECRET, algorithm="HS256")
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=_COOKIE_SECURE,
        path="/",
    )


def end_session(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="lax", secure=_COOKIE_SECURE)


async def get_current_user(
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Route dependency: gives you the logged-in user, or a 401 if there isn't one."""
    not_logged_in = HTTPException(status.HTTP_401_UNAUTHORIZED, "You're not logged in.")
    if not session:
        raise not_logged_in

    try:
        user_id = int(jwt.decode(session, _SECRET, algorithms=["HS256"])["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        # Expired, tampered with, or signed with an old secret. Same answer.
        raise not_logged_in

    # The token could outlive the account, so check they still exist.
    user = await db.get(User, user_id)
    if user is None:
        raise not_logged_in
    return user
