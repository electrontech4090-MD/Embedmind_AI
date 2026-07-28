from pydantic import BaseModel
from datetime import datetime

class ComponentItem(BaseModel):
    name: str
    package: str
    purpose: str

class PinMappingItem(BaseModel):
    mcu_pin: str
    device_pin: str
    description: str

class DesignDocBase(BaseModel):
    components: list[ComponentItem] = []
    pin_mappings: list[PinMappingItem] = []
    firmware_architecture: str | None = None
    sample_code: str | None = None

class DesignDocResponse(DesignDocBase):
    id: str
    project_id: str
    updated_at: datetime

    class Config:
        from_attributes = True
