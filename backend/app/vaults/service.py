import json
from typing import List, Tuple, Optional, Dict, Any
from uuid import UUID
import asyncpg
from app.common.exceptions import NotFound, ValidationError
from app.vaults.schemas import VaultCreate, VaultUpdate
from app.internships.service import calculate_duration_months

async def list_vaults(conn: asyncpg.Connection, user_id: UUID) -> List[Dict[str, Any]]:
    query = """
        SELECT v.id, v.name, v.created_at, v.updated_at, v.github_sync_status,
               (SELECT COUNT(*) FROM projects WHERE vault_id = v.id) as project_count,
               (SELECT COUNT(*) FROM internships WHERE vault_id = v.id) as internship_count
        FROM vaults v
        WHERE v.user_id = $1
        ORDER BY v.created_at DESC
    """
    rows = await conn.fetch(query, user_id)
    return [dict(row) for row in rows]

async def get_vault(conn: asyncpg.Connection, user_id: UUID, vault_id: UUID) -> Dict[str, Any]:
    # 1. Fetch vault record
    vault_query = """
        SELECT id, user_id, name, base_template_id, source_origin, original_filename,
               parse_confidence_score, github_sync_status, constants_data, skills_data,
               has_summary, created_at, updated_at
        FROM vaults
        WHERE id = $1 AND user_id = $2
    """
    row = await conn.fetchrow(vault_query, vault_id, user_id)
    if not row:
        raise NotFound("Vault not found.")
        
    vault = dict(row)
    vault["constants_data"] = json.loads(vault["constants_data"])
    vault["skills_data"] = json.loads(vault["skills_data"])

    # 2. Fetch projects
    from app.projects.service import list_projects
    vault["projects"] = await list_projects(conn, user_id, vault_id)

    # 3. Fetch internships
    from app.internships.service import list_internships
    vault["internships"] = await list_internships(conn, user_id, vault_id)

    return vault

async def create_vault(
    conn: asyncpg.Connection,
    user_id: UUID,
    data: VaultCreate
) -> Tuple[UUID, List[UUID], List[UUID]]:
    """
    Creates a vault, its projects, and its internships atomically in a transaction.
    Returns (vault_id, project_ids, internship_ids) for post-commit background tasks.
    """
    async with conn.transaction():
        # 1. Insert Vault
        query = """
            INSERT INTO vaults (
                user_id, name, base_template_id, source_origin, original_filename,
                parse_confidence_score, github_sync_status, constants_data,
                skills_data, has_summary, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING id
        """
        try:
            vault_row = await conn.fetchrow(
                query,
                user_id,
                data.name,
                "default",
                data.source_origin,
                data.original_filename,
                data.parse_confidence_score,
                True, # github_sync_status
                json.dumps(data.constants_data),
                json.dumps(data.skills_data),
                data.has_summary
            )
        except asyncpg.exceptions.RaiseException as e:
            if "Maximum limit of 3 vaults" in str(e):
                raise ValidationError("Maximum limit of 3 vaults per user exceeded.")
            raise ValidationError(str(e))

        vault_id = vault_row["id"]

        # 2. Insert Projects
        project_ids = []
        for proj in data.projects:
            initial_structured = {
                "tech_tags": [],
                "architecture_flags": [],
                "github_metadata": {},
                "flattened_summary": f"{proj.name}: {proj.description}"
            }
            pq = """
                INSERT INTO projects (
                    vault_id, user_id, name, description, github_url, live_url, structured_data, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                RETURNING id
            """
            try:
                p_row = await conn.fetchrow(
                    pq,
                    vault_id,
                    user_id,
                    proj.name,
                    proj.description,
                    proj.github_url,
                    proj.live_url,
                    json.dumps(initial_structured)
                )
                project_ids.append(p_row["id"])
            except asyncpg.exceptions.RaiseException as e:
                if "Maximum limit of 8 projects" in str(e):
                    raise ValidationError("Maximum limit of 8 projects per vault exceeded.")
                raise ValidationError(str(e))

        # 3. Insert Internships
        internship_ids = []
        for intern in data.internships:
            duration = calculate_duration_months(intern.start_date, intern.end_date)
            iq = """
                INSERT INTO internships (
                    vault_id, user_id, role, company_name, start_date, end_date,
                    duration_months, description_bullets, role_domain, inferred_tech_stack,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                RETURNING id
            """
            try:
                i_row = await conn.fetchrow(
                    iq,
                    vault_id,
                    user_id,
                    intern.role,
                    intern.company_name,
                    intern.start_date,
                    intern.end_date,
                    duration,
                    json.dumps(intern.description_bullets),
                    "software_engineering",
                    json.dumps([])
                )
                internship_ids.append(i_row["id"])
            except asyncpg.exceptions.RaiseException as e:
                if "Maximum limit of 8 internships" in str(e):
                    raise ValidationError("Maximum limit of 8 internships per vault exceeded.")
                raise ValidationError(str(e))

        return vault_id, project_ids, internship_ids

async def update_vault(
    conn: asyncpg.Connection,
    user_id: UUID,
    vault_id: UUID,
    data: VaultUpdate
) -> Dict[str, Any]:
    # Check exists
    existing = await conn.fetchrow("SELECT id FROM vaults WHERE id = $1 AND user_id = $2", vault_id, user_id)
    if not existing:
        raise NotFound("Vault not found.")

    fields = []
    values = []
    idx = 1

    if data.name is not None:
        fields.append(f"name = ${idx}")
        values.append(data.name)
        idx += 1
    if data.constants_data is not None:
        fields.append(f"constants_data = ${idx}")
        values.append(json.dumps(data.constants_data))
        idx += 1
    if data.skills_data is not None:
        fields.append(f"skills_data = ${idx}")
        values.append(json.dumps(data.skills_data))
        idx += 1
    if data.has_summary is not None:
        fields.append(f"has_summary = ${idx}")
        values.append(data.has_summary)
        idx += 1
    if data.github_sync_status is not None:
        fields.append(f"github_sync_status = ${idx}")
        values.append(data.github_sync_status)
        idx += 1

    if not fields:
        return await get_vault(conn, user_id, vault_id)

    fields.append(f"updated_at = NOW()")
    query = f"""
        UPDATE vaults
        SET {', '.join(fields)}
        WHERE id = ${idx} AND user_id = ${idx + 1}
    """
    values.extend([vault_id, user_id])
    await conn.execute(query, *values)
    return await get_vault(conn, user_id, vault_id)

async def delete_vault(conn: asyncpg.Connection, user_id: UUID, vault_id: UUID) -> None:
    # Cascade delete is handled by database ON DELETE CASCADE constraints
    query = "DELETE FROM vaults WHERE id = $1 AND user_id = $2"
    result = await conn.execute(query, vault_id, user_id)
    if result == "DELETE 0":
        raise NotFound("Vault not found.")
