import re
import json
import hashlib
from typing import Dict, Any, List, Tuple, Optional
from google import genai
from google.genai import types
import asyncpg
from app.config import settings
from app.redis import redis_client
from app.common.token_tracker import log_api_usage, check_token_budget
from app.common.exceptions import ValidationError

def clean_jd_text(text: str) -> str:
    """
    Step A: Cleans common noise, boilerplate, EEO text, benefits, and spacing issues
    from the raw Job Description text.
    """
    if not text:
        return ""
        
    # Remove EEO/diversity standard statements
    eeo_patterns = [
        r"(?i)equal opportunity employer.*",
        r"(?i)we are an equal opportunity.*",
        r"(?i)all qualified applicants will receive consideration.*",
        r"(?i)diversity and inclusion.*"
    ]
    cleaned = text
    for pattern in eeo_patterns:
        cleaned = re.sub(pattern, "", cleaned)

    lines = cleaned.split("\n")
    cleaned_lines = []
    
    # Keyword sets for filtering lines containing company boilerplate or perks
    eeo_keywords = {
        "equal opportunity", "qualified applicants", "gender identity", 
        "sexual orientation", "race, color", "religion, sex", 
        "veteran status", "disability status", "national origin"
    }
    perks_keywords = {
        "health insurance", "dental plan", "vision insurance", "401(k)", 
        "401k", "paid time off", "unlimited pto", "competitive salary", 
        "annual bonus", "gym membership", "perks & benefits", "dental, vision",
        "medical, dental", "unlimited vacation"
    }
    
    for line in lines:
        line_lower = line.lower()
        if any(kw in line_lower for kw in eeo_keywords):
            continue
        if any(kw in line_lower for kw in perks_keywords):
            continue
        cleaned_lines.append(line)
        
    cleaned_text = "\n".join(cleaned_lines)
    # Collapse multiple consecutive newlines and extra spaces
    cleaned_text = re.sub(r'\n+', '\n', cleaned_text)
    cleaned_text = re.sub(r'[ \t]+', ' ', cleaned_text)
    return cleaned_text.strip()

async def parse_and_embed_jd(
    conn: asyncpg.Connection,
    user_id: str,
    jd_text: str
) -> Tuple[List[str], str, str, List[float], str, Dict[str, Any]]:
    """
    Coordinates Stage 1:
    - Cleans JD text
    - Checks cache in resume_archive / Redis
    - Extracts skills, semantic paragraph, and role_domain with gemini-lite-latest
    - Embeds semantic paragraph with gemini-embedding-001
    Returns (hard_skills, semantic_paragraph, role_domain, embedding_vector, jd_hash, metadata)
    """
    # 1. Cleansing
    cleansed_text = clean_jd_text(jd_text)
    if not cleansed_text:
        raise ValidationError("Cleansed Job Description is empty.")

    # 2. Hash check
    jd_hash = hashlib.sha256(jd_text.encode("utf-8")).hexdigest()
    
    # Check resume_archive cache
    archive_query = """
        SELECT forge_config 
        FROM resume_archive 
        WHERE jd_hash = $1 
        LIMIT 1
    """
    row = await conn.fetchrow(archive_query, jd_hash)
    
    hard_skills = []
    semantic_paragraph = ""
    role_domain = ""
    embedding_vector = []
    company = None
    role_title = None
    
    if row:
        try:
            forge_config = row["forge_config"]
            if isinstance(forge_config, str):
                forge_config = json.loads(forge_config)
            
            hard_skills = forge_config.get("hard_skills", [])
            semantic_paragraph = forge_config.get("semantic_paragraph", "")
            role_domain = forge_config.get("role_domain", "")
            company = forge_config.get("company")
            role_title = forge_config.get("role_title")
            
            # Check Redis cache for embedding vector
            redis_cache = await redis_client.get(f"jd_embedding:{jd_hash}")
            if redis_cache:
                embedding_vector = json.loads(redis_cache)
        except Exception as e:
            # If cache decoding fails, proceed with LLM parse
            pass

    # 3. If cache missed, run Gemini extraction
    if not hard_skills or not semantic_paragraph or not role_domain:
        await check_token_budget(conn)
        
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = """
        You are an expert technical recruiter. Analyze the job description and extract:
        1. A list of technical "hard_skills" required or preferred (e.g. programming languages, frameworks, developer tools, databases). Normalize where possible (e.g. React.js to React).
        2. A dense "semantic_paragraph" summarizing the core technical duties, architectural challenges, and engineering capabilities expected in this role. Do NOT write soft skills or boilerplate details. Keep it dense and keyword-rich.
        3. A "role_domain" classification for this job description. Choose ONE from: software_engineering, frontend, backend, data_science, devops, product_management, mobile, qa, full_stack, systems_engineering.
        4. "company": Try to extract the company name from the job description. If not found or unclear, use null.
        5. "role_title": Try to extract the job title/role from the job description. If not found or unclear, use null.
        
        Return a JSON object with this EXACT structure:
        {
          "hard_skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"],
          "semantic_paragraph": "A dense technical summary of the role expectations...",
          "role_domain": "backend",
          "company": "Company Name",
          "role_title": "Role Title"
        }
        """
        
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=cleansed_text,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        
        # Log token usage
        usage = response.usage_metadata
        if usage:
            await log_api_usage(
                conn=conn,
                user_id=user_id,
                model_name="gemini-flash-lite-latest",
                prompt_tokens=usage.prompt_token_count,
                completion_tokens=usage.candidates_token_count,
                endpoint="jd_parser:extract_skills"
            )
            
        try:
            parsed = json.loads(response.text)
            hard_skills = parsed.get("hard_skills", [])
            semantic_paragraph = parsed.get("semantic_paragraph", "")
            role_domain = parsed.get("role_domain", "software_engineering")
            company = parsed.get("company")
            role_title = parsed.get("role_title")
        except Exception as e:
            raise ValidationError(f"Gemini output parsing failed during JD analysis: {e}")

    # 4. Generate Embedding of semantic_paragraph if not already cached
    if not embedding_vector:
        await check_token_budget(conn)
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        embed_response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=semantic_paragraph,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        
        if not embed_response.embeddings or len(embed_response.embeddings) == 0:
            raise RuntimeError("No embedding returned from Gemini API during JD embedding.")
            
        embedding_vector = embed_response.embeddings[0].values
        
        # Log embed token usage
        embed_prompt_tokens = 0
        if hasattr(embed_response, "usage_metadata") and embed_response.usage_metadata:
            embed_prompt_tokens = embed_response.usage_metadata.prompt_token_count
            
        await log_api_usage(
            conn=conn,
            user_id=user_id,
            model_name="gemini-embedding-001",
            prompt_tokens=embed_prompt_tokens,
            completion_tokens=0,
            endpoint="jd_parser:embed_paragraph"
        )
        
        # Cache the embedding vector in Redis for 30 days
        try:
            await redis_client.set(
                f"jd_embedding:{jd_hash}", 
                json.dumps(embedding_vector), 
                ex=86400 * 30
            )
        except Exception:
            pass

    metadata = {"company": company, "role_title": role_title}
    return hard_skills, semantic_paragraph, role_domain, embedding_vector, jd_hash, metadata
