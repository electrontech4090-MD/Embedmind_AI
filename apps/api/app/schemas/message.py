from pydantic import BaseModel
from datetime import datetime

class MessageBase(BaseModel):
    role: str
    content: str
    agent_name: str | None = None

class MessageCreate(BaseModel):
    content: str
    agent_name: str | None = None

class MessageResponse(MessageBase):
    id: str
    project_id: str
    created_at: datetime

    class Config:
        from_attributes = True
