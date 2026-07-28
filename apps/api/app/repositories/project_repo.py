from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.requirement_doc import RequirementDoc
from app.models.design_doc import DesignDoc
from app.models.hardware_design import HardwareDesign
from app.models.firmware_file import FirmwareFile
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.requirement_doc import RequirementDocBase
from app.schemas.design_doc import DesignDocBase
from app.schemas.hardware_design import HardwareDesignBase


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, project_id: str, user_id: str) -> Project | None:
        return self.db.query(Project).filter(Project.id == project_id, Project.user_id == user_id).first()

    def list_by_user(self, user_id: str) -> list[Project]:
        return self.db.query(Project).filter(Project.user_id == user_id).order_by(Project.created_at.desc()).all()

    def create(self, project_in: ProjectCreate, user_id: str) -> Project:
        db_project = Project(
            name=project_in.name,
            user_id=user_id
        )
        self.db.add(db_project)
        self.db.flush() # flush to generate ID for relationship

        # Create empty requirement doc for the project
        db_req_doc = RequirementDoc(
            project_id=db_project.id,
            summary=project_in.initial_idea or "No description provided yet."
        )
        self.db.add(db_req_doc)

        # Create empty design doc for the project
        db_design_doc = DesignDoc(
            project_id=db_project.id
        )
        self.db.add(db_design_doc)

        self.db.commit()
        self.db.refresh(db_project)
        return db_project

    def update(self, project_id: str, user_id: str, project_in: ProjectUpdate) -> Project | None:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return None
        
        update_data = project_in.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(db_project, key, val)
        
        self.db.commit()
        self.db.refresh(db_project)
        return db_project

    def delete(self, project_id: str, user_id: str) -> bool:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return False
        self.db.delete(db_project)
        self.db.commit()
        return True

    def update_requirement_doc(self, project_id: str, user_id: str, doc_in: RequirementDocBase) -> RequirementDoc | None:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project or not db_project.requirement_doc:
            return None
        
        req_doc = db_project.requirement_doc
        update_data = doc_in.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(req_doc, key, val)
        
        self.db.commit()
        self.db.refresh(req_doc)
        return req_doc

    def get_hardware_design(self, project_id: str, user_id: str) -> HardwareDesign | None:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return None
        return db_project.hardware_design

    def update_hardware_design(self, project_id: str, user_id: str, mcu: str, components: list, pin_map: dict, bom: list) -> HardwareDesign | None:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return None
        
        design = db_project.hardware_design
        if not design:
            design = HardwareDesign(project_id=project_id)
            self.db.add(design)
            self.db.flush()
        
        design.mcu = mcu
        design.components = [c if isinstance(c, dict) else c.model_dump() for c in components]
        design.pin_map = pin_map
        design.bom = [b if isinstance(b, dict) else b.model_dump() for b in bom]
        
        self.db.commit()
        self.db.refresh(design)
        return design

    def get_firmware_files(self, project_id: str, user_id: str) -> list[FirmwareFile]:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return []
        return db_project.firmware_files

    def update_firmware_files(self, project_id: str, user_id: str, files_list: list) -> list[FirmwareFile]:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return []
            
        # Clear existing files to update
        self.db.query(FirmwareFile).filter(FirmwareFile.project_id == project_id).delete()
        
        saved_files = []
        for file_data in files_list:
            db_file = FirmwareFile(
                project_id=project_id,
                filename=file_data.get("filename"),
                content=file_data.get("content"),
                language=file_data.get("language", "c")
            )
            self.db.add(db_file)
            saved_files.append(db_file)
            
        self.db.commit()
        return saved_files

    def create_design_doc(self, project_id: str, user_id: str) -> DesignDoc | None:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return None
        if db_project.design_doc:
            return db_project.design_doc
        
        db_design_doc = DesignDoc(project_id=project_id)
        self.db.add(db_design_doc)
        self.db.commit()
        self.db.refresh(db_design_doc)
        return db_design_doc

    def update_design_doc(self, project_id: str, user_id: str, doc_in: DesignDocBase) -> DesignDoc | None:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return None
        
        if not db_project.design_doc:
            # Create on demand
            db_design_doc = DesignDoc(project_id=project_id)
            self.db.add(db_design_doc)
            self.db.commit()
            self.db.refresh(db_project)
        design_doc = db_project.design_doc
        update_data = doc_in.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(design_doc, key, val)
        
        self.db.commit()
        self.db.refresh(design_doc)
        return design_doc


    def get_hardware_design(self, project_id: str, user_id: str) -> HardwareDesign | None:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return None
        return db_project.hardware_design

    def update_hardware_design(self, project_id: str, user_id: str, mcu: str, components: list, pin_map: dict, bom: list) -> HardwareDesign | None:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return None
        
        hd = db_project.hardware_design
        if not hd:
            hd = HardwareDesign(project_id=project_id)
            self.db.add(hd)
            self.db.flush()
            
        hd.mcu = mcu
        hd.components = components
        hd.pin_map = pin_map
        hd.bom = bom
        
        self.db.commit()
        self.db.refresh(hd)
        return hd

    def get_firmware_files(self, project_id: str, user_id: str) -> list[FirmwareFile]:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return []
        return db_project.firmware_files

    def update_firmware_files(self, project_id: str, user_id: str, files_list: list[dict]) -> list[FirmwareFile]:
        db_project = self.get_by_id(project_id, user_id)
        if not db_project:
            return []
        
        # Clear existing firmware files for this project
        self.db.query(FirmwareFile).filter(FirmwareFile.project_id == project_id).delete()
        
        # Add new files
        created_files = []
        for f in files_list:
            db_file = FirmwareFile(
                project_id=project_id,
                filename=f["filename"],
                content=f["content"],
                language=f.get("language", "cpp")
            )
            self.db.add(db_file)
            created_files.append(db_file)
            
        self.db.commit()
        return created_files

