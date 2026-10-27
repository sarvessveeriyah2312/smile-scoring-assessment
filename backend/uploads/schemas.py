from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class SmileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Literal["pending", "done", "failed"]
    face_found: bool | None
    smile_left: float | None
    smile_right: float | None
    score: float | None


class UploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: str
    size: int
    created_at: datetime
    # None for images uploaded before scoring existed, or if the analysis failed.
    smile: SmileResponse | None

