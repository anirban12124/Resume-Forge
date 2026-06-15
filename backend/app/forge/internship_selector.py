import json
from typing import List, Dict, Any
from uuid import UUID
import asyncpg
from app.common.exceptions import ValidationError

async def select_relevant_internships(
    conn: asyncpg.Connection,
    vault_id: UUID,
    jd_skills: List[str],
    jd_role_domain: str,
    requested_count: int
) -> List[Dict[str, Any]]:
    """
    Step 3: Queries all internships for the vault, parses JSON fields,
    evaluates overlap of inferred_tech_stack and JD skills, checks role_domain match,
    and sorts them to choose the top requested count.
    """
    if requested_count < 0 or requested_count > 8:
        raise ValidationError("Internship count must be between 0 and 8.")
        
    if requested_count == 0:
        return []

    # 1. Fetch all internships for this vault
    query = """
        SELECT id, vault_id, user_id, role, company_name, start_date, end_date, 
               duration_months, description_bullets, role_domain, inferred_tech_stack, 
               created_at, updated_at
        FROM internships
        WHERE vault_id = $1
    """
    rows = await conn.fetch(query, vault_id)
    
    internships = []
    for row in rows:
        d = dict(row)
        
        # Deserialise description_bullets if saved as text JSON
        bullets = d.get("description_bullets")
        if isinstance(bullets, str):
            d["description_bullets"] = json.loads(bullets)
        elif bullets is None:
            d["description_bullets"] = []
            
        # Deserialise inferred_tech_stack if saved as text JSON
        tech_stack = d.get("inferred_tech_stack")
        if isinstance(tech_stack, str):
            d["inferred_tech_stack"] = json.loads(tech_stack)
        elif tech_stack is None:
            d["inferred_tech_stack"] = []
            
        internships.append(d)

    # 2. Lowercase JD skills for case-insensitive lookup
    jd_skills_lower = {skill.lower() for skill in jd_skills}

    # 3. Calculate sorting/ranking metrics for each internship
    for item in internships:
        # A. Check role_domain match (1 if matches, 0 if not)
        item["domain_match"] = 1 if item.get("role_domain") == jd_role_domain else 0
        
        # B. Count the overlap between internship tech stack and JD hard skills
        tech_list = item.get("inferred_tech_stack") or []
        overlap = sum(1 for tech in tech_list if tech.lower() in jd_skills_lower)
        item["overlap_count"] = overlap
        
        # C. Tiebreaker: Prefer longer internships (duration_months)
        item["duration"] = item.get("duration_months") or 0

    # 4. Sort by priority:
    # 1st key: domain_match (DESC)
    # 2nd key: overlap_count (DESC)
    # 3rd key: duration_months (DESC)
    internships.sort(
        key=lambda x: (x["domain_match"], x["overlap_count"], x["duration"]),
        reverse=True
    )

    # 5. Return top M internships
    return internships[:requested_count]
