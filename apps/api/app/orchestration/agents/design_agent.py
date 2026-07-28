from pydantic import BaseModel, Field
from app.orchestration.state import GraphState
from app.orchestration.llm_client import query_llm

class ComponentDetail(BaseModel):
    name: str = Field(description="Name of the component (e.g. DHT22, RFM95W).")
    interface: str = Field(description="Interface type (e.g. SPI, I2C, UART, Single-Wire).")

class PinConnection(BaseModel):
    component_name: str = Field(description="Name of the peripheral component (e.g. DHT22).")
    pin_name: str = Field(description="Peripheral pin name (e.g. VCC, GND, DATA, SDA, SCL).")
    mcu_pin: str = Field(description="Microcontroller pin connected to (e.g. 3V3, GND, GPIO4, GPIO5, PA4, PA5).")

class BOMItem(BaseModel):
    item: str = Field(description="Name of the component or MCU.")
    qty: int = Field(description="Quantity required.")
    cost: float = Field(description="Estimated unit cost in USD.")

class HardwareDesignOutput(BaseModel):
    mcu: str = Field(description="Selected microcontroller model (e.g. STM32F407VGT6, ESP32-WROOM-32E, RP2040).")
    components: list[ComponentDetail] = Field(description="List of selected sensors and peripherals.")
    pin_map: list[PinConnection] = Field(description="Complete flat list of pin connections from all components to the MCU pins.")
    bom: list[BOMItem] = Field(description="Estimated Bill of Materials (BOM) with item quantities and unit pricing.")

def run_design_agent(state: GraphState) -> dict:
    """
    Takes the requirement doc summary, goals, and constraints and automatically
    generates a hardware design (MCU, sensors/components, BOM, pinout mapping).
    """
    system_instruction = (
        "You are the Embedded Design Agent for EmbedMind AI, a senior hardware schematics engineer.\n"
        "Your task is to take a finalized Requirement Specification (summary, goals, and constraints) "
        "and automatically select the optimal microcontroller (MCU) and peripheral component parts, "
        "allocate standard GPIO/SPI/I2C/UART pinouts, and draft a Bill of Materials.\n\n"
        "Make realistic engineering choices:\n"
        "- For low-power IoT: Choose ESP32 or STM32L series.\n"
        "- Map standard pins correctly (e.g. STM32 PA9/PA10 for USART1 TX/RX, PA5/PA6/PA7 for SPI1 MOSI/MISO/SCK, or ESP32 GPIO21/GPIO22 for I2C SDA/SCL).\n"
        "- Ensure power pins (VCC -> 3V3/5V, GND -> GND) are mapped for every component.\n"
        "- Provide typical commercial quantities and pricing."
    )

    prompt = (
        f"Generate a Hardware Design based on these requirements:\n\n"
        f"Summary: {state.get('summary', '')}\n"
        f"Goals: {', '.join(state.get('goals', []))}\n"
        f"Constraints: {', '.join(state.get('constraints', []))}"
    )

    try:
        res_json = query_llm(system_instruction, prompt, HardwareDesignOutput)
        parsed = HardwareDesignOutput(**res_json)
        
        # Convert flat list of PinConnection to double-nested dictionary for DB
        db_pin_map = {}
        for conn in parsed.pin_map:
            comp_name = conn.component_name
            if comp_name not in db_pin_map:
                db_pin_map[comp_name] = {}
            db_pin_map[comp_name][conn.pin_name] = conn.mcu_pin

        return {
            "mcu": parsed.mcu,
            "components": [c.model_dump() for c in parsed.components],
            "pin_map": db_pin_map,
            "bom": [b.model_dump() for b in parsed.bom]
        }
    except Exception as e:
        print("DESIGN_AGENT_ERROR:", e)
        import traceback
        traceback.print_exc()
        # Fallback
        return {
            "mcu": "ESP32-WROOM-32E" if "ESP32" in str(state) else "STM32F407VGT6",
            "components": [],
            "pin_map": {},
            "bom": []
        }
