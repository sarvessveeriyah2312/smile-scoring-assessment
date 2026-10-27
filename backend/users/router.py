from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from users.models import User
from users.rate_limit import check_login_allowed, clear_failures, client_ip, record_failure
from users.schemas import LoginRequest, RegisterRequest, UserResponse
from users.security import hash_password, verify_password
from users.session import SESSION_COOKIE, end_session, get_current_user, start_session

router = APIRouter(prefix="/auth", tags=["auth"])

_DUMMY_HASH = hash_password("not-a-real-password")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()

    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    await db.refresh(user)
    return user


@router.post("/login", response_model=UserResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    email, ip = payload.email.lower(), client_ip(request)
    await check_login_allowed(email, ip)

    user = await db.scalar(select(User).where(User.email == email))

    # Google-only accounts have no password, so they take the dummy path like a missing user.
    stored_hash = user.password_hash if user and user.password_hash else _DUMMY_HASH
    password_ok = verify_password(payload.password, stored_hash)
    if not user or not user.password_hash or not password_ok:
        await record_failure(email, ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That email and password don't match our records.")

    await clear_failures(email)
    await start_session(response, user, db)
    return user


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    await end_session(response, session, db)
