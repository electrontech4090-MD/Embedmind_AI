import json
import google.generativeai as genai
from pydantic import BaseModel, Field
from app.core.config import settings
from app.orchestration.state import GraphState

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

class ComponentItem(BaseModel):
    name: str = Field(description="Name/Model of the component, e.g. DHT22, RFM95W.")
    interface: str = Field(description="Communication interface type, e.g. I2C, SPI, GPIO, Single-Wire.")

class BomItem(BaseModel):
    item: str = Field(description="Name of the BOM item.")
    qty: int = Field(description="Quantity required.")
    cost: float = Field(description="Estimated unit cost in USD.")

class HardwareDesignOutput(BaseModel):
    mcu: str = Field(description="Selected microcontroller model, e.g. ESP32-WROOM-32D, STM32F407VGT6, RP2040.")
    components: list[ComponentItem] = Field(description="List of peripheral devices and sensors.")
    pin_map: dict[str, dict[str, str]] = Field(description="Microcontroller-to-peripheral pin mapping connection dictionary.")
    bom: list[BomItem] = Field(description="Bill of Materials with quantities and cost allocations.")
    assistant_response: str = Field(description="Friendly chat message to display to the user explaining the hardware choices.")

raw_schema = {
    "type": "OBJECT",
    "properties": {
        "mcu": {
            "type": "STRING",
            "description": "Selected microcontroller model, e.g. ESP32-WROOM-32D, STM32F407VGT6, RP2040."
        },
        "components": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING", "description": "Component name/model"},
                    "interface": {"type": "STRING", "description": "Interface type (I2C, SPI, GPIO, Single-Wire, etc.)"}
                },
                "required": ["name", "interface"]
            },
            "description": "Peripheral devices and sensors"
        },
        "pin_map": {
            "type": "OBJECT",
            "description": "Keyed by component name, mapping device pins to MCU/power pins (e.g. {'DHT22': {'DATA': 'GPIO_PA1', 'VCC': '3V3', 'GND': 'GND'}})"
        },
        "bom": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "item": {"type": "STRING", "description": "Item name"},
                    "qty": {"type": "INTEGER", "description": "Quantity"},
                    "cost": {"type": "NUMBER", "description": "Unit cost in USD"}
                },
                "required": ["item", "qty", "cost"]
            },
            "description": "Bill of Materials listing"
        },
        "assistant_response": {
            "type": "STRING",
            "description": "Friendly explanation of design choices and connections"
        }
    },
    "required": ["mcu", "components", "pin_map", "bom", "assistant_response"]
}

def run_hardware_design_agent(state: GraphState) -> dict:
    model = genai.GenerativeModel(
        model_name="gemini-3.5-flash",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": raw_schema,
            "temperature": 0.1
        },
        system_instruction=(
            "You are the Hardware Design Agent for EmbedMind AI, an expert embedded hardware engineer.\n"
            "Your task is to take finalized requirement specification and conversation history, select a suitable MCU, select peripheral sensors, map their pins logically to standard communication buses (SPI/I2C/UART/GPIO/etc.), and generate an estimated BOM.\n\n"
            "You MUST respond with a JSON object that strictly adheres to the requested schema. Provide a complete pin mapping with power connections (VCC, GND) and logical pins."
        )
    )

    history_str = ""
    for msg in state.get("conversation_history", []):
        history_str += f"{msg.role.upper()}: {msg.content}\n"

    reqs_str = (
        f"Finalized Requirements:\n"
        f"Summary: {state.get('summary')}\n"
        f"Goals: {', '.join(state.get('goals', []))}\n"
        f"Constraints: {', '.join(state.get('constraints', []))}\n"
    )

    prompt = (
        f"Create the hardware design based on the requirements and chat history.\n\n"
        f"{reqs_str}\n"
        f"Conversation History:\n{history_str}\n"
    )

    try:
        response = model.generate_content(prompt)
        res_json = json.loads(response.text)
        parsed = HardwareDesignOutput(**res_json)
        
        # Save to database (will be done in router, but we update the graph state here)
        return {
            "mcu": parsed.mcu,
            "components": [c.model_dump() for c in parsed.components],
            "pin_map": parsed.pin_map,
            "bom": [b.model_dump() for b in parsed.bom],
            "assistant_response": parsed.assistant_response,
            "requirement_status": "finalized"
        }
    except Exception as e:
        # Fallback state
        import traceback
        traceback.print_exc()
        return {
            "mcu": "ESP32-WROOM-32D",
            "components": [{"name": "DHT22", "interface": "Single-Wire"}],
            "pin_map": {"DHT22": {"DATA": "GPIO_PA1", "VCC": "3V3", "GND": "GND"}},
            "bom": [{"item": "ESP32 MCU Module", "qty": 1, "cost": 4.50}, {"item": "DHT22 Sensor", "qty": 1, "cost": 2.00}],
            "assistant_response": "I had trouble generating the system design specification. Could you please check your description or try again?",
            "requirement_status": "finalized"
        }
