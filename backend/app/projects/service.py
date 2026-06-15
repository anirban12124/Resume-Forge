import json
import re
from typing import List, Optional, Dict, Any
from uuid import UUID
import asyncpg
from app.config import settings
from app.common.exceptions import NotFound, ValidationError
from app.common.encryption import decrypt_token
import app.database as database
from app.ingestion.github_fetcher import fetch_github_repo_data, InvalidGitHubToken
from app.ingestion.data_synthesizer import synthesize_project_data
from app.ingestion.embedder import embed_project_summary
from app.projects.schemas import ProjectCreate, ProjectUpdate

async def get_project(conn: asyncpg.Connection, user_id: UUID, project_id: UUID) -> Dict[str, Any]:
    query = """
        SELECT id, vault_id, user_id, name, description, github_url, live_url, structured_data, last_synced_commit, user_impact_score, created_at, updated_at
        FROM projects
        WHERE id = $1 AND user_id = $2
    """
    row = await conn.fetchrow(query, project_id, user_id)
    if not row:
        raise NotFound("Project not found.")
    res = dict(row)
    if isinstance(res.get("structured_data"), str):
        res["structured_data"] = json.loads(res["structured_data"])
    return res

async def list_projects(conn: asyncpg.Connection, user_id: UUID, vault_id: UUID) -> List[Dict[str, Any]]:
    query = """
        SELECT id, vault_id, user_id, name, description, github_url, live_url, structured_data, last_synced_commit, user_impact_score, created_at, updated_at
        FROM projects
        WHERE vault_id = $1 AND user_id = $2
        ORDER BY created_at ASC
    """
    rows = await conn.fetch(query, vault_id, user_id)
    results = []
    for row in rows:
        res = dict(row)
        if isinstance(res.get("structured_data"), str):
            res["structured_data"] = json.loads(res["structured_data"])
        results.append(res)
    return results

async def create_project(
    conn: asyncpg.Connection,
    user_id: UUID,
    vault_id: UUID,
    data: ProjectCreate
) -> Dict[str, Any]:
    # Check if vault exists and belongs to user
    vault_check = await conn.fetchrow("SELECT id FROM vaults WHERE id = $1 AND user_id = $2", vault_id, user_id)
    if not vault_check:
        raise NotFound("Vault not found.")

    query = """
        INSERT INTO projects (
            vault_id, user_id, name, description, github_url, live_url, structured_data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, vault_id, user_id, name, description, github_url, live_url, structured_data, last_synced_commit, user_impact_score, created_at, updated_at
    """
    initial_structured = {
        "tech_tags": [],
        "architecture_flags": [],
        "github_metadata": {},
        "flattened_summary": f"{data.name}: {data.description}"
    }
    
    try:
        row = await conn.fetchrow(
            query,
            vault_id,
            user_id,
            data.name,
            data.description,
            data.github_url,
            data.live_url,
            json.dumps(initial_structured)
        )
    except asyncpg.exceptions.RaiseException as e:
        # Check if it's the project limit trigger exception
        if "Maximum limit of 8 projects" in str(e):
            raise ValidationError("Maximum limit of 8 projects per vault exceeded.")
        raise ValidationError(str(e))

    res = dict(row)
    if isinstance(res.get("structured_data"), str):
        res["structured_data"] = json.loads(res["structured_data"])
    return res

async def update_project(
    conn: asyncpg.Connection,
    user_id: UUID,
    project_id: UUID,
    data: ProjectUpdate
) -> Dict[str, Any]:
    # Check exists
    existing = await conn.fetchrow("SELECT id, vault_id FROM projects WHERE id = $1 AND user_id = $2", project_id, user_id)
    if not existing:
        raise NotFound("Project not found.")

    # Build update dynamic query
    fields = []
    values = []
    idx = 1
    
    if data.name is not None:
        fields.append(f"name = ${idx}")
        values.append(data.name)
        idx += 1
    if data.description is not None:
        fields.append(f"description = ${idx}")
        values.append(data.description)
        idx += 1
    if data.github_url is not None:
        fields.append(f"github_url = ${idx}")
        values.append(data.github_url)
        idx += 1
    if data.live_url is not None:
        fields.append(f"live_url = ${idx}")
        values.append(data.live_url)
        idx += 1

    if not fields:
        # Return existing project
        return await get_project(conn, user_id, project_id)

    # Add updated_at
    fields.append(f"updated_at = NOW()")
    
    # Add project_id and user_id to query
    query = f"""
        UPDATE projects
        SET {', '.join(fields)}
        WHERE id = ${idx} AND user_id = ${idx + 1}
        RETURNING id, vault_id, user_id, name, description, github_url, live_url, structured_data, last_synced_commit, user_impact_score, created_at, updated_at
    """
    values.extend([project_id, user_id])
    row = await conn.fetchrow(query, *values)
    res = dict(row)
    if isinstance(res.get("structured_data"), str):
        res["structured_data"] = json.loads(res["structured_data"])
    return res

