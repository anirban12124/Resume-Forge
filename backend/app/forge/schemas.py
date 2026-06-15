from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional

class ForgeRunRequest(BaseModel):
    vault_id: UUID
    project_count: int = Field(..., ge=1, le=8, description="Number of projects to include (between 1 and 8)")
    internship_count: int = Field(..., ge=0, le=8, description="Number of internships to include (between 0 and 8)")
    jd_text: str = Field(..., min_length=20, description="Job Description text to tailor the resume to")

class ForgeStatusResponse(BaseModel):
    task_id: str
    status: str = Field(..., description="Stage of the pipeline: queued/parsing_jd/selecting_projects/generating_content/compiling_latex/uploading/completed/failed")
    error_message: Optional[str] = None

class ForgeResultResponse(BaseModel):
    pdf_url: str
    tex_content: str
    archive_id: UUID
