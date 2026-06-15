import hashlib
import json
from typing import List, Optional
from google import genai
import asyncpg
from app.config import settings
from app.redis import redis_client
from app.common.token_tracker import log_api_usage

async def embed_project_summary(
    conn: asyncpg.Connection,
    user_id: Optional[str],
    summary: str
) -> List[float]:
    """
    Generates a 768-dimensional vector embedding of a project summary.
    Checks Redis cache first using SHA-256 hash.
    Logs token usage.
    """
    if not summary or not summary.strip():
        # Return empty list or zeros
        return [0.0] * 768

    # 1. Compute SHA-256 hash
    sha256_hash = hashlib.sha256(summary.encode("utf-8")).hexdigest()
    cache_key = f"embedding_cache:{sha256_hash}"

    # 2. Check Redis cache
    try:
        cached_val = await redis_client.get(cache_key)
        if cached_val:
            return json.loads(cached_val)
    except Exception:
        # Proceed to fetch if cache has connectivity issues
        pass

    # 3. Cache miss: Call Gemini API
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=summary
    )

    if not response.embeddings or len(response.embeddings) == 0:
        raise RuntimeError("No embedding returned from Gemini API.")

    embedding_vector = response.embeddings[0].values

    # Log usage
    prompt_tokens = 0
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        prompt_tokens = response.usage_metadata.prompt_token_count
    elif hasattr(response, "usage") and response.usage:
        prompt_tokens = getattr(response.usage, "prompt_token_count", 0)

    # Note: text-embedding models only consume prompt tokens, completion tokens is 0
    await log_api_usage(
        conn=conn,
        user_id=user_id,
        model_name="gemini-embedding-001",
        prompt_tokens=prompt_tokens,
        completion_tokens=0,
        endpoint="embed_project_summary"
    )

    # 4. Save to cache
    try:
        await redis_client.set(cache_key, json.dumps(embedding_vector), ex=86400 * 30) # Cache for 30 days
    except Exception:
        pass

    return embedding_vector
