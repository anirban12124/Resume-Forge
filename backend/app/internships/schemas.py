from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

class InternshipBase(BaseModel):
    role: str
    company_name: str
    start_date: date
    end_date: Optional[date] = None
    description_bullets: List[str]

class InternshipCreate(InternshipBase):
    pass

class InternshipUpdate(BaseModel):
    role: Optional[str] = None
    company_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description_bullets: Optional[List[str]] = None

class InternshipResponse(InternshipBase):
    id: UUID
    vault_id: UUID
    user_id: UUID
    duration_months: Optional[int] = None
    role_domain: Optional[str] = None
    inferred_tech_stack: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
