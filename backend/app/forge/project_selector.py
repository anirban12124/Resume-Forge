import json
from typing import List, Dict, Any, Tuple, Optional
from uuid import UUID
import asyncpg
from app.common.exceptions import ValidationError

async def select_relevant_projects(
    conn: asyncpg.Connection,
    vault_id: UUID,
    jd_embedding: List[float],
    requested_count: int
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Step 2: Performs cosine similarity query using pgvector between the JD embedding
    and the project embeddings in the selected vault.
    Returns (selected_projects, warning_message).
    """
    if requested_count < 1 or requested_count > 8:
        raise ValidationError("Project count must be between 1 and 8.")
        
    # Format the embedding vector list as a Postgres vector string (e.g. '[0.1, 0.2, ...]')
    embedding_str = "[" + ",".join(map(str, jd_embedding)) + "]"
    
    # Query pgvector for projects in the vault ordered by similarity
    query = """
        SELECT id, name, description, github_url, live_url, structured_data, 
               1 - (embedding <=> $1::vector) as similarity, last_synced_commit, updated_at
        FROM projects
        WHERE vault_id = $2
        ORDER BY similarity DESC
        LIMIT $3
    """
    
    rows = await conn.fetch(query, embedding_str, vault_id, requested_count)
    
    selected_projects = []
    warning_message = None
    
    # Filter projects by similarity threshold > 0.3
    for row in rows:
        row_dict = dict(row)
        similarity = row_dict.get("similarity", 0.0)
        
        if similarity is not None and similarity > 0.3:
            # Parse structured_data JSON if it is returned as a string
            struct_data = row_dict.get("structured_data")
            if isinstance(struct_data, str):
                row_dict["structured_data"] = json.loads(struct_data)
                
            selected_projects.append(row_dict)
            
    # Check if we retrieved fewer projects than the user requested
    if len(selected_projects) < requested_count:
        warning_message = f"Only {len(selected_projects)} of your requested {requested_count} projects are relevant to this JD (similarity > 0.3)."
        
    return selected_projects, warning_message
