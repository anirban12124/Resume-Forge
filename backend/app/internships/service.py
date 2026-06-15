import json
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
import asyncpg
from google import genai
from google.genai import types
from app.config import settings
from app.common.exceptions import NotFound, ValidationError
from app.common.token_tracker import log_api_usage
import app.database as database
from app.internships.schemas import InternshipCreate, InternshipUpdate

def calculate_duration_months(start: date, end: Optional[date]) -> int:
    """
    Calculates duration in months between start and end dates.
    If end date is not provided, defaults to today.
    """
    if not start:
        return 0
    end_date = end or date.today()
    diff_years = end_date.year - start.year
    diff_months = end_date.month - start.month
    total = diff_years * 12 + diff_months
    return max(1, total)

async def get_internship(conn: asyncpg.Connection, user_id: UUID, internship_id: UUID) -> Dict[str, Any]:
    query = """
        SELECT id, vault_id, user_id, role, company_name, start_date, end_date, duration_months, description_bullets, role_domain, inferred_tech_stack, created_at, updated_at
        FROM internships
        WHERE id = $1 AND user_id = $2
    """
    row = await conn.fetchrow(query, internship_id, user_id)
    if not row:
        raise NotFound("Internship not found.")
    res = dict(row)
    if res.get("description_bullets"):
        res["description_bullets"] = json.loads(res["description_bullets"])
    if res.get("inferred_tech_stack"):
        res["inferred_tech_stack"] = json.loads(res["inferred_tech_stack"])
    return res

async def list_internships(conn: asyncpg.Connection, user_id: UUID, vault_id: UUID) -> List[Dict[str, Any]]:
    query = """
        SELECT id, vault_id, user_id, role, company_name, start_date, end_date, duration_months, description_bullets, role_domain, inferred_tech_stack, created_at, updated_at
        FROM internships
        WHERE vault_id = $1 AND user_id = $2
        ORDER BY start_date DESC
    """
    rows = await conn.fetch(query, vault_id, user_id)
    results = []
    for row in rows:
        res = dict(row)
        if res.get("description_bullets"):
            res["description_bullets"] = json.loads(res["description_bullets"])
        if res.get("inferred_tech_stack"):
            res["inferred_tech_stack"] = json.loads(res["inferred_tech_stack"])
        results.append(res)
    return results

async def create_internship(
    conn: asyncpg.Connection,
    user_id: UUID,
    vault_id: UUID,
    data: InternshipCreate
) -> Dict[str, Any]:
    # Check if vault exists and belongs to user
    vault_check = await conn.fetchrow("SELECT id FROM vaults WHERE id = $1 AND user_id = $2", vault_id, user_id)
    if not vault_check:
        raise NotFound("Vault not found.")

    duration = calculate_duration_months(data.start_date, data.end_date)
    query = """
        INSERT INTO internships (
            vault_id, user_id, role, company_name, start_date, end_date, duration_months, description_bullets, role_domain, inferred_tech_stack, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id, vault_id, user_id, role, company_name, start_date, end_date, duration_months, description_bullets, role_domain, inferred_tech_stack, created_at, updated_at
    """
    try:
        row = await conn.fetchrow(
            query,
            vault_id,
            user_id,
            data.role,
            data.company_name,
            data.start_date,
            data.end_date,
            duration,
            json.dumps(data.description_bullets),
            "software_engineering",  # Default fallback domain
            json.dumps([])           # Default fallback tech stack
        )
    except asyncpg.exceptions.RaiseException as e:
        # Check if it's the internship limit trigger exception
        if "Maximum limit of 8 internships" in str(e):
            raise ValidationError("Maximum limit of 8 internships per vault exceeded.")
        raise ValidationError(str(e))

    res = dict(row)
    if res.get("description_bullets"):
        res["description_bullets"] = json.loads(res["description_bullets"])
    if res.get("inferred_tech_stack"):
        res["inferred_tech_stack"] = json.loads(res["inferred_tech_stack"])
    return res

