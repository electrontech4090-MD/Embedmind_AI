import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class RequirementDoc(Base):
    __tablename__ = "requirement_docs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    summary = Column(String(2000), nullable=True)
    goals = Column(JSON, default=list, nullable=False) # list of strings
    constraints = Column(JSON, default=list, nullable=False) # list of strings
    status = Column(String(50), default="draft", nullable=False) # draft, active, finalized
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("Project", back_populates="requirement_doc")
