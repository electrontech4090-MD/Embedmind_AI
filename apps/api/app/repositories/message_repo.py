from sqlalchemy.orm import Session
from app.models.message import Message

class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_project_id(self, project_id: str, agent_name: str | None = None) -> list[Message]:
        query = self.db.query(Message).filter(Message.project_id == project_id)
        if agent_name:
            if agent_name == "requirement_agent":
                # For requirements, include user messages with None agent_name
                query = query.filter((Message.agent_name == agent_name) | (Message.agent_name.is_(None)))
            else:
                query = query.filter(Message.agent_name == agent_name)
        return query.order_by(Message.created_at.asc()).all()

    def create(self, project_id: str, role: str, content: str, agent_name: str | None = None) -> Message:
        db_message = Message(
            project_id=project_id,
            role=role,
            content=content,
            agent_name=agent_name
        )
        self.db.add(db_message)
        self.db.commit()
        self.db.refresh(db_message)
        return db_message
