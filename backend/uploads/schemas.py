from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SmileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    face_found: bool
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


class UploadWithData(UploadResponse):
    data: str
