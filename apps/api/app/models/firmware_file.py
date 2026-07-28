import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class FirmwareFile(Base):
    __tablename__ = "firmware_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(50), default="c", nullable=False) # c, cpp, h, etc.
    created_at = Column(DateTime, default=func.now(), nullable=False)

    project = relationship("Project", back_populates="firmware_files")
