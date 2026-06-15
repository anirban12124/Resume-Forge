from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: str
    github_url: str
    live_url: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: UUID
    vault_id: UUID
    user_id: UUID
    structured_data: Dict[str, Any]
    last_synced_commit: Optional[str] = None
    user_impact_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
