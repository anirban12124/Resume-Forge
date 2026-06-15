from fastapi import APIRouter, Depends, BackgroundTasks, status
from typing import List, Dict, Any
from uuid import UUID
import asyncpg
from app.dependencies import get_db, get_current_user
from app.internships.schemas import InternshipCreate, InternshipUpdate, InternshipResponse
from app.internships.service import (
    get_internship,
    list_internships,
    create_internship,
    update_internship,
    delete_internship,
    process_internship_background
)

internships_router = APIRouter()

@internships_router.post(
    "/vaults/{vault_id}/internships",
    response_model=InternshipResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Internships"]
)
async def add_internship(
    vault_id: UUID,
    internship_data: InternshipCreate,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    internship = await create_internship(conn, user_id, vault_id, internship_data)
    
    # Trigger background processing
    background_tasks.add_task(
        process_internship_background,
        user_id,
        internship["id"],
        vault_id
    )
    
    return internship

@internships_router.get(
    "/vaults/{vault_id}/internships",
    response_model=List[InternshipResponse],
    tags=["Internships"]
)
async def get_vault_internships(
    vault_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    return await list_internships(conn, user_id, vault_id)

@internships_router.put(
    "/vaults/{vault_id}/internships/{internship_id}",
    response_model=InternshipResponse,
    tags=["Internships"]
)
async def edit_internship(
    vault_id: UUID,
    internship_id: UUID,
    internship_data: InternshipUpdate,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    internship = await update_internship(conn, user_id, internship_id, internship_data)
    
    # Trigger background processing if role or description changed
    if internship_data.role is not None or internship_data.description_bullets is not None:
        background_tasks.add_task(
            process_internship_background,
            user_id,
            internship["id"],
            vault_id
        )
        
    return internship

@internships_router.delete(
    "/vaults/{vault_id}/internships/{internship_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Internships"]
)
async def remove_internship(
    vault_id: UUID,
    internship_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    await delete_internship(conn, user_id, internship_id)
