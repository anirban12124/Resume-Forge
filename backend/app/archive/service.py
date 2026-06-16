import json
from typing import List, Dict, Any
from uuid import UUID
import asyncpg

from app.common.exceptions import NotFound
from app.s3 import generate_presigned_url, download_file, delete_file

def parse_json_field(val: Any) -> Any:
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return {}
    return val

async def list_archives(conn: asyncpg.Connection, user_id: UUID, page: int = 1) -> List[Dict[str, Any]]:
    """
    Lists paginated archived resumes for the current user, sorted by created_at descending.
    Page size is 20.
    """
    page_size = 20
    offset = (page - 1) * page_size
    
    query = """
        SELECT a.id, a.title, v.name as vault_name, a.created_at, a.forge_config
        FROM resume_archive a
        JOIN vaults v ON a.vault_id = v.id
        WHERE a.user_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3
    """
    rows = await conn.fetch(query, user_id, page_size, offset)
    
    results = []
    for row in rows:
        item = dict(row)
        forge_config = parse_json_field(item["forge_config"]) or {}
        item["summary"] = {
            "project_count": forge_config.get("project_count", 0),
            "internship_count": forge_config.get("internship_count", 0)
        }
        results.append(item)
        
    return results

async def get_archive(conn: asyncpg.Connection, user_id: UUID, archive_id: UUID) -> Dict[str, Any]:
    """
    Retrieves detail for a single archived resume.
    Fetches the fresh presigned S3 URL and the LaTeX content.
    Raises NotFound if the archive does not exist or belongs to another user.
    """
    query = """
        SELECT a.id, a.user_id, a.vault_id, a.title, a.pdf_s3_key, a.tex_s3_key,
               a.jd_text, a.forge_config, a.created_at, v.name as vault_name
        FROM resume_archive a
        JOIN vaults v ON a.vault_id = v.id
        WHERE a.id = $1 AND a.user_id = $2
    """
    row = await conn.fetchrow(query, archive_id, user_id)
    if not row:
        raise NotFound("Archive not found.")
        
    res = dict(row)
    forge_config = parse_json_field(res["forge_config"]) or {}
    res["forge_config"] = forge_config
    
    res["summary"] = {
        "project_count": forge_config.get("project_count", 0),
        "internship_count": forge_config.get("internship_count", 0)
    }
    
    # Generate fresh 15-min presigned URL
    res["pdf_url"] = await generate_presigned_url(res["pdf_s3_key"], expiration=900)
    
    # Fetch LaTeX file content from S3
    try:
        tex_bytes = await download_file(res["tex_s3_key"])
        res["tex_content"] = tex_bytes.decode("utf-8")
    except Exception as e:
        res["tex_content"] = f"% Error loading LaTeX source from S3: {e}"
        
    return res

async def delete_archive(conn: asyncpg.Connection, user_id: UUID, archive_id: UUID) -> None:
    """
    Deletes the archive record from database and removes associated PDF/TEX files from S3.
    """
    query = """
        SELECT pdf_s3_key, tex_s3_key
        FROM resume_archive
        WHERE id = $1 AND user_id = $2
    """
    row = await conn.fetchrow(query, archive_id, user_id)
    if not row:
        raise NotFound("Archive not found.")
        
    pdf_s3_key = row["pdf_s3_key"]
    tex_s3_key = row["tex_s3_key"]
    
    # Delete from S3
    try:
        await delete_file(pdf_s3_key)
    except Exception:
        pass
        
    try:
        await delete_file(tex_s3_key)
    except Exception:
        pass
        
    # Delete from database
    await conn.execute("DELETE FROM resume_archive WHERE id = $1 AND user_id = $2", archive_id, user_id)
