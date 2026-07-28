import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class DesignDoc(Base):
    __tablename__ = "design_docs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    components = Column(JSON, default=list, nullable=False) # list of dicts (name, package, purpose)
    pin_mappings = Column(JSON, default=list, nullable=False) # list of dicts (mcu_pin, device_pin, description)
    firmware_architecture = Column(String(4000), nullable=True)
    sample_code = Column(String(8000), nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("Project", back_populates="design_doc")
