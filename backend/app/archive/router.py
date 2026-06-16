from fastapi import APIRouter, Depends, Query, status
from typing import List, Dict, Any
from uuid import UUID
import asyncpg

from app.dependencies import get_db, get_current_user
from app.archive.schemas import ArchiveListResponse, ArchiveDetailResponse
from app.archive.service import list_archives, get_archive, delete_archive

archive_router = APIRouter()

@archive_router.get(
    "",
    response_model=List[ArchiveListResponse],
    tags=["Resume Archive"]
)
async def get_archived_resumes(
    page: int = Query(default=1, ge=1, description="Page number for pagination (20 items per page)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieves a paginated list of all archived resumes for the current authenticated user.
    """
    user_id = UUID(current_user["id"])
    return await list_archives(conn, user_id, page=page)

@archive_router.get(
    "/{archive_id}",
    response_model=ArchiveDetailResponse,
    tags=["Resume Archive"]
)
async def get_archived_resume_detail(
    archive_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieves detailed information of a single archived resume, including the fresh presigned
    download URL for the PDF and the raw LaTeX text source.
    """
    user_id = UUID(current_user["id"])
    return await get_archive(conn, user_id, archive_id)

@archive_router.delete(
    "/{archive_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Resume Archive"]
)
async def delete_archived_resume(
    archive_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Deletes the archived resume database record and removes the corresponding PDF and TEX files from S3.
    """
    user_id = UUID(current_user["id"])
    await delete_archive(conn, user_id, archive_id)