async def update_internship(
    conn: asyncpg.Connection,
    user_id: UUID,
    internship_id: UUID,
    data: InternshipUpdate
) -> Dict[str, Any]:
    # Check exists
    existing = await conn.fetchrow("SELECT id, start_date, end_date FROM internships WHERE id = $1 AND user_id = $2", internship_id, user_id)
    if not existing:
        raise NotFound("Internship not found.")

    # Calculate duration if dates changed
    start = data.start_date if data.start_date is not None else existing["start_date"]
    end = data.end_date if data.end_date is not None or data.end_date is None and "end_date" in data.model_fields_set else existing["end_date"]
    
    # Handle end_date set to None/null explicitly
    # model_fields_set contains keys of fields passed in the request payload
    if "end_date" in data.model_fields_set:
        end = data.end_date

    duration = calculate_duration_months(start, end)

    # Build update dynamic query
    fields = []
    values = []
    idx = 1

    if data.role is not None:
        fields.append(f"role = ${idx}")
        values.append(data.role)
        idx += 1
    if data.company_name is not None:
        fields.append(f"company_name = ${idx}")
        values.append(data.company_name)
        idx += 1
    if data.start_date is not None:
        fields.append(f"start_date = ${idx}")
        values.append(data.start_date)
        idx += 1
    
    # If end_date is explicitly set, update it (even if None)
    if "end_date" in data.model_fields_set:
        fields.append(f"end_date = ${idx}")
        values.append(data.end_date)
        idx += 1

    if data.description_bullets is not None:
        fields.append(f"description_bullets = ${idx}")
        values.append(json.dumps(data.description_bullets))
        idx += 1

    # Always update duration_months and updated_at
    fields.append(f"duration_months = ${idx}")
    values.append(duration)
    idx += 1
    
    fields.append(f"updated_at = NOW()")

    query = f"""
        UPDATE internships
        SET {', '.join(fields)}
        WHERE id = ${idx} AND user_id = ${idx + 1}
        RETURNING id, vault_id, user_id, role, company_name, start_date, end_date, duration_months, description_bullets, role_domain, inferred_tech_stack, created_at, updated_at
    """
    values.extend([internship_id, user_id])
    row = await conn.fetchrow(query, *values)
    res = dict(row)
    if res.get("description_bullets"):
        res["description_bullets"] = json.loads(res["description_bullets"])
    if res.get("inferred_tech_stack"):
        res["inferred_tech_stack"] = json.loads(res["inferred_tech_stack"])
    return res

async def delete_internship(conn: asyncpg.Connection, user_id: UUID, internship_id: UUID) -> None:
    query = "DELETE FROM internships WHERE id = $1 AND user_id = $2"
    result = await conn.execute(query, internship_id, user_id)
    if result == "DELETE 0":
        raise NotFound("Internship not found.")

async def process_internship_background(user_id: UUID, internship_id: UUID, vault_id: UUID):
    """
    Background worker that runs Gemini 2.0 Flash to infer role_domain and tech stack.
    """
    if database.pool is None:
        return

    async with database.pool.acquire() as conn:
        try:
            # 1. Fetch internship details
            intern_query = "SELECT role, description_bullets FROM internships WHERE id = $1 AND user_id = $2"
            row = await conn.fetchrow(intern_query, internship_id, user_id)
            if not row:
                return

            role = row["role"]
            bullets = json.loads(row["description_bullets"]) if row["description_bullets"] else []
            bullets_str = "\n".join([f"- {b}" for b in bullets])

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            system_instruction = """
            You are a technical recruiter assistant. Classify the internship role into a standard technical role domain and extract inferred technology keywords.
            
            Return a JSON object with this EXACT structure:
            {
              "role_domain": "Choose ONE from: software_engineering, frontend, backend, data_science, devops, product_management, mobile, qa, full_stack, systems_engineering",
              "inferred_tech_stack": ["list of technologies, frameworks, tools, libraries, or languages mentioned or clearly implied in the bullets"]
            }
            """

            prompt = f"Role Title: {role}\nDescription Bullet Points:\n{bullets_str}"

            response = client.models.generate_content(
                model="gemini-lite-latest",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )

            # Log usage
            usage = response.usage_metadata
            if usage:
                await log_api_usage(
                    conn=conn,
                    user_id=str(user_id),
                    model_name="gemini-lite-latest",
                    prompt_tokens=usage.prompt_token_count,
                    completion_tokens=usage.candidates_token_count,
                    endpoint="infer_internship_metadata"
                )

            try:
                parsed = json.loads(response.text)
                role_domain = parsed.get("role_domain", "software_engineering")
                inferred_tech_stack = parsed.get("inferred_tech_stack", [])
            except Exception:
                role_domain = "software_engineering"
                inferred_tech_stack = []

            # Update DB with inferred metadata
            update_query = """
                UPDATE internships
                SET role_domain = $1,
                    inferred_tech_stack = $2,
                    updated_at = NOW()
                WHERE id = $3 AND user_id = $4
            """
            await conn.execute(update_query, role_domain, json.dumps(inferred_tech_stack), internship_id, user_id)
        except Exception:
            pass
