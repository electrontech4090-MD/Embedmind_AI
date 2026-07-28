import json
from pydantic import BaseModel, Field
from app.orchestration.state import GraphState
from app.orchestration.llm_client import query_llm

class FirmwareFileContent(BaseModel):
    filename: str = Field(description="Name of the file (e.g. main.c, dht22.h, gpio.c).")
    content: str = Field(description="Complete C/C++ source code content including headers, setups, and main loop. You MUST fill this field with actual C code; do not omit it.")
    language: str = Field(description="Syntax tag, usually 'c' or 'cpp'.")

class FirmwareOutput(BaseModel):
    files: list[FirmwareFileContent] = Field(description="List of generated driver files and project files.")

def run_firmware_agent(state: GraphState) -> dict:
    """
    Takes the selected MCU, components, and pin connections map, and automatically
    generates fully initialized C/C++ driver code and configuration files.
    """
    system_instruction = (
        "You are the Firmware Design Agent for EmbedMind AI, a senior embedded firmware engineer.\n"
        "Your task is to write clean, modular C/C++ source and header files "
        "to initialize the microcontroller and communicate with the chosen peripheral sensors.\n\n"
        "You MUST read the hardware design configuration:\n"
        "- Configure GPIO pins, registers, and serial busses (SPI/I2C/UART) to match the EXACT pins specified in the pin map.\n"
        "- Write initialization functions for all selected components.\n"
        "- Keep the generated code concise (less than 60 lines of code per file). Use stubs and comments for repetitive driver boilerplate to prevent token truncation.\n"
        "- Provide exactly 2 or 3 files: a main.c, a main.h, and one driver file (e.g. dht22.h)."
    )

    # Format the current hardware layout details for the prompt
    pin_map_str = json.dumps(state.get("pin_map", {}), indent=2)
    components_str = json.dumps(state.get("components", []), indent=2)

    prompt = (
        f"Generate source code drivers for this hardware design:\n\n"
        f"MCU: {state.get('mcu', 'STM32F407VGT6')}\n"
        f"Selected Components:\n{components_str}\n"
        f"Pin Connections Map:\n{pin_map_str}"
    )

    try:
        res_json = query_llm(system_instruction, prompt, FirmwareOutput, provider="grok")
        print("RAW_FIRMWARE_JSON:", json.dumps(res_json, indent=2))
        parsed = FirmwareOutput(**res_json)
        
        # Format files for graph state
        state_files = [
            {
                "filename": f.filename,
                "content": f.content,
                "language": f.language
            }
            for f in parsed.files
        ]
        return {
            "firmware_artifacts": state_files
        }
    except Exception as e:
        print("FIRMWARE_AGENT_ERROR:", e)
        import traceback
        traceback.print_exc()
        # Fallback
        fallback_code = (
            "/* Error generating firmware drivers */\n"
            "#include <stdio.h>\n\n"
            "int main(void) {\n"
            "    printf(\"Hardware synthesis failure.\\n\");\n"
            "    return 0;\n"
            "}"
        )
        return {
            "firmware_artifacts": [
                {
                    "filename": "main.c",
                    "content": fallback_code,
                    "language": "c"
                }
            ]
        }
