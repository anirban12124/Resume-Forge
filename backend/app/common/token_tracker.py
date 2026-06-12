from typing import Optional
import asyncpg
from app.config import settings
from app.common.exceptions import BudgetExceeded

async def log_api_usage(
    conn: asyncpg.Connection,
    user_id: Optional[str],
    model_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    endpoint: str
) -> None:
    """
    Logs OpenAI API token usage to the api_usage table.
    """
    total_tokens = prompt_tokens + completion_tokens
    query = """
        INSERT INTO api_usage (
            user_id, model_name, prompt_tokens, completion_tokens, total_tokens, endpoint, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    """
    await conn.execute(
        query,
        user_id,
        model_name,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        endpoint
    )

async def check_token_budget(conn: asyncpg.Connection) -> None:
    """
    Checks the total OpenAI API token usage for the current calendar month.
    Raises BudgetExceeded if usage meets or exceeds the configured limit.
    """
    query = """
        SELECT COALESCE(SUM(total_tokens), 0)
        FROM api_usage
        WHERE created_at >= date_trunc('month', NOW())
    """
    total_used = await conn.fetchval(query)
    
    if total_used >= settings.MONTHLY_TOKEN_BUDGET:
        raise BudgetExceeded(
            f"OpenAI monthly token budget exceeded. Currently used: {total_used}, limit: {settings.MONTHLY_TOKEN_BUDGET}."
        )
