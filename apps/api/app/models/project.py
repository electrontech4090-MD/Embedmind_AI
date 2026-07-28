import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="active", nullable=False) # active, completed, archived
    created_at = Column(DateTime, default=func.now(), nullable=False)

    owner = relationship("User", back_populates="projects")
    requirement_doc = relationship("RequirementDoc", back_populates="project", uselist=False, cascade="all, delete-orphan")
    design_doc = relationship("DesignDoc", back_populates="project", uselist=False, cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="project", cascade="all, delete-orphan")
    hardware_design = relationship("HardwareDesign", back_populates="project", uselist=False, cascade="all, delete-orphan")
    firmware_files = relationship("FirmwareFile", back_populates="project", cascade="all, delete-orphan")
