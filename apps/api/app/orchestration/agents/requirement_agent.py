import json
from pydantic import BaseModel, Field
from app.orchestration.state import GraphState, AgentMessage
from app.orchestration.llm_client import query_llm

class RequirementOutput(BaseModel):
    summary: str = Field(description="A technical summary of the project requirements so far.")
    goals: list[str] = Field(description="A list of technical goals for the embedded system.")
    constraints: list[str] = Field(description="A list of design and physical constraints (e.g. power, cost, size, peripherals).")
    is_ready_to_finalize: bool = Field(description="Set to true if there are no major clarifying questions left and the requirements are complete.")
    clarifying_questions: list[str] = Field(description="List of up to 3 specific questions to clarify missing details (e.g. power source, wireless protocol, MCU preference). Leave empty if ready to finalize.")
    assistant_response: str = Field(description="The message to display to the user in chat (either asking the clarifying questions or congratulating them on completing the requirements stage).")

def run_requirement_agent(state: GraphState) -> dict:
    system_instruction = (
        "You are the Requirement Analysis Agent for EmbedMind AI, an expert embedded systems architect.\n"
        "Your task is to take the user's project idea and IMMEDIATELY formulate a complete, suitable technical requirement specification.\n\n"
        "Directives:\n"
        "1. DO NOT ask endless clarifying questions. Take the user's project idea and automatically infer suitable, realistic engineering defaults (e.g. microcontroller, power budget, GPIO assignments, communication protocols, and peripherals).\n"
        "2. Formulate:\n"
        "   - A concise technical summary.\n"
        "   - 3-5 clear, professional System Goals.\n"
        "   - 3-5 practical Design Constraints.\n"
        "3. Set `is_ready_to_finalize = true` by default so that the hardware design and firmware code agents can immediately begin synthesis for this project.\n"
        "4. In your `assistant_response`, present the complete requirement specification to the user. Inform them that the hardware design and firmware driver code are being synthesized automatically based on these requirements, and that if they wish to customize or modify any requirement (e.g. change MCU, add sensors, modify pins), they can simply reply with their specific needs."
    )

    # Format conversation history for the prompt
    history_str = ""
    for msg in state.get("conversation_history", []):
        # Handle both Pydantic models and dicts dynamically
        role = msg.role if hasattr(msg, "role") else msg.get("role", "user")
        content = msg.content if hasattr(msg, "content") else msg.get("content", "")
        history_str += f"{role.upper()}: {content}\n"
    
    prompt = f"Analyze the following conversation and update the current requirement document status:\n\n{history_str}"
    
    try:
        res_json = query_llm(system_instruction, prompt, RequirementOutput)
        parsed = RequirementOutput(**res_json)
        return {
            "summary": parsed.summary,
            "goals": parsed.goals,
            "constraints": parsed.constraints,
            "is_ready_to_finalize": parsed.is_ready_to_finalize,
            "clarifying_questions": parsed.clarifying_questions,
            "assistant_response": parsed.assistant_response
        }
    except Exception as e:
        # Fallback in case of parsing/LLM failure
        return {
            "summary": state.get("summary", "Error analyzing requirements."),
            "goals": state.get("goals", []),
            "constraints": state.get("constraints", []),
            "is_ready_to_finalize": False,
            "clarifying_questions": ["Could you restate your project idea? I encountered an error."],
            "assistant_response": "I'm sorry, I had trouble parsing the requirements. Could you please provide more details about your project?"
        }
