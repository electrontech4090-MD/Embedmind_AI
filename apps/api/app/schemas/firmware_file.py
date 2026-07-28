from pydantic import BaseModel
from datetime import datetime

class FirmwareFileBase(BaseModel):
    filename: str
    content: str
    language: str

class FirmwareFileResponse(FirmwareFileBase):
    id: str
    project_id: str
    created_at: datetime

    class Config:
        from_attributes = True
