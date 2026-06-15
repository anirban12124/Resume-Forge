from fastapi import APIRouter, Depends, BackgroundTasks, status
from typing import List, Dict, Any
from uuid import UUID
import asyncpg
from app.dependencies import get_db, get_current_user
from app.projects.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.projects.service import (
    get_project,
    list_projects,
    create_project,
    update_project,
    delete_project,
    process_project_background
)

projects_router = APIRouter()

@projects_router.post(
    "/vaults/{vault_id}/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Projects"]
)
async def add_project(
    vault_id: UUID,
    project_data: ProjectCreate,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    project = await create_project(conn, user_id, vault_id, project_data)
    
    # Trigger background processing
    background_tasks.add_task(
        process_project_background,
        user_id,
        project["id"],
        vault_id
    )
    
    return project

@projects_router.get(
    "/vaults/{vault_id}/projects",
    response_model=List[ProjectResponse],
    tags=["Projects"]
)
async def get_vault_projects(
    vault_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    return await list_projects(conn, user_id, vault_id)

@projects_router.put(
    "/vaults/{vault_id}/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["Projects"]
)
async def edit_project(
    vault_id: UUID,
    project_id: UUID,
    project_data: ProjectUpdate,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    project = await update_project(conn, user_id, project_id, project_data)
    
    # Trigger background processing if description or github_url changed
    if project_data.description is not None or project_data.github_url is not None:
        background_tasks.add_task(
            process_project_background,
            user_id,
            project["id"],
            vault_id
        )
        
    return project

@projects_router.delete(
    "/vaults/{vault_id}/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Projects"]
)
async def remove_project(
    vault_id: UUID,
    project_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    await delete_project(conn, user_id, project_id)
