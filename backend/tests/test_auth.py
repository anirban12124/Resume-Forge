import pytest
import jwt
from app.dependencies import get_current_user
from app.config import settings
from app.common.exceptions import Forbidden

@pytest.mark.asyncio
async def test_get_current_user_with_bearer():
    # Create a valid token
    payload = {"sub": "user_123", "email": "test@example.com"}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")
    
    # Pass token with Bearer prefix
    auth_header = f"Bearer {token}"
    result = await get_current_user(authorization=auth_header)
    assert result == {"id": "user_123", "email": "test@example.com"}

@pytest.mark.asyncio
async def test_get_current_user_without_bearer():
    # Create a valid token
    payload = {"sub": "user_456", "email": "raw@example.com"}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")
    
    # Pass token directly without Bearer prefix
    result = await get_current_user(authorization=token)
    assert result == {"id": "user_456", "email": "raw@example.com"}

@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    with pytest.raises(Forbidden) as exc_info:
        await get_current_user(authorization="invalid_token_here")
    assert "Token signature or claim verification failed." in str(exc_info.value.detail)
