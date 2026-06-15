import uuid
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import asyncpg

from app.dependencies import get_db, get_current_user
from app.redis import redis_client
from app.forge.schemas import ForgeRunRequest, ForgeStatusResponse, ForgeResultResponse
from app.forge.service import run_forge_pipeline

router = APIRouter()

@router.post("/run", status_code=202)
async def run_forge(
    payload: ForgeRunRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
) -> Dict[str, str]:
    """
    Triggers a resume tailoring pipeline run as a background task.
    Validates requested counts against available projects and internships in the vault.
    """
    vault_id = payload.vault_id
    user_id = uuid.UUID(current_user["id"])

    # 1. Fetch count of projects/internships and verify vault ownership
    query = """
        SELECT 
            (SELECT COUNT(*) FROM projects WHERE vault_id = $1) as project_count,
            (SELECT COUNT(*) FROM internships WHERE vault_id = $1) as internship_count,
            EXISTS(SELECT 1 FROM vaults WHERE id = $1 AND user_id = $2) as vault_exists
    """
    row = await conn.fetchrow(query, vault_id, user_id)
    if not row or not row["vault_exists"]:
        raise HTTPException(status_code=404, detail="Vault not found or access is denied.")

    actual_project_count = row["project_count"]
    actual_internship_count = row["internship_count"]

    # 2. Validate counts against actual database content
    if payload.project_count > actual_project_count:
        raise HTTPException(
            status_code=400,
            detail=f"Requested {payload.project_count} projects, but your vault only contains {actual_project_count}."
        )

    if payload.internship_count > actual_internship_count:
        raise HTTPException(
            status_code=400,
            detail=f"Requested {payload.internship_count} internships, but your vault only contains {actual_internship_count}."
        )

    # 3. Create a unique task ID and initialize status in Redis
    task_id = str(uuid.uuid4())
    
    # user_id is saved inside Redis state to enforce ownership in polling endpoints
    init_state = {
        "task_id": task_id,
        "status": "queued",
        "error_message": None,
        "result": None,
        "user_id": str(user_id)
    }
    await redis_client.set(f"forge_task:{task_id}", json.dumps(init_state), ex=86400)

    # 4. Spawns background worker
    background_tasks.add_task(
        run_forge_pipeline,
        task_id=task_id,
        user_id=user_id,
        vault_id=vault_id,
        project_count=payload.project_count,
        internship_count=payload.internship_count,
        jd_text=payload.jd_text
    )

    return {"task_id": task_id}

@router.get("/status/{task_id}", response_model=ForgeStatusResponse)
async def get_forge_status(
    task_id: str,
    current_user: dict = Depends(get_current_user)
) -> ForgeStatusResponse:
    """
    Polls the status of the resume tailoring task.
    """
    task_raw = await redis_client.get(f"forge_task:{task_id}")
    if not task_raw:
        raise HTTPException(status_code=404, detail="Task not found or expired.")

    task_data = json.loads(task_raw)
    
    # Ownership verification
    user_id = task_data.get("user_id")
    if user_id and user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this task.")

    return ForgeStatusResponse(
        task_id=task_data["task_id"],
        status=task_data["status"],
        error_message=task_data.get("error_message")
    )

@router.get("/result/{task_id}", response_model=ForgeResultResponse)
async def get_forge_result(
    task_id: str,
    current_user: dict = Depends(get_current_user)
) -> ForgeResultResponse:
    """
    Retrieves the completed resume result if the pipeline successfully finished.
    """
    task_raw = await redis_client.get(f"forge_task:{task_id}")
    if not task_raw:
        raise HTTPException(status_code=404, detail="Task not found or expired.")

    task_data = json.loads(task_raw)

    # Ownership verification
    user_id = task_data.get("user_id")
    if user_id and user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this task.")

    status = task_data["status"]
    if status == "failed":
        raise HTTPException(
            status_code=400,
            detail=f"Task execution failed: {task_data.get('error_message')}"
        )
    elif status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Task is still in progress (current stage: {status}). Please poll status until completed."
        )

    result = task_data.get("result")
    if not result:
        raise HTTPException(status_code=500, detail="Completed task lacks result details in cache.")

    return ForgeResultResponse(
        pdf_url=result["pdf_url"],
        tex_content=result["tex_content"],
        archive_id=uuid.UUID(result["archive_id"])
    )
