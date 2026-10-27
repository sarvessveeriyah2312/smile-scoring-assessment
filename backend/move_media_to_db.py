"""One-off: copies images from the old media/ folder into the stored_files table.
Safe to run more than once; files already in the database are skipped."""

import asyncio
from pathlib import Path

from sqlalchemy import select

from database import Base, SessionLocal, engine
from uploads.models import StoredFile, Upload
from users import models as user_models  # noqa: F401

MEDIA_DIR = Path(__file__).resolve().parent / "media"


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        names = (await db.scalars(select(Upload.stored_name))).all()
        existing = set((await db.scalars(select(StoredFile.name))).all())
        copied = missing = 0
        for name in names:
            if name in existing:
                continue
            path = MEDIA_DIR / name
            if not path.exists():
                missing += 1
                continue
            db.add(StoredFile(name=name, data=path.read_bytes()))
            copied += 1
        await db.commit()

    await engine.dispose()
    print(f"Copied {copied} file(s). {missing} upload(s) had no file in media/.")


asyncio.run(main())
