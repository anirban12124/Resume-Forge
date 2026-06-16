from pydantic import BaseModel
from typing import Dict, Any
from uuid import UUID
from datetime import datetime

class ArchiveSummary(BaseModel):
    project_count: int
    internship_count: int

class ArchiveListResponse(BaseModel):
    id: UUID
    title: str
    vault_name: str
    created_at: datetime
    summary: ArchiveSummary

    class Config:
        from_attributes = True

class ArchiveDetailResponse(ArchiveListResponse):
    vault_id: UUID
    pdf_url: str
    tex_content: str
    jd_text: str
    forge_config: Dict[str, Any]

    class Config:
        from_attributes = True