async def delete_project(conn: asyncpg.Connection, user_id: UUID, project_id: UUID) -> None:
    query = "DELETE FROM projects WHERE id = $1 AND user_id = $2"
    result = await conn.execute(query, project_id, user_id)
    if result == "DELETE 0":
        raise NotFound("Project not found.")

async def process_project_background(user_id: UUID, project_id: UUID, vault_id: UUID):
    """
    Performs GitHub fetching, synthesis via Gemini 2.0 Flash, and vector embedding.
    """
    if database.pool is None:
        return

    # Acquire connection from global pool
    async with database.pool.acquire() as conn:
        try:
            # 1. Fetch user's GitHub token
            user_query = "SELECT github_access_token_encrypted, auth_provider FROM users WHERE id = $1"
            user_row = await conn.fetchrow(user_query, user_id)
            if not user_row:
                return
            
            token_enc = user_row["github_access_token_encrypted"]
            auth_provider = user_row["auth_provider"]
            
            decrypted_token = None
            if token_enc and auth_provider == "github":
                try:
                    decrypted_token = decrypt_token(token_enc)
                except Exception:
                    pass
            
            # 2. Fetch project details
            project_query = "SELECT name, description, github_url, live_url FROM projects WHERE id = $1 AND user_id = $2"
            proj = await conn.fetchrow(project_query, project_id, user_id)
            if not proj:
                return

            github_data = None
            if decrypted_token:
                try:
                    github_data = await fetch_github_repo_data(proj["github_url"], decrypted_token)
                except InvalidGitHubToken:
                    # Mark vault sync status as false
                    await conn.execute("UPDATE vaults SET github_sync_status = FALSE, updated_at = NOW() WHERE id = $1 AND user_id = $2", vault_id, user_id)
                except Exception:
                    pass

            # 3. Synthesize via Gemini
            try:
                synthesized = await synthesize_project_data(
                    conn=conn,
                    user_id=str(user_id),
                    name=proj["name"],
                    description=proj["description"],
                    github_url=proj["github_url"],
                    live_url=proj["live_url"],
                    github_data=github_data
                )
            except Exception:
                synthesized = {
                    "tech_tags": [],
                    "architecture_flags": [],
                    "github_metadata": {},
                    "flattened_summary": f"{proj['name']}: {proj['description']}"
                }

            # 4. Re-embed summary
            embedding = None
            try:
                summary = synthesized.get("flattened_summary", "")
                embedding = await embed_project_summary(
                    conn=conn,
                    user_id=str(user_id),
                    summary=summary
                )
            except Exception:
                pass

            # Prepare embedding postgres array format or string format
            embedding_str = None
            if embedding:
                embedding_str = "[" + ",".join(map(str, embedding)) + "]"

            # Retrieve commit SHA/proxy
            last_commit_sha = None
            if github_data:
                manifest = github_data.get("manifest")
                if manifest and manifest.get("sha"):
                    last_commit_sha = manifest["sha"]
                else:
                    readme = github_data.get("readme")
                    if readme and readme.get("sha"):
                        last_commit_sha = readme["sha"]

            user_impact_score = 1.0

            # 5. Update project in database
            update_query = """
                UPDATE projects
                SET structured_data = $1,
                    embedding = $2::vector,
                    last_synced_commit = $3,
                    user_impact_score = $4,
                    updated_at = NOW()
                WHERE id = $5 AND user_id = $6
            """
            await conn.execute(
                update_query,
                json.dumps(synthesized),
                embedding_str,
                last_commit_sha,
                user_impact_score,
                project_id,
                user_id
            )
        except Exception:
            # Prevent background thread crash
            pass
