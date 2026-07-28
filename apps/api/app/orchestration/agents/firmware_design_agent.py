import json
from pydantic import BaseModel, Field
from app.core.config import settings
from app.orchestration.state import GraphState
from app.orchestration.llm_client import query_llm

class FirmwareFileItem(BaseModel):
    filename: str = Field(description="Name of the file, e.g. main.c, dht22.c, config.h.")
    content: str = Field(description="Complete generated C/C++ source code content.")
    language: str = Field(description="Programming language syntax identifier ('c' or 'cpp').")

class FirmwareDesignOutput(BaseModel):
    files: list[FirmwareFileItem] = Field(description="Generated source code files.")
    assistant_response: str = Field(description="Friendly chat message to display to the user explaining the firmware design choices.")

raw_schema = {
    "type": "OBJECT",
    "properties": {
        "files": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "filename": {"type": "STRING", "description": "Filename (e.g. main.c, config.h)"},
                    "content": {"type": "STRING", "description": "Source code text (C/C++)"},
                    "language": {"type": "STRING", "description": "Language syntax identifier ('c' or 'cpp')"}
                },
                "required": ["filename", "content", "language"]
            },
            "description": "List of source code files generated for the hardware"
        },
        "assistant_response": {
            "type": "STRING",
            "description": "Friendly explanation of the firmware structure and files"
        }
    },
    "required": ["files", "assistant_response"]
}

def run_firmware_design_agent(state: GraphState) -> dict:
    system_instruction = (
        "You are the Firmware Design Agent for EmbedMind AI, an expert embedded firmware developer.\n"
        "Your task is to take the hardware design specification (MCU selection, component interface types, and pin mappings) and conversation history, and generate fully functional, synthesizable microcontroller drivers and main setup code (e.g., main.cpp, dht22.h, config.h).\n"
        "You MUST conform the generated code to use the EXACT GPIO pin mappings defined in the hardware pin map. Output clear, compile-ready code.\n\n"
        "You MUST respond with a JSON object that strictly adheres to the requested schema. Provide at least a config header and a main file."
    )

    history_str = ""
    for msg in state.get("conversation_history", []):
        role = msg.role if hasattr(msg, "role") else msg.get("role", "user")
        content = msg.content if hasattr(msg, "content") else msg.get("content", "")
        history_str += f"{role.upper()}: {content}\n"

    design_str = (
        f"Hardware Design Spec:\n"
        f"MCU: {state.get('mcu')}\n"
        f"Components: {state.get('components', [])}\n"
        f"Pin Mappings: {state.get('pin_map', {})}\n"
    )

    prompt = (
        f"Generate the firmware design source files based on the hardware specification.\n\n"
        f"{design_str}\n"
        f"Conversation History:\n{history_str}\n"
    )

    try:
        res_json = query_llm(system_instruction, prompt, FirmwareDesignOutput)
        parsed = FirmwareDesignOutput(**res_json)
        
        # Save to database (will be done in router, but we update the graph state here)
        return {
            "firmware_files": [f.model_dump() for f in parsed.files],
            "assistant_response": parsed.assistant_response
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Fallback state
        return {
            "firmware_files": [
                {
                    "filename": "main.cpp",
                    "content": "// Fallback main code\nvoid setup() {\n  // GPIO setup\n}\nvoid loop() {\n  // main loop\n}\n",
                    "language": "cpp"
                }
            ],
            "assistant_response": "I had trouble generating the firmware source code. Could you please check your description or try again."
        }
