from pydantic import BaseModel
from datetime import datetime

class ComponentSchema(BaseModel):
    name: str
    interface: str

class BOMItemSchema(BaseModel):
    item: str
    qty: int
    cost: float

class HardwareDesignBase(BaseModel):
    mcu: str | None = None
    components: list[ComponentSchema] = []
    pin_map: dict[str, dict[str, str]] = {}
    bom: list[BOMItemSchema] = []

class HardwareDesignResponse(HardwareDesignBase):
    id: str
    project_id: str
    updated_at: datetime

    class Config:
        from_attributes = True
