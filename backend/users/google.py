import logging
import os
import secrets
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Cookie, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from users.models import User
from users.session import start_session

load_dotenv()
log = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
# The frontend's address. Google sends people back there, and /api forwards it to us.
PUBLIC_URL = os.getenv("PUBLIC_URL", "http://localhost:3000").rstrip("/")
REDIRECT_URI = f"{PUBLIC_URL}/api/auth/google/callback"

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_STATE_COOKIE = "google_oauth_state"
_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

router = APIRouter(prefix="/auth/google", tags=["auth"])


def _back_to_login(reason: str) -> RedirectResponse:
    response = RedirectResponse(f"/login?error={reason}", status_code=303)
    response.delete_cookie(_STATE_COOKIE, path="/")
    return response


@router.get("/login")
async def google_login():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return _back_to_login("google_unavailable")

    # Random value we expect to see again on the way back, so nobody can hand
    # someone a callback link that logs them into an account they didn't pick.
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    response = RedirectResponse(f"{_AUTH_URL}?{urlencode(params)}", status_code=303)
    response.set_cookie(_STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax", secure=_COOKIE_SECURE, path="/")
    return response


@router.get("/callback")
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    saved_state: str | None = Cookie(default=None, alias=_STATE_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if error == "access_denied":
        return _back_to_login("google_cancelled")
    if error or not code or not state or not saved_state or not secrets.compare_digest(state, saved_state):
        return _back_to_login("google")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token = await client.post(
                _TOKEN_URL,
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            token.raise_for_status()
            info = await client.get(_USERINFO_URL, headers={"Authorization": f"Bearer {token.json()['access_token']}"})
            info.raise_for_status()
            profile = info.json()
    except (httpx.HTTPError, KeyError, ValueError):
        log.exception("Google sign-in failed while talking to Google")
        return _back_to_login("google")

    sub, email = profile.get("sub"), (profile.get("email") or "").lower()
    # Only trust emails Google has confirmed, or anyone could claim someone else's address.
    if not sub or not email or not profile.get("email_verified"):
        return _back_to_login("google_unverified")

    user = await db.scalar(select(User).where(User.google_sub == sub))
    if user is None:
        user = await db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, password_hash=None, google_sub=sub)
            db.add(user)
        else:
            user.google_sub = sub
        await db.commit()

    response = RedirectResponse("/upload", status_code=303)
    response.delete_cookie(_STATE_COOKIE, path="/")
    await start_session(response, user, db)
    return response
