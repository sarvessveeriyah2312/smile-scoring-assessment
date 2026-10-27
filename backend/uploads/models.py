from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(64), unique=True)
    content_type: Mapped[str] = mapped_column(String(50))
    size: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Loaded alongside the upload every time, since every screen that shows an
    # upload also shows its score.
    smile: Mapped["SmileAnalysis | None"] = relationship(
        back_populates="upload", lazy="selectin", cascade="all, delete-orphan", passive_deletes=True
    )


class SmileAnalysis(Base):
    """What MediaPipe made of an upload. One row per upload."""

    __tablename__ = "smile_analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    upload_id: Mapped[int] = mapped_column(ForeignKey("uploads.id", ondelete="CASCADE"), unique=True)
    # pending -> done, or failed. The worker fills in the rest when it's done.
    status: Mapped[str] = mapped_column(String(16), server_default="done")
    # False when MediaPipe couldn't find a face. Empty until the analysis has run.
    face_found: Mapped[bool | None] = mapped_column(Boolean)
    # The raw blendshape values, 0 to 1, kept so any score can be explained later.
    smile_left: Mapped[float | None] = mapped_column(Float)
    smile_right: Mapped[float | None] = mapped_column(Float)
    # (smile_left + smile_right) / 2 * 100
    score: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    upload: Mapped[Upload] = relationship(back_populates="smile")
