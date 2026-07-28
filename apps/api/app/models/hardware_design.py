import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class HardwareDesign(Base):
    __tablename__ = "hardware_designs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    mcu = Column(String(255), nullable=True)
    components = Column(JSON, default=list, nullable=False) # list of dicts (name, interface, etc.)
    pin_map = Column(JSON, default=dict, nullable=False) # dict of connections
    bom = Column(JSON, default=list, nullable=False) # list of dicts (item, qty, cost)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("Project", back_populates="hardware_design")
