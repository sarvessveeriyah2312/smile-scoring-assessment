from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    data: str = Field(min_length=1)


class UploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: str
    size: int
    created_at: datetime


class UploadWithData(UploadResponse):
    data: str
