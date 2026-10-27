from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from users.models import User
from users.schemas import LoginRequest, RegisterRequest, UserResponse
from users.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# Used when the email doesn't exist, so a failed login takes about the same time
# either way. Otherwise you could tell which emails have accounts by timing it.
_DUMMY_HASH = hash_password("not-a-real-password")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # People type their email in all sorts of ways, so store one consistent version.
    email = payload.email.lower()

    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # Two sign-ups with the same email landed at the same moment. The unique
        # constraint caught it, so the second one gets the same answer as above.
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    await db.refresh(user)
    return user


@router.post("/login", response_model=UserResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))

    password_ok = verify_password(payload.password, user.password_hash if user else _DUMMY_HASH)
    if not user or not password_ok:
        # Same message for "no such email" and "wrong password" on purpose,
        # so nobody can use this form to check who has an account.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That email and password don't match our records.")

    return user
