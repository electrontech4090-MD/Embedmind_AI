from typing import TypedDict, List
from pydantic import BaseModel

class AgentMessage(BaseModel):
    role: str # user, assistant, system
    content: str
    agent_name: str | None = None

class GraphState(TypedDict):
    project_id: str
    conversation_history: List[AgentMessage]
    summary: str
    goals: List[str]
    constraints: List[str]
    is_ready_to_finalize: bool
    assistant_response: str
    clarifying_questions: List[str]
    
    # Hardware Design variables
    mcu: str
    components: List[dict]
    pin_map: dict
    bom: List[dict]
    
    # Firmware variables
    firmware_artifacts: List[dict]
