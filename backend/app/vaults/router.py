from fastapi import APIRouter, Depends, File, UploadFile, BackgroundTasks, status
from typing import List, Dict, Any
from uuid import UUID
import asyncpg
from app.dependencies import get_db, get_current_user
from app.common.exceptions import ValidationError
from app.vaults.schemas import VaultCreate, VaultUpdate, VaultListResponse, VaultDetailResponse, ParseResumeResponse
from app.vaults.service import (
    list_vaults,
    get_vault,
    create_vault,
    update_vault,
    delete_vault
)
from app.ingestion.pdf_parser import parse_pdf
from app.ingestion.latex_parser import parse_latex
from app.projects.service import process_project_background
from app.internships.service import process_internship_background

vaults_router = APIRouter()

@vaults_router.post(
    "/parse-resume",
    response_model=ParseResumeResponse,
    tags=["Vaults"]
)
async def parse_resume_endpoint(
    file: UploadFile = File(...)
):
    filename = file.filename or "resume.pdf"
    content = await file.read()
    
    if filename.endswith(".tex"):
        try:
            latex_code = content.decode("utf-8")
        except UnicodeDecodeError:
            latex_code = content.decode("utf-8", errors="ignore")
        return await parse_latex(latex_code, filename)
    elif filename.endswith(".pdf"):
        return await parse_pdf(content, filename)
    else:
        raise ValidationError("Unsupported file extension. Only .pdf and .tex files are supported.")

@vaults_router.post(
    "",
    response_model=VaultDetailResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Vaults"]
)
async def create_new_vault(
    vault_data: VaultCreate,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    
    # Create vault, returning inserted IDs
    vault_id, project_ids, internship_ids = await create_vault(conn, user_id, vault_data)
    
    # Enqueue background processes for all projects and internships created
    for pid in project_ids:
        background_tasks.add_task(
            process_project_background,
            user_id,
            pid,
            vault_id
        )
        
    for iid in internship_ids:
        background_tasks.add_task(
            process_internship_background,
            user_id,
            iid,
            vault_id
        )
        
    # Retrieve complete details to return
    return await get_vault(conn, user_id, vault_id)

@vaults_router.get(
    "",
    response_model=List[VaultListResponse],
    tags=["Vaults"]
)
async def get_user_vaults(
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    return await list_vaults(conn, user_id)

@vaults_router.get(
    "/{vault_id}",
    response_model=VaultDetailResponse,
    tags=["Vaults"]
)
async def get_user_vault_detail(
    vault_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    return await get_vault(conn, user_id, vault_id)

@vaults_router.put(
    "/{vault_id}",
    response_model=VaultDetailResponse,
    tags=["Vaults"]
)
async def edit_user_vault(
    vault_id: UUID,
    vault_data: VaultUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    return await update_vault(conn, user_id, vault_id, vault_data)

@vaults_router.delete(
    "/{vault_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Vaults"]
)
async def remove_user_vault(
    vault_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    await delete_vault(conn, user_id, vault_id)
