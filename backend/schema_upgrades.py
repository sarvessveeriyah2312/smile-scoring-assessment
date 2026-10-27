from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from ids import uuid7


async def upgrade(conn: AsyncConnection) -> None:
    """Brings an existing database up to the current models. Every step is safe to re-run."""
    await conn.execute(text("ALTER TABLE smile_analyses ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'done'"))
    await conn.execute(text("ALTER TABLE smile_analyses ALTER COLUMN face_found DROP NOT NULL"))
    await conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"))
    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)"))
    await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub)"))
    await _user_ids_to_uuid(conn)


async def _user_ids_to_uuid(conn: AsyncConnection) -> None:
    id_type = await conn.scalar(
        text("SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id'")
    )
    if id_type == "uuid":
        return

    # Give each existing user a UUIDv7 stamped with when they signed up, so ids
    # still sort in sign-up order, then repoint sessions and uploads at it.
    await conn.execute(text("ALTER TABLE users ADD COLUMN new_id UUID"))
    rows = (await conn.execute(text("SELECT id, created_at FROM users"))).all()
    for old_id, created_at in rows:
        new_id = uuid7(int(created_at.timestamp() * 1000))
        await conn.execute(text("UPDATE users SET new_id = :new WHERE id = :old"), {"new": new_id, "old": old_id})

    for table in ("sessions", "uploads"):
        await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN new_user_id UUID"))
        await conn.execute(text(f"UPDATE {table} t SET new_user_id = u.new_id FROM users u WHERE t.user_id = u.id"))
        await conn.execute(text(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {table}_user_id_fkey"))
        await conn.execute(text(f"ALTER TABLE {table} DROP COLUMN user_id"))
        await conn.execute(text(f"ALTER TABLE {table} RENAME COLUMN new_user_id TO user_id"))
        await conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN user_id SET NOT NULL"))

    await conn.execute(text("ALTER TABLE users DROP CONSTRAINT users_pkey"))
    await conn.execute(text("ALTER TABLE users DROP COLUMN id"))
    await conn.execute(text("ALTER TABLE users RENAME COLUMN new_id TO id"))
    await conn.execute(text("ALTER TABLE users ALTER COLUMN id SET NOT NULL"))
    await conn.execute(text("ALTER TABLE users ADD PRIMARY KEY (id)"))

    for table in ("sessions", "uploads"):
        await conn.execute(text(
            f"ALTER TABLE {table} ADD CONSTRAINT {table}_user_id_fkey "
            f"FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE"
        ))
        await conn.execute(text(f"CREATE INDEX IF NOT EXISTS ix_{table}_user_id ON {table} (user_id)"))
