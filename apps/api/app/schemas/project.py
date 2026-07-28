from pydantic import BaseModel
from datetime import datetime
from app.schemas.requirement_doc import RequirementDocResponse
from app.schemas.design_doc import DesignDocResponse

class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    initial_idea: str | None = None

class ProjectUpdate(BaseModel):
    name: str | None = None
    status: str | None = None

class ProjectResponse(ProjectBase):
    id: str
    user_id: str
    status: str
    created_at: datetime
    requirement_doc: RequirementDocResponse | None = None
    design_doc: DesignDocResponse | None = None

    class Config:
        from_attributes = True
