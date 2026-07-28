import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from app.api.v1.deps import get_current_user, get_project_repository, get_message_repository
from app.models.user import User
from app.repositories.project_repo import ProjectRepository
from app.repositories.message_repo import MessageRepository
from app.schemas.message import MessageCreate, MessageResponse
from app.schemas.requirement_doc import RequirementDocBase
from app.schemas.design_doc import DesignDocBase
from app.orchestration.graph import graph
from app.orchestration.state import AgentMessage

router = APIRouter()

@router.post("/{project_id}/chat")
async def chat_stream(
    project_id: str,
    message_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    message_repo: MessageRepository = Depends(get_message_repository)
):
    # Verify project ownership
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    active_agent = message_in.agent_name or ("design_agent" if project.requirement_doc.status == "finalized" else "requirement_agent")

    # Store user message in DB
    user_msg = message_repo.create(
        project_id=project_id,
        role="user",
        content=message_in.content,
        agent_name=active_agent
    )

    # Ensure design_doc exists (legacy support)
    if not project.design_doc:
        project_repo.create_design_doc(project_id, current_user.id)
        # refresh project
        project = project_repo.get_by_id(project_id, current_user.id)

    async def event_generator():
        nonlocal active_agent
        # Step 1: Send "thinking" status
        is_design_phase = active_agent == "design_agent"

        status_msg = "Embedded Design Agent is analyzing..." if is_design_phase else "Requirement Agent is analyzing..."
        yield f"data: {json.dumps({'event': 'status', 'status': 'thinking', 'message': status_msg})}\n\n"
        await asyncio.sleep(0.1)

        # Step 2: Prepare conversation history for LangGraph
        db_messages = message_repo.get_by_project_id(project_id, agent_name=active_agent)
        conversation_history = [
            AgentMessage(role=m.role, content=m.content, agent_name=m.agent_name)
            for m in db_messages
        ]

        try:
            # Step 3: Run LangGraph Orchestration or Direct Model call
            if active_agent in ["firmware_agent", "debugger_agent", "reports_agent"]:
                # Direct Model Call to handle Phase 2 agents dynamically using gemini-flash-latest!
                history_str = ""
                for msg in conversation_history:
                    history_str += f"{msg.role.upper()}: {msg.content}\n"

                reqs_str = (
                    f"Requirements:\n"
                    f"Summary: {project.requirement_doc.summary or ''}\n"
                    f"Goals: {', '.join(project.requirement_doc.goals or [])}\n"
                    f"Constraints: {', '.join(project.requirement_doc.constraints or [])}\n"
                )
                
                design_str = ""
                if project.design_doc:
                    design_str = (
                        f"Design Components: {project.design_doc.components}\n"
                        f"Pin Mappings: {project.design_doc.pin_mappings}\n"
                        f"Firmware Architecture: {project.design_doc.firmware_architecture}\n"
                        f"Current Sample Code: {project.design_doc.sample_code}\n"
                    )

                prompt = (
                    f"Process request for active agent: {active_agent}\n\n"
                    f"{reqs_str}\n"
                    f"{design_str}\n"
                    f"Conversation History:\n{history_str}\n"
                )

                from app.orchestration.llm_client import query_llm
                from pydantic import BaseModel, Field

                is_finalized = True

                class ChatFirmwareOutput(BaseModel):
                    sample_code: str = Field(description="Concise firmware code snippet (max 45 lines).")
                    firmware_architecture: str = Field(description="Short explanation of the code loop.")
                    assistant_response: str = Field(description="Friendly explanation of changes to display in chat.")

                class ChatGeneralOutput(BaseModel):
                    assistant_response: str = Field(description="The response content to display to the user in chat.")

                if active_agent == "firmware_agent":
                    system_instruction = (
                        "You are the Firmware Developer Agent for EmbedMind AI.\n"
                        "Your job is to update/refine the device microcontroller firmware code and architecture description based on requirement/design spec and chat history.\n"
                        "Do not write more than 50 lines of code. Use stubs/comments for boilerplate."
                    )
                    
                    loop = asyncio.get_running_loop()
                    res_json = await loop.run_in_executor(
                        None, 
                        lambda: query_llm(system_instruction, prompt, ChatFirmwareOutput, provider="grok")
                    )

                    result = {
                        "summary": project.requirement_doc.summary or "",
                        "goals": project.requirement_doc.goals or [],
                        "constraints": project.requirement_doc.constraints or [],
                        "is_ready_to_finalize": True,
                        "requirement_status": "finalized",
                        "components": project.design_doc.components if project.design_doc else [],
                        "pin_mappings": project.design_doc.pin_mappings if project.design_doc else [],
                        "firmware_architecture": res_json.get("firmware_architecture", ""),
                        "sample_code": res_json.get("sample_code", ""),
                        "assistant_response": res_json.get("assistant_response", "")
                    }
                else:
                    # Debugger and Reports agent
                    system_instruction = (
                        "You are the Firmware Debugger Agent. Analyze code anomalies and output issues/causes/recommendations."
                        if active_agent == "debugger_agent" else
                        "You are the Reports Agent. Output README specifications and technical document summaries."
                    )
                    
                    provider_tag = "grok" if active_agent == "debugger_agent" else None
                    loop = asyncio.get_running_loop()
                    res_json = await loop.run_in_executor(
                        None, 
                        lambda: query_llm(system_instruction, prompt, ChatGeneralOutput, provider=provider_tag)
                    )

                    result = {
                        "summary": project.requirement_doc.summary or "",
                        "goals": project.requirement_doc.goals or [],
                        "constraints": project.requirement_doc.constraints or [],
                        "is_ready_to_finalize": True,
                        "requirement_status": "finalized",
                        "components": project.design_doc.components if project.design_doc else [],
                        "pin_mappings": project.design_doc.pin_mappings if project.design_doc else [],
                        "firmware_architecture": project.design_doc.firmware_architecture if project.design_doc else "",
                        "sample_code": project.design_doc.sample_code if project.design_doc else "",
                        "assistant_response": res_json.get("assistant_response", "")
                    }
            else:
                # LangGraph Orchestration (Requirement and Design Agents)
                hd = project_repo.get_hardware_design(project_id, current_user.id)
                initial_state = {
                    "project_id": project_id,
                    "conversation_history": conversation_history,
                    "summary": project.requirement_doc.summary or "",
                    "goals": project.requirement_doc.goals or [],
                    "constraints": project.requirement_doc.constraints or [],
                    "is_ready_to_finalize": False,
                    "assistant_response": "",
                    "clarifying_questions": [],
                    
                    # Design doc fields
                    "requirement_status": project.requirement_doc.status or "draft",
                    "components": project.design_doc.components or [],
                    "pin_mappings": project.design_doc.pin_mappings or [],
                    "firmware_architecture": project.design_doc.firmware_architecture or "",
                    "sample_code": project.design_doc.sample_code or "",

                    # Phase 3 additions
                    "mcu": hd.mcu if hd else "",
                    "pin_map": hd.pin_map if hd else {},
                    "bom": hd.bom if hd else [],
                    "firmware_files": []
                }

                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(None, lambda: graph.invoke(initial_state))
                is_finalized = result.get("is_ready_to_finalize", False) or result.get("requirement_status") == "finalized"
                active_agent = "design_agent" if is_finalized else "requirement_agent"

            # Step 4: Save assistant response to DB
            assistant_msg = message_repo.create(
                project_id=project_id,
                role="assistant",
                content=result["assistant_response"],
                agent_name=active_agent
            )

            # Step 5: Update project requirements in DB
            doc_in = RequirementDocBase(
                summary=result["summary"],
                goals=result["goals"],
                constraints=result["constraints"],
                status="finalized" if is_finalized else "draft"
            )
            project_repo.update_requirement_doc(project_id, current_user.id, doc_in)

            # Step 5b: Update design doc and new hardware/firmware tables in DB
            if is_finalized:
                # Save hardware design
                project_repo.update_hardware_design(
                    project_id=project_id,
                    user_id=current_user.id,
                    mcu=result.get("mcu", ""),
                    components=result.get("components", []),
                    pin_map=result.get("pin_map", {}),
                    bom=result.get("bom", [])
                )
                
                # Save firmware files
                firmware_list = result.get("firmware_files", [])
                if firmware_list:
                    project_repo.update_firmware_files(
                        project_id=project_id,
                        user_id=current_user.id,
                        files_list=firmware_list
                    )
                elif active_agent == "firmware_agent" and result.get("sample_code"):
                    existing_files = project_repo.get_firmware_files(project_id, current_user.id)
                    if existing_files:
                        main_file = None
                        for f in existing_files:
                            if f.filename in ["main.cpp", "main.c", "main.h"]:
                                main_file = f
                                break
                        if not main_file:
                            main_file = existing_files[0]
                        main_file.content = result["sample_code"]
                        project_repo.db.commit()
                    else:
                        project_repo.update_firmware_files(
                            project_id=project_id,
                            user_id=current_user.id,
                            files_list=[{
                                "filename": "main.cpp",
                                "content": result["sample_code"],
                                "language": "cpp"
                            }]
                        )
                
                # Map back to DesignDoc for backward compatibility/old dashboard UI panels
                design_components = [
                    {
                        "name": c.get("name", "Peripheral"),
                        "package": c.get("package", "Module"),
                        "purpose": c.get("purpose", c.get("interface", "GPIO"))
                    } for c in result.get("components", [])
                ]
                
                # Flatten pin map for old table format
                design_pin_mappings = []
                for dev, pm in result.get("pin_map", {}).items():
                    if isinstance(pm, dict):
                        for dev_pin, mcu_pin in pm.items():
                            design_pin_mappings.append({
                                "mcu_pin": mcu_pin,
                                "device_pin": f"{dev} {dev_pin}",
                                "description": f"Connection for {dev} {dev_pin}"
                            })
                
                main_code = ""
                if firmware_list:
                    # Find main source file
                    for f in firmware_list:
                        if "main" in f.get("filename", ""):
                            main_code = f.get("content", "")
                            break
                    if not main_code:
                        main_code = firmware_list[0].get("content", "")
                
                design_in = DesignDocBase(
                    components=design_components,
                    pin_mappings=design_pin_mappings,
                    firmware_architecture=result.get("firmware_architecture") or "Generated sequentially.",
                    sample_code=main_code
                )
                project_repo.update_design_doc(project_id, current_user.id, design_in)
            else:
                # Map back to DesignDoc for backward compatibility/old dashboard UI panels during draft
                design_components = [
                    {
                        "name": c.get("name", "Peripheral"),
                        "package": c.get("package", "Module"),
                        "purpose": c.get("purpose", c.get("interface", "GPIO"))
                    } for c in result.get("components", [])
                ]
                design_in = DesignDocBase(
                    components=design_components,
                    pin_mappings=result.get("pin_mappings", []),
                    firmware_architecture=result.get("firmware_architecture", ""),
                    sample_code=result.get("sample_code", "")
                )
                project_repo.update_design_doc(project_id, current_user.id, design_in)


            # Step 6: Stream back the final response + updates
            payload = {
                "event": "message",
                "message": {
                    "id": assistant_msg.id,
                    "role": "assistant",
                    "content": assistant_msg.content,
                    "agent_name": active_agent,
                    "created_at": assistant_msg.created_at.isoformat()
                },
                "requirement_doc": {
                    "summary": result["summary"],
                    "goals": result["goals"],
                    "constraints": result["constraints"],
                    "status": doc_in.status
                },
                "design_doc": {
                    "components": [c.model_dump() if hasattr(c, "model_dump") else c for c in design_in.components],
                    "pin_mappings": [pm.model_dump() if hasattr(pm, "model_dump") else pm for pm in design_in.pin_mappings],
                    "firmware_architecture": design_in.firmware_architecture or "",
                    "sample_code": design_in.sample_code or ""
                }
            }
            yield f"data: {json.dumps(payload)}\n\n"

        except Exception as e:
            # Handle failure gracefullly
            err_payload = {
                "event": "error",
                "message": f"Orchestrator error: {str(e)}"
            }
            yield f"data: {json.dumps(err_payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
