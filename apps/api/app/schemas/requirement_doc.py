from pydantic import BaseModel
from datetime import datetime

class RequirementDocBase(BaseModel):
    summary: str | None = None
    goals: list[str] = []
    constraints: list[str] = []
    status: str = "draft"

class RequirementDocResponse(RequirementDocBase):
    id: str
    project_id: str
    updated_at: datetime

    class Config:
        from_attributes = True
