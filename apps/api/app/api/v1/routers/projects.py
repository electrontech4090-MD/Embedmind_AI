from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from app.api.v1.deps import get_current_user, get_project_repository, get_message_repository
from app.models.user import User
from app.repositories.project_repo import ProjectRepository
from app.repositories.message_repo import MessageRepository
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.schemas.requirement_doc import RequirementDocResponse
from app.schemas.design_doc import DesignDocResponse
from app.schemas.message import MessageResponse
from app.orchestration.agents.debugger_agent import run_debugger_agent
from app.orchestration.agents.pdf_gen_agent import generate_pdf_report


router = APIRouter()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    return project_repo.create(project_in, current_user.id)

@router.get("", response_model=list[ProjectResponse])
def list_projects(
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    return project_repo.list_by_user(current_user.id)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Auto-initialize requirement goals and constraints from initial idea if empty
    if project.requirement_doc and not project.requirement_doc.goals and project.requirement_doc.summary and project.requirement_doc.summary != "No description provided yet.":
        try:
            from app.orchestration.llm_client import query_llm
            from app.orchestration.agents.requirement_agent import RequirementOutput
            from app.schemas.requirement_doc import RequirementDocBase
            
            system_instruction = (
                "You are the Requirement Analysis Agent for EmbedMind AI.\n"
                "Your task is to take the user's initial project idea and formulate "
                "an initial draft of technical goals and constraints.\n"
                "Provide a clean technical summary, typical target objectives/goals, "
                "and physical/architectural constraints."
            )
            prompt = f"Initialize technical requirements for this project idea: {project.requirement_doc.summary}"
            
            res_json = query_llm(system_instruction, prompt, RequirementOutput)
            parsed = RequirementOutput(**res_json)
            
            # Save to database
            doc_in = RequirementDocBase(
                summary=parsed.summary,
                goals=parsed.goals,
                constraints=parsed.constraints,
                status="draft"
            )
            project_repo.update_requirement_doc(project_id, current_user.id, doc_in)
            
            # Reload project to populate the updated relation
            project = project_repo.get_by_id(project_id, current_user.id)
        except Exception as e:
            print("FAILED TO INITIALIZE SPECIFICATIONS:", e)

    return project

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.update(project_id, current_user.id, project_in)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    deleted = project_repo.delete(project_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return

@router.get("/{project_id}/requirements", response_model=RequirementDocResponse)
def get_project_requirements(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.requirement_doc:
        raise HTTPException(status_code=404, detail="Requirements document not found")
    return project.requirement_doc

@router.get("/{project_id}/messages", response_model=list[MessageResponse])
def get_project_messages(
    project_id: str,
    agent_name: str | None = None,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    message_repo: MessageRepository = Depends(get_message_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return message_repo.get_by_project_id(project_id, agent_name=agent_name)

@router.get("/{project_id}/design", response_model=DesignDocResponse)
def get_project_design(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.design_doc:
        project_repo.create_design_doc(project_id, current_user.id)
        # reload project to get relation populated
        project = project_repo.get_by_id(project_id, current_user.id)
    return project.design_doc

class HardwareUpdate(BaseModel):
    mcu: str | None = None
    components: list | None = None
    pin_map: dict | None = None
    bom: list | None = None

class DebugRequest(BaseModel):
    code: str

@router.get("/{project_id}/hardware")
def get_hardware(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    hd = project_repo.get_hardware_design(project_id, current_user.id)
    if not hd:
        # If it doesn't exist yet, return an empty/default design
        return {
            "mcu": "",
            "components": [],
            "pin_map": {},
            "bom": []
        }
    return {
        "mcu": hd.mcu,
        "components": hd.components,
        "pin_map": hd.pin_map,
        "bom": hd.bom
    }

@router.patch("/{project_id}/hardware")
def patch_hardware(
    project_id: str,
    hardware_in: HardwareUpdate,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    hd = project_repo.get_hardware_design(project_id, current_user.id)
    mcu = hardware_in.mcu if hardware_in.mcu is not None else (hd.mcu if hd else "")
    components = hardware_in.components if hardware_in.components is not None else (hd.components if hd else [])
    pin_map = hardware_in.pin_map if hardware_in.pin_map is not None else (hd.pin_map if hd else {})
    bom = hardware_in.bom if hardware_in.bom is not None else (hd.bom if hd else [])
    
    updated_hd = project_repo.update_hardware_design(project_id, current_user.id, mcu, components, pin_map, bom)
    return {
        "mcu": updated_hd.mcu,
        "components": updated_hd.components,
        "pin_map": updated_hd.pin_map,
        "bom": updated_hd.bom
    }

@router.get("/{project_id}/firmware")
def get_firmware(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    files = project_repo.get_firmware_files(project_id, current_user.id)
    return [
        {
            "id": f.id,
            "filename": f.filename,
            "content": f.content,
            "language": f.language
        } for f in files
    ]

@router.post("/{project_id}/debug")
def post_debug(
    project_id: str,
    req: DebugRequest,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    hd = project_repo.get_hardware_design(project_id, current_user.id)
    hd_info = {
        "mcu": hd.mcu if hd else "ESP32",
        "pin_map": hd.pin_map if hd else {}
    }
    
    result = run_debugger_agent(req.code, hd_info)
    return result

@router.get("/{project_id}/report/pdf")
def get_pdf_report(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    project = project_repo.get_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    req_doc = {
        "summary": project.requirement_doc.summary if project.requirement_doc else "",
        "goals": project.requirement_doc.goals if project.requirement_doc else [],
        "constraints": project.requirement_doc.constraints if project.requirement_doc else []
    }
    
    hd = project_repo.get_hardware_design(project_id, current_user.id)
    hd_info = {
        "mcu": (hd.mcu if (hd and hd.mcu) else ""),
        "components": (hd.components if (hd and hd.components) else (project.design_doc.components if project.design_doc else [])),
        "pin_map": (hd.pin_map if (hd and hd.pin_map) else (project.design_doc.pin_mappings if project.design_doc else {})),
        "bom": (hd.bom if (hd and hd.bom) else [])
    }
    
    files = [
        {
            "filename": f.filename,
            "content": f.content,
            "language": f.language
        } for f in project_repo.get_firmware_files(project_id, current_user.id)
    ]
    if not files and project.design_doc and project.design_doc.sample_code:
        files = [{
            "filename": "main.cpp",
            "content": project.design_doc.sample_code,
            "language": "cpp"
        }]
    
    # We can fetch sample mock/last debug findings from session or model
    # For reporting, if there are no debug logs, we pass empty list.
    debug_findings = []
    
    pdf_bytes = generate_pdf_report(project.name, req_doc, hd_info, files, debug_findings)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={project.name}_report.pdf"
        }
    )

