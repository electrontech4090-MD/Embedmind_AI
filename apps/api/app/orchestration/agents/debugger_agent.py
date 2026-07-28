import json
from pydantic import BaseModel, Field
from app.orchestration.state import GraphState
from app.orchestration.llm_client import query_llm

class DebugFinding(BaseModel):
    issue: str = Field(description="Title of the bug or warning (e.g. GPIO Port Mismatch, Clock Uninitialized).")
    cause: str = Field(description="Technical explanation of what is wrong.")
    fix: str = Field(description="Direct steps or code snippet to correct the bug.")
    severity: str = Field(description="Severity level: 'critical' (blocking execution), 'warning' (run-time bugs), 'info' (optimizations).")

class DebuggerOutput(BaseModel):
    findings: list[DebugFinding] = Field(description="List of detected bugs and warning highlights.")
    fixed_code: str = Field(description="The complete corrected code block.")

def run_debugger_agent(pasted_code: str, state: dict) -> dict:
    """
    Takes the pasted source code alongside the current MCU and pin map,
    performs static analysis, and returns findings and fixed code.
    """
    system_instruction = (
        "You are the Firmware Debugger Agent for EmbedMind AI, an expert embedded code validator.\n"
        "Your task is to analyze the user's uploaded code block, check it against the project's selected "
        "microcontroller (MCU) and GPIO connection map, and rewrite/port the code to target the selected MCU.\n\n"
        "Crucial Instructions:\n"
        "1. You MUST update the code to include the correct microcontroller-specific header files (e.g. `#include <Arduino.h>` for Arduino Uno/ESP32, or `#include \"stm32f4xx_hal.h\"` / `#include \"stm32f4xx.h\"` for STM32) at the top of the corrected code.\n"
        "2. Rewrite all pin numbers, pinMode/digitalWrite calls, and serial bus setups to match the project's selected MCU and the provided pin connection map.\n"
        "3. Output a detailed checklist of findings (pin mismatches, missing initializations, timing hazards) and the complete corrected code block containing the proper controller header files."
    )

    pin_map_str = json.dumps(state.get("pin_map", {}), indent=2)

    prompt = (
        f"Perform code debugging analysis on the user's code:\n\n"
        f"Selected MCU: {state.get('mcu', 'STM32F407VGT6')}\n"
        f"Pin connections map to match:\n{pin_map_str}\n\n"
        f"User's Code to Analyze:\n"
        f"------------------------\n"
        f"{pasted_code}\n"
        f"------------------------"
    )

    try:
        res_json = query_llm(system_instruction, prompt, DebuggerOutput, provider="grok")
        parsed = DebuggerOutput(**res_json)
        return {
            "findings": [f.model_dump() for f in parsed.findings],
            "fixed_code": parsed.fixed_code
        }
    except Exception as e:
        return {
            "findings": [{
                "issue": "Static Analyzer Error",
                "cause": "Could not complete parsing on the uploaded code file.",
                "fix": "Verify code format is valid C/C++.",
                "severity": "info"
            }],
            "fixed_code": pasted_code
        }
