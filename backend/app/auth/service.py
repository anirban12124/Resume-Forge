import bcrypt
import jwt
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import asyncpg
from app.config import settings
from app.common.exceptions import ValidationError, Forbidden
from app.common.encryption import encrypt_token, decrypt_token

def hash_password(password: str) -> str:
    """
    Hashes a password using bcrypt.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a bcrypt hash.
    """
    if not hashed_password:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_tokens(user_id: str, email: str, auth_provider: str) -> Dict[str, Any]:
    """
    Generates a JWT access token (1-hour expiry) and a JWT refresh token (7-day expiry).
    Both tokens contain user ID, email, and auth provider in the payload.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Access Token Payload (1 Hour)
    access_payload = {
        "sub": str(user_id),
        "email": email,
        "auth_provider": auth_provider,
        "type": "access",
        "exp": now + timedelta(hours=1)
    }
    access_token = jwt.encode(access_payload, settings.JWT_SECRET_KEY, algorithm="HS256")
    
    # 2. Refresh Token Payload (7 Days)
    refresh_payload = {
        "sub": str(user_id),
        "email": email,
        "auth_provider": auth_provider,
        "type": "refresh",
        "exp": now + timedelta(days=7)
    }
    refresh_token = jwt.encode(refresh_payload, settings.JWT_SECRET_KEY, algorithm="HS256")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

async def get_user_by_email(conn: asyncpg.Connection, email: str) -> Optional[Dict[str, Any]]:
    """
    Fetches a user record by email.
    """
    row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email.strip().lower())
    return dict(row) if row else None

async def get_user_by_id(conn: asyncpg.Connection, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches a user record by UUID.
    """
    row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    return dict(row) if row else None

async def create_email_user(conn: asyncpg.Connection, email: str, password: str, full_name: str) -> Dict[str, Any]:
    """
    Creates a new user authenticating via email + password.
    Hashes the password with bcrypt and enforces unique email checking.
    """
    email_clean = email.strip().lower()
    existing = await get_user_by_email(conn, email_clean)
    if existing:
        raise ValidationError("Email address is already registered.")
        
    password_hash = hash_password(password)
    
    user_id = await conn.fetchval(
        """
        INSERT INTO users (
            email, password_hash, full_name, auth_provider, github_sync_status, created_at, updated_at
        ) VALUES ($1, $2, $3, 'email', false, NOW(), NOW())
        RETURNING id
        """,
        email_clean,
        password_hash,
        full_name.strip()
    )
    
    user_row = await get_user_by_id(conn, str(user_id))
    if not user_row:
        raise ValidationError("Failed to retrieve user after creation.")
    return user_row

async def create_or_update_oauth_user(
    conn: asyncpg.Connection,
    email: str,
    full_name: str,
    auth_provider: str,
    github_user_id: Optional[str] = None,
    github_token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates a user from an OAuth profile or merges it into an existing user record.
    Encrypts the GitHub token using AES-256-GCM.
    """
    email_clean = email.strip().lower()
    existing = await get_user_by_email(conn, email_clean)
    
    # Encrypt GitHub token if available
    encrypted_token = encrypt_token(github_token) if github_token else None
    
    if existing:
        # User exists: Merge/update OAuth information
        if github_user_id is not None:
            await conn.execute(
                """
                UPDATE users 
                SET github_user_id = $1, 
                    github_access_token_encrypted = $2, 
                    github_sync_status = true,
                    updated_at = NOW()
                WHERE id = $3
                """,
                str(github_user_id),
                encrypted_token,
                existing["id"]
            )
        # Return merged user profile
        merged_row = await get_user_by_id(conn, str(existing["id"]))
        if not merged_row:
            raise ValidationError("Failed to retrieve merged user details.")
        return merged_row
    else:
        # Create new user
        user_id = await conn.fetchval(
            """
            INSERT INTO users (
                email, password_hash, full_name, auth_provider, github_user_id, 
                github_access_token_encrypted, github_sync_status, created_at, updated_at
            ) VALUES ($1, NULL, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id
            """,
            email_clean,
            full_name.strip() if full_name else email_clean.split("@")[0],
            auth_provider,
            str(github_user_id) if github_user_id else None,
            encrypted_token,
            True if github_user_id else False
        )
        new_row = await get_user_by_id(conn, str(user_id))
        if not new_row:
            raise ValidationError("Failed to retrieve created OAuth user details.")
        return new_row

async def validate_github_token(conn: asyncpg.Connection, user_id: str, encrypted_token: bytes) -> bool:
    """
    Validates the stored, encrypted GitHub OAuth token against the GitHub API.
    Updates 'github_sync_status = false' in the database if the token is invalid/revoked.
    """
    if not encrypted_token:
        await conn.execute("UPDATE users SET github_sync_status = false WHERE id = $1", user_id)
        return False

    try:
        token = decrypt_token(encrypted_token)
    except Exception:
        # Token cannot be decrypted; mark invalid
        await conn.execute("UPDATE users SET github_sync_status = false WHERE id = $1", user_id)
        return False
        
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "ResumeForge",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("https://api.github.com/user", headers=headers, timeout=10.0)
            if response.status_code == 200:
                return True
            else:
                # Token rejected by GitHub
                await conn.execute("UPDATE users SET github_sync_status = false WHERE id = $1", user_id)
                return False
        except Exception:
            # Network issue occurred, return False but do not mutate DB since token itself isn't verified invalid
            return False
