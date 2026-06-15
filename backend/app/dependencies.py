import jwt
from typing import AsyncGenerator, Dict, Any
from fastapi import Header
import app.database as database
from app.config import settings
from app.common.exceptions import Forbidden

async def get_db() -> AsyncGenerator[Any, None]:
    """
    FastAPI dependency yielding a connection from the asyncpg pool.
    Releases the connection automatically when the request ends.
    """
    if database.pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db() first.")
    
    async with database.pool.acquire() as conn:
        yield conn

async def get_current_user(authorization: str = Header(...)) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts and validates the JWT from the Authorization header.
    Returns a dict containing the user's ID and email.
    """
    authorization_stripped = authorization.strip()
    if authorization_stripped.lower().startswith("bearer "):
        parts = authorization_stripped.split(maxsplit=1)
        if len(parts) != 2:
            raise Forbidden("Invalid authorization header format. Expected 'Bearer <token>'.")
        token = parts[1]
    else:
        token = authorization_stripped
    try:
        # Decode and validate the JWT token
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id:
            raise Forbidden("Invalid token payload: 'sub' (user_id) field is missing.")
        return {"id": user_id, "email": email}
    except jwt.ExpiredSignatureError as e:
        raise Forbidden("Token has expired.") from e
    except jwt.InvalidTokenError as e:
        raise Forbidden("Token signature or claim verification failed.") from e
