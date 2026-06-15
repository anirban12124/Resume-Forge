from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.projects.schemas import ProjectCreate, ProjectResponse
from app.internships.schemas import InternshipCreate, InternshipResponse

class VaultCreate(BaseModel):
    name: str
    constants_data: Dict[str, Any]
    skills_data: Dict[str, Any]
    has_summary: bool
    source_origin: str
    original_filename: Optional[str] = None
    parse_confidence_score: Optional[float] = None
    projects: List[ProjectCreate] = []
    internships: List[InternshipCreate] = []

class VaultUpdate(BaseModel):
    name: Optional[str] = None
    constants_data: Optional[Dict[str, Any]] = None
    skills_data: Optional[Dict[str, Any]] = None
    has_summary: Optional[bool] = None
    github_sync_status: Optional[bool] = None

class VaultListResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime
    github_sync_status: bool
    project_count: int
    internship_count: int

class VaultDetailResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    base_template_id: str
    source_origin: str
    original_filename: Optional[str] = None
    parse_confidence_score: Optional[float] = None
    github_sync_status: bool
    constants_data: Dict[str, Any]
    skills_data: Dict[str, Any]
    has_summary: bool
    created_at: datetime
    updated_at: datetime
    projects: List[ProjectResponse] = []
    internships: List[InternshipResponse] = []

    class Config:
        from_attributes = True

class ParseResumeResponse(BaseModel):
    constants: Dict[str, Any]
    skills: Dict[str, Any]
    has_summary: bool
    parse_confidence_score: float
    source_origin: str
    original_filename: str
