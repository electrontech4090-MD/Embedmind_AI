from app.orchestration.agents.design_agent import run_design_agent
from app.orchestration.agents.firmware_agent import run_firmware_agent
from app.orchestration.state import AgentMessage

# Sample finalized requirements state
finalized_state = {
    "project_id": "test-project-123",
    "conversation_history": [
        AgentMessage(role="user", content="I want to build a smart, battery-powered weather station using ESP32 that reads temperature and humidity from a DHT22 sensor and sends data over LoRa every 15 minutes.")
    ],
    "summary": "ESP32-based low-power outdoor weather station collecting temperature and humidity from DHT22, transmitting metrics over 915MHz LoRa peer-to-peer link.",
    "goals": [
        "Read temperature and humidity periodically from DHT22 single-wire sensor",
        "Transmit sensor telemetry over SPI-based LoRa RFM95W transceiver",
        "Put the ESP32 into deep sleep for 15 minutes between samples to conserve battery"
    ],
    "constraints": [
        "Microcontroller: ESP32-WROOM-32E",
        "Sensors: DHT22",
        "Communication: LoRa RFM95W SPI module (915MHz)",
        "Power: 18650 Li-ion battery (3.7V)",
        "Enclosure: IP65 outdoor casing"
    ],
    "is_ready_to_finalize": True,
    "assistant_response": "",
    "clarifying_questions": [],
    "mcu": "",
    "components": [],
    "pin_map": {},
    "bom": [],
    "firmware_artifacts": []
}

print("1. Running Embedded Design Agent...")
design_result = run_design_agent(finalized_state)
print("SUCCESS! Design MCU:", design_result.get("mcu"))

# Merge design results into state
finalized_state.update(design_result)

print("\n2. Running Firmware Synthesis Agent...")
firmware_result = run_firmware_agent(finalized_state)
print("SUCCESS! Generated files:")
for f in firmware_result.get("firmware_artifacts", []):
    print(f"\n--- File: {f['filename']} ({f['language'].upper()}) ---")
    print(f['content'][:350]) # print first 350 chars
    print("...")
